#!/usr/bin/env python3
"""
CantorAgent - Step 1: Multi-Source Audio Search, Filtering & Download
Searches YouTube, SoundCloud, and Tasbeha.org in both English and Arabic.
Filters for solo teaching/review tracks (no choir/chorus, no live recordings, no instruments).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from typing import Dict, List, Any, Optional

# Ensure Homebrew binaries (yt-dlp, ffmpeg) are on PATH
os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:{os.environ.get('PATH', '')}"

CANTOR_ALIASES: Dict[str, Dict[str, Any]] = {
    "cantor-bola": {
        "id": "cantor-bola",
        "name": "Cantor Bola (Bola Mounir)",
        "en_queries": ["Bola Mounir", "Cantor Bola", "Paula Mounir", "Pola Mounir"],
        "ar_queries": ["المعلم بولا منير", "بولا منير", "المرتل بولا منير"],
        "must_match_any": ["bola", "paula", "pola", "بولا"],
    },
    "cantor-ibrahim": {
        "id": "cantor-ibrahim",
        "name": "Cantor Ibrahim Ayad",
        "en_queries": ["Ibrahim Ayad", "Cantor Ibrahim"],
        "ar_queries": ["المعلم ابراهيم عياد", "إبراهيم عياد"],
        "must_match_any": ["ibrahim", "ayad", "ابراهيم", "إبراهيم", "عياد"],
    },
    "cantor-gad": {
        "id": "cantor-gad",
        "name": "Cantor Gad Lewis",
        "en_queries": ["Gad Lewis", "Cantor Gad"],
        "ar_queries": ["المعلم جاد لويس", "جاد لويس"],
        "must_match_any": ["gad", "lewis", "جاد", "لويس"],
    },
    "cantor-tharwat": {
        "id": "cantor-tharwat",
        "name": "Cantor Tharwat",
        "en_queries": ["Cantor Tharwat", "Tharwat"],
        "ar_queries": ["المعلم ثروت"],
        "must_match_any": ["tharwat", "ثروت"],
    },
}

HYMN_ARABIC_MAP: Dict[str, List[str]] = {
    "tenen": ["تينين", "لحن تينين", "ⲧⲉⲛⲉⲛ"],
    "tai-shouri": ["طاي شوري", "لحن طاي شوري"],
    "ti-shouri": ["تي شوري", "لحن تي شوري"],
    "entho-te-ti-shouri": ["انثو تي تي شوري", "إنثو تي تي شوري"],
    "omonogenees": ["امونوجينيس", "أومونوجينيس", "يا وحيد الجنس"],
    "kata-ni-khoros": ["كاطا ني خوروس", "كاتا ني خوروس"],
    "meghalo": ["ميغالو", "لحن ميغالو"],
    "epouro": ["ابؤرو", "إبؤرو", "يا ملك السلام"],
}

# Negative keywords indicating classroom lessons, choir/multi-person, live liturgy/concert, or instruments
CLASS_LESSON_KEYWORDS = [
    "حصة", "الحصة", "محاضرة", "درس", "مراجعة", "خطوة بخطوة",
    "lesson", "lecture", "class", "tutorial", "review",
]

CHOIR_KEYWORDS = [
    "خورس", "شمامسة", "فريق", "كورال", "شباب افا", "شباب أفا",
    "الاكليريكية", "الإكليريكية", "ني انجيلوس", "ني أنجيلوس", "معهد الدراسات",
    "choir", "chorus", "deacons", "group", "clerical",
    "ومكاريوس", "وماكاريوس", "وابويا", "وأبويا", "والمعلم",
    "with he ", "with fr", "with cantor", "& cantor", "& mlm",
]

LIVE_KEYWORDS = [
    "حفلة", "مباشر", "سهرة تسبحة", "ليلة راس السنة", "ليلة رأس السنة",
    "ليلة ابوغلمسيس 20", "ليلة أبو غلمسيس 20", "bright saturday 20", "bright saturady",
    "قداس", "من كنيسة", "live", "concert",
]

INSTRUMENT_KEYWORDS = [
    "بالعود", "عود", "ناي", "كمان", "بيانو", "اورج", "أورج", "توزيع موسيقي",
    "موسيقى", "جيتار", "دف", "تريانتو",
    "oud", "violin", "piano", "instrumental", "instruments", "cymbals",
]

SOLO_HYMN_POSITIVE_KEYWORDS = [
    "المعلم", "المرتل", "فردي", "بصوت المعلم",
    "cantor", "moallem", "mlm",
]


def resolve_cantor(cantor_input: str) -> Dict[str, Any]:
    key = cantor_input.strip().lower().replace(" ", "-")
    if not key.startswith("cantor-") and f"cantor-{key}" in CANTOR_ALIASES:
        key = f"cantor-{key}"
    if key in CANTOR_ALIASES:
        return CANTOR_ALIASES[key]
    for cid, info in CANTOR_ALIASES.items():
        if any(q.lower() in cantor_input.lower() for q in info["en_queries"] + info["ar_queries"]):
            return info
    return {
        "id": key,
        "name": cantor_input,
        "en_queries": [cantor_input],
        "ar_queries": [cantor_input],
        "must_match_any": [cantor_input.lower()],
    }


def resolve_hymn_queries(hymn_input: str, ar_override: Optional[str] = None) -> Dict[str, List[str]]:
    slug = re.sub(r"[^a-z0-9]+", "-", hymn_input.strip().lower()).strip("-")
    en_list = [hymn_input.strip()]
    ar_list = []
    if ar_override:
        ar_list.append(ar_override.strip())
    if slug in HYMN_ARABIC_MAP:
        for item in HYMN_ARABIC_MAP[slug]:
            if item not in ar_list:
                ar_list.append(item)
    return {"slug": slug, "en": en_list, "ar": ar_list}


def evaluate_track(title: str, description: str, uploader: str, cantor_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates a candidate track against CantorHymns strict rules:
    1. Chanted by the target Cantor
    2. Pure hymn recording only (NO classroom teaching/lessons/lectures)
    3. Solo / one person only (no choir/deacons/duets)
    4. No live recordings
    5. No instruments
    """
    # Strip Arabic diacritics (tashkeel) for reliable keyword matching
    title_no_tashkeel = re.sub(r"[\u064B-\u065F\u0670]", "", title)
    uploader_no_tashkeel = re.sub(r"[\u064B-\u065F\u0670]", "", uploader)
    combined_title = f"{title_no_tashkeel} {uploader_no_tashkeel}".lower()
    # Strip boilerplate channel promo text before checking description for negative keywords
    clean_desc = re.split(r"هذه القناة تعليمية|يرجي الاشتراك", description or "")[0].lower()
    clean_desc = re.sub(r"[\u064B-\u065F\u0670]", "", clean_desc)
    full_text = f"{combined_title} {clean_desc}"

    reasons_rejected: List[str] = []
    reasons_accepted: List[str] = []
    score = 60

    # Check Cantor match
    if not any(m in full_text for m in cantor_info["must_match_any"]):
        reasons_rejected.append("Does not match target Cantor")
        score -= 100

    # Check if another Cantor is the primary performer in the title
    if "زاهر" in title_no_tashkeel and "بولا" not in title_no_tashkeel:
        reasons_rejected.append("Chanted by a different Cantor in shared channel ('زاهر أندراوس')")
        score -= 80

    # Check Classroom / Lesson recording (reject teaching in a class)
    for kw in CLASS_LESSON_KEYWORDS:
        if kw in combined_title:
            reasons_rejected.append(f"Classroom/lesson recording detected ('{kw}')")
            score -= 70
            break

    # Check Choir / Multi-person
    for kw in CHOIR_KEYWORDS:
        if kw in combined_title or kw in clean_desc:
            reasons_rejected.append(f"Multi-person / Choir detected ('{kw}')")
            score -= 60
            break

    # Check Live recording
    for kw in LIVE_KEYWORDS:
        if kw in combined_title or kw in clean_desc:
            reasons_rejected.append(f"Live recording detected ('{kw}')")
            score -= 60
            break

    # Check Instruments
    for kw in INSTRUMENT_KEYWORDS:
        if kw in combined_title or kw in clean_desc:
            reasons_rejected.append(f"Instruments detected ('{kw}')")
            score -= 80
            break

    # Check Positive solo Cantor indicators
    for kw in SOLO_HYMN_POSITIVE_KEYWORDS:
        if kw in combined_title:
            reasons_accepted.append(f"Solo Cantor indicator ('{kw}')")
            score += 15

    eligible = len(reasons_rejected) == 0 and score >= 50
    return {
        "eligible": eligible,
        "score": score,
        "track_type": "Pure Hymn Recording (Solo)" if eligible else "Rejected Track",
        "reasons_accepted": reasons_accepted,
        "reasons_rejected": reasons_rejected,
    }


def run_ytdlp_search(search_prefix: str, query: str, max_results: int = 8) -> List[Dict[str, Any]]:
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--flat-playlist",
        "--no-warnings",
        f"{search_prefix}{max_results}:{query}",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        results = []
        for line in proc.stdout.strip().splitlines():
            if not line.strip():
                continue
            try:
                results.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        return results
    except Exception as e:
        print(f"Warning: search failed for '{query}': {e}", file=sys.stderr)
        return []


def fetch_video_details(url: str) -> Optional[Dict[str, Any]]:
    cmd = ["yt-dlp", "--dump-json", "--no-playlist", "--no-warnings", url]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout.strip().splitlines()[0])
    except Exception:
        pass
    return None


def search_tasbeha(hymn_en: str, cantor_info: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Searches tasbeha.org Hymn Library for recordings by the Cantor."""
    candidates = []
    # Also include known hymn_library IDs for common hymns
    known_ids = {"tenen": ["154"]}
    slug = re.sub(r"[^a-z0-9]+", "-", hymn_en.strip().lower()).strip("-")
    view_ids = list(known_ids.get(slug, []))

    search_url = f"https://tasbeha.org/hymn_library/search?q={urllib.parse.quote(hymn_en)}"
    try:
        req = urllib.request.Request(search_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        for vid in re.findall(r"/hymn_library/view/(\d+)", html):
            if vid not in view_ids:
                view_ids.append(vid)
    except Exception:
        pass

    for vid in view_ids[:3]:
        try:
            vurl = f"https://tasbeha.org/hymn_library/view/{vid}"
            req2 = urllib.request.Request(vurl, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req2, timeout=15) as resp2:
                vhtml = resp2.read().decode("utf-8", errors="ignore")
            for m in re.finditer(r"<h3>([^<]+)</h3>(.*?)(?=<h3>|Learn to sing|$)", vhtml, re.S):
                cantor_header = m.group(1).strip()
                block = m.group(2)
                if any(alias in cantor_header.lower() for alias in cantor_info["must_match_any"]):
                    mid_m = re.search(r"(/hymn_library/view/\d+\?mid=\d+)", block)
                    dur_m = re.search(r"(\d+):(\d{2})", block)
                    dur_sec = (int(dur_m.group(1)) * 60 + int(dur_m.group(2))) if dur_m else 0
                    rec_url = f"https://tasbeha.org{mid_m.group(1)}" if mid_m else vurl
                    # Check if direct mp3 link is in the mid page
                    mp3_links = re.findall(r'https?://[^"\'\s]+\.mp3', block)
                    if not mp3_links and mid_m:
                        try:
                            req3 = urllib.request.Request(rec_url, headers={"User-Agent": "Mozilla/5.0"})
                            with urllib.request.urlopen(req3, timeout=15) as resp3:
                                mhtml = resp3.read().decode("utf-8", errors="ignore")
                            mp3_links = re.findall(r'https?://[^"\'\s]+\.mp3', mhtml)
                        except Exception:
                            pass
                    candidates.append({
                        "source": "tasbeha.org",
                        "id": mid_m.group(1) if mid_m else vid,
                        "title": f"{hymn_en} - {cantor_header} (Tasbeha.org)",
                        "uploader": cantor_header,
                        "url": mp3_links[0] if mp3_links else rec_url,
                        "page_url": rec_url,
                        "duration": dur_sec,
                        "description": f"Tasbeha.org Hymn Library recording by {cantor_header}",
                    })
        except Exception:
            pass
    return candidates


def search_all_sources(hymn_input: str, cantor_input: str, ar_hymn: Optional[str] = None) -> Dict[str, Any]:
    cantor = resolve_cantor(cantor_input)
    hymn = resolve_hymn_queries(hymn_input, ar_hymn)

    queries = []
    # Arabic queries
    for ar_h in hymn["ar"][:2]:
        for ar_c in cantor["ar_queries"][:2]:
            queries.append(("ytsearch", f"لحن {ar_h} {ar_c}"))
            queries.append(("scsearch", f"لحن {ar_h} {ar_c}"))
    # English queries
    for en_h in hymn["en"]:
        for en_c in cantor["en_queries"][:2]:
            queries.append(("ytsearch", f"{en_h} {en_c}"))
            queries.append(("scsearch", f"{en_h} {en_c}"))

    seen_urls = set()
    raw_items: List[Dict[str, Any]] = []

    for prefix, q in queries:
        items = run_ytdlp_search(prefix, q, max_results=6)
        for item in items:
            url = item.get("url") or item.get("webpage_url")
            if not url:
                vid = item.get("id")
                if prefix == "ytsearch" and vid:
                    url = f"https://www.youtube.com/watch?v={vid}"
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            source = "youtube.com" if "youtube.com" in url or "youtu.be" in url else "soundcloud.com"
            raw_items.append({
                "source": source,
                "id": item.get("id"),
                "title": item.get("title") or "",
                "uploader": item.get("uploader") or item.get("channel") or "",
                "url": url,
                "duration": item.get("duration") or 0,
                "description": item.get("description") or "",
            })

    # Also check Tasbeha.org
    tasbeha_items = search_tasbeha(hymn["en"][0], cantor)
    for t_item in tasbeha_items:
        if t_item["url"] not in seen_urls:
            seen_urls.add(t_item["url"])
            raw_items.append(t_item)

    # Enrich top candidates that match the Cantor or hymn name with full description if missing
    evaluated_candidates = []
    for item in raw_items:
        title_lower = item["title"].lower()
        hymn_terms = [t.lower() for t in hymn["en"] + hymn["ar"] + ["tenin", "تنين"]]
        if not any(ht in title_lower for ht in hymn_terms):
            continue
        if not item.get("description") and item["source"] == "youtube.com":
            details = fetch_video_details(item["url"])
            if details:
                item["description"] = details.get("description") or ""
                item["duration"] = details.get("duration") or item["duration"]
                item["uploader"] = details.get("uploader") or item["uploader"]
        if item["source"] == "soundcloud.com" and item.get("url", "").startswith("https://api.soundcloud.com"):
            details = fetch_video_details(item["url"])
            if details and details.get("webpage_url"):
                item["url"] = details["webpage_url"]

        eval_res = evaluate_track(
            title=item["title"],
            description=item.get("description", ""),
            uploader=item.get("uploader", ""),
            cantor_info=cantor,
        )
        item["cantor_id"] = cantor["id"]
        item["cantor_name"] = cantor["name"]
        item.update(eval_res)
        evaluated_candidates.append(item)

    # Cross-track duration fingerprinting
    rejected_fingerprints = [
        (c["duration"], c["title"], c["reasons_rejected"])
        for c in evaluated_candidates
        if not c["eligible"]
        and c.get("duration", 0) > 0
        and any("Choir" in r or "Live" in r or "Instruments" in r for r in c["reasons_rejected"])
    ]
    for c in evaluated_candidates:
        if c["eligible"] and c.get("duration", 0) > 0:
            for r_dur, r_title, r_reasons in rejected_fingerprints:
                if abs(float(c["duration"]) - float(r_dur)) <= 2.5:
                    c["eligible"] = False
                    c["score"] -= 70
                    c["reasons_rejected"].append(
                        f"Audio duration ({round(c['duration'])}s) matches rejected Choir/Live track: '{r_title}'"
                    )
                    break

    evaluated_candidates.sort(key=lambda x: (x["eligible"], x["score"]), reverse=True)

    return {
        "hymn": hymn,
        "cantor": cantor,
        "candidates": evaluated_candidates,
    }


def download_audio(url: str, output_path: str) -> Dict[str, Any]:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    base_no_ext = re.sub(r"\.mp3$", "", output_path, flags=re.I)
    output_template = f"{base_no_ext}.%(ext)s"
    final_mp3 = f"{base_no_ext}.mp3"

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", output_template,
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"yt-dlp download failed:\n{proc.stderr}")

    duration = 0.0
    probe_cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        final_mp3,
    ]
    probe_proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    if probe_proc.returncode == 0 and probe_proc.stdout.strip():
        duration = float(probe_proc.stdout.strip())

    return {
        "file_path": final_mp3,
        "duration_seconds": duration,
        "source_url": url,
    }


def main():
    parser = argparse.ArgumentParser(description="CantorAgent Audio Search & Downloader")
    sub = parser.add_subparsers(dest="action", required=True)

    s_search = sub.add_parser("search", help="Search YouTube, SoundCloud, and Tasbeha.org for eligible solo hymn tracks")
    s_search.add_argument("--hymn", required=True, help="Hymn name in English (e.g. 'Tenen')")
    s_search.add_argument("--cantor", required=True, help="Cantor name/ID, comma-separated list, or 'all'")
    s_search.add_argument("--ar-hymn", default=None, help="Optional Arabic hymn name override (e.g. 'تينين')")
    s_search.add_argument("--json-out", default=None, help="Optional path to save JSON search results")

    s_dl = sub.add_parser("download", help="Download a specific track URL as high-quality MP3")
    s_dl.add_argument("--url", required=True, help="Track URL (YouTube, SoundCloud, or Tasbeha MP3)")
    s_dl.add_argument("--output", required=True, help="Target MP3 file path")

    args = parser.parse_args()

    if args.action == "search":
        if args.cantor.strip().lower() == "all":
            cantor_list = list(CANTOR_ALIASES.keys())
        else:
            cantor_list = [c.strip() for c in args.cantor.split(",") if c.strip()]

        if len(cantor_list) == 1:
            res = search_all_sources(args.hymn, cantor_list[0], args.ar_hymn)
        else:
            all_cands = []
            for c_name in cantor_list:
                sub_res = search_all_sources(args.hymn, c_name, args.ar_hymn)
                all_cands.extend(sub_res["candidates"])
            all_cands.sort(key=lambda x: (x["eligible"], x["score"]), reverse=True)
            res = {
                "hymn": resolve_hymn_queries(args.hymn, args.ar_hymn),
                "cantors_searched": cantor_list,
                "candidates": all_cands,
            }

        if args.json_out:
            os.makedirs(os.path.dirname(os.path.abspath(args.json_out)), exist_ok=True)
            with open(args.json_out, "w", encoding="utf-8") as f:
                json.dump(res, f, ensure_ascii=False, indent=2)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    elif args.action == "download":
        info = download_audio(args.url, args.output)
        print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
