#!/usr/bin/env python3
"""
CantorAgent - Step 3: Lyrics Fetcher & Formatter from Tasbeha.org
Searches the Tasbeha.org Hymn Library, extracts Coptic (Unicode UTF-8), English,
and Arabic lyrics (plus Coptic phonetic transliteration metadata), and writes
stanza-aligned Markdown files matching CantorHymns' schema:
  - lyrics/english/<hymnId>_english.md
  - lyrics/coptic/<hymnId>_coptic.md
  - lyrics/arabic/<hymnId>_arabic.md
"""

import argparse
import html
import json
import os
import re
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

# Known Tasbeha.org OCR/typing typos in Arabic/English text
KNOWN_TEXT_FIXES = {
    "قدوس اببه": "قدوس الله",
}


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def search_tasbeha_hymn_library(query: str) -> List[Dict[str, Any]]:
    url = f"https://tasbeha.org/hymn_library/search?q={urllib.parse.quote(query)}"
    raw_html = fetch_html(url)
    results: List[Dict[str, Any]] = []

    # Match <section class='lp-group'> blocks and <li class='cp-row'> items
    section_pattern = re.compile(
        r"<section class=['\"]lp-group['\"]>(.*?)</section>", re.DOTALL
    )
    row_pattern = re.compile(r"<li class=['\"]cp-row['\"]>(.*?)</li>", re.DOTALL)

    for sec_match in section_pattern.finditer(raw_html):
        sec_html = sec_match.group(1)
        cat_match = re.search(
            r"<h2 class=['\"]lp-group-h['\"]>(.*?)</h2>", sec_html, re.DOTALL
        )
        category = ""
        if cat_match:
            category = re.sub(r"<[^>]+>", "", cat_match.group(1))
            category = html.unescape(category).strip()

        for row_match in row_pattern.finditer(sec_html):
            row_html = row_match.group(1)
            link_m = re.search(
                r"<a class=['\"]cp-name['\"] href=['\"]/hymn_library/view/(\d+)['\"]>(.*?)</a>",
                row_html,
                re.DOTALL,
            )
            if not link_m:
                continue
            view_id = int(link_m.group(1))
            name_en = html.unescape(re.sub(r"<[^>]+>", "", link_m.group(2))).strip()

            cop_m = re.search(
                r"<span class=['\"]cp-cop[^'\"]*['\"][^>]*>(.*?)</span>",
                row_html,
                re.DOTALL,
            )
            name_cop = (
                html.unescape(re.sub(r"<[^>]+>", "", cop_m.group(1))).strip()
                if cop_m
                else ""
            )

            ar_m = re.search(
                r"<span class=['\"]cp-ar[^'\"]*['\"][^>]*>(.*?)</span>",
                row_html,
                re.DOTALL,
            )
            name_ar = (
                html.unescape(re.sub(r"<[^>]+>", "", ar_m.group(1))).strip()
                if ar_m
                else ""
            )

            results.append(
                {
                    "view_id": view_id,
                    "url": f"https://tasbeha.org/hymn_library/view/{view_id}",
                    "name_english": name_en,
                    "name_coptic": name_cop,
                    "name_arabic": name_ar,
                    "category": category,
                }
            )
    return results


class TasbehaHymnParser(HTMLParser):
    """Parses <div class="sync-para"> stanzas from a Tasbeha Hymn Library view page."""

    def __init__(self) -> None:
        super().__init__()
        self.title_en = ""
        self.title_cop = ""
        self.title_ar = ""
        self.breadcrumbs: List[str] = []

        self.paragraphs: List[Dict[str, Any]] = []
        self._current_para: Optional[Dict[str, Any]] = None
        self._current_line: Optional[Dict[str, Any]] = None

        self._capture_target: Optional[str] = None
        self._buffer: List[str] = []
        self._in_crumbs = False

    def handle_starttag(self, tag: str, attrs: List[tuple]) -> None:
        attr_dict = dict(attrs)
        cls = attr_dict.get("class", "")
        classes = set(cls.split())

        if tag == "ol" and "ts-crumbs" in classes:
            self._in_crumbs = True
        elif self._in_crumbs and tag == "a":
            self._capture_target = "crumb"
            self._buffer = []
        elif tag == "h1" and "hp-en" in classes:
            self._capture_target = "title_en"
            self._buffer = []
        elif tag == "span" and "hp-cop" in classes:
            self._capture_target = "title_cop"
            self._buffer = []
        elif tag == "span" and "hp-ar" in classes:
            self._capture_target = "title_ar"
            self._buffer = []
        elif tag == "div" and "sync-para" in classes:
            self._current_para = {
                "para_index": int(attr_dict.get("data-para", len(self.paragraphs))),
                "lines": [],
            }
            self.paragraphs.append(self._current_para)
        elif tag == "div" and "sync-line" in classes and self._current_para is not None:
            self._current_line = {
                "line_index": int(attr_dict.get("data-idx", len(self._current_para["lines"]))),
                "coptic_words": [],
                "translit_words": [],
                "english": "",
                "arabic": "",
            }
            self._current_para["lines"].append(self._current_line)
        elif self._current_line is not None:
            if tag == "span" and "sync-coptic" in classes:
                self._capture_target = "coptic_word"
                self._buffer = []
            elif tag == "span" and "sync-translit" in classes:
                self._capture_target = "translit_word"
                self._buffer = []
            elif tag == "div" and "sync-english" in classes:
                self._capture_target = "english_line"
                self._buffer = []
            elif tag == "div" and "sync-arabic" in classes:
                self._capture_target = "arabic_line"
                self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._capture_target is not None:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "ol" and self._in_crumbs:
            self._in_crumbs = False

        if self._capture_target is None:
            return

        text = re.sub(r"\s+", " ", "".join(self._buffer)).strip()
        target = self._capture_target

        if target == "crumb" and tag == "a":
            if text:
                self.breadcrumbs.append(text)
            self._capture_target = None
        elif target == "title_en" and tag == "h1":
            self.title_en = text
            self._capture_target = None
        elif target == "title_cop" and tag == "span":
            self.title_cop = text
            self._capture_target = None
        elif target == "title_ar" and tag == "span":
            self.title_ar = text
            self._capture_target = None
        elif self._current_line is not None:
            if target == "coptic_word" and tag == "span":
                if text:
                    self._current_line["coptic_words"].append(text)
                self._capture_target = None
            elif target == "translit_word" and tag == "span":
                if text:
                    self._current_line["translit_words"].append(text)
                self._capture_target = None
            elif target == "english_line" and tag == "div":
                self._current_line["english"] = text
                self._capture_target = None
            elif target == "arabic_line" and tag == "div":
                self._current_line["arabic"] = text
                self._capture_target = None


def clean_joined_text(lines: List[str], is_arabic: bool = False) -> str:
    joined = " ".join(line.strip() for line in lines if line and line.strip())
    joined = re.sub(r"\s+", " ", joined).strip()
    if is_arabic:
        for wrong, right in KNOWN_TEXT_FIXES.items():
            joined = joined.replace(wrong, right)
    return joined


def parse_tasbeha_hymn(raw_html: str, source_url: str = "") -> Dict[str, Any]:
    parser = TasbehaHymnParser()
    parser.feed(raw_html)

    stanzas: List[Dict[str, Any]] = []
    for para in parser.paragraphs:
        coptic_lines = [
            " ".join(line["coptic_words"])
            for line in para["lines"]
            if line["coptic_words"]
        ]
        translit_lines = [
            " ".join(line["translit_words"])
            for line in para["lines"]
            if line["translit_words"]
        ]
        english_lines = [line["english"] for line in para["lines"] if line["english"]]
        arabic_lines = [line["arabic"] for line in para["lines"] if line["arabic"]]

        coptic_stanza = clean_joined_text(coptic_lines)
        translit_stanza = clean_joined_text(translit_lines)
        english_stanza = clean_joined_text(english_lines)
        arabic_stanza = clean_joined_text(arabic_lines, is_arabic=True)

        if coptic_stanza or english_stanza or arabic_stanza:
            stanzas.append(
                {
                    "stanza_index": len(stanzas),
                    "coptic": coptic_stanza,
                    "translit": translit_stanza,
                    "english": english_stanza,
                    "arabic": arabic_stanza,
                    "lines": para["lines"],
                }
            )

    return {
        "source_url": source_url,
        "title_english": parser.title_en,
        "title_coptic": parser.title_cop,
        "title_arabic": parser.title_ar,
        "breadcrumbs": parser.breadcrumbs,
        "stanza_count": len(stanzas),
        "stanzas": stanzas,
    }


def write_lyrics_files(parsed: Dict[str, Any], hymn_id: str, out_dir: str) -> Dict[str, str]:
    coptic_dir = os.path.join(out_dir, "coptic")
    english_dir = os.path.join(out_dir, "english")
    arabic_dir = os.path.join(out_dir, "arabic")
    os.makedirs(coptic_dir, exist_ok=True)
    os.makedirs(english_dir, exist_ok=True)
    os.makedirs(arabic_dir, exist_ok=True)

    coptic_path = os.path.join(coptic_dir, f"{hymn_id}_coptic.md")
    english_path = os.path.join(english_dir, f"{hymn_id}_english.md")
    arabic_path = os.path.join(arabic_dir, f"{hymn_id}_arabic.md")
    meta_path = os.path.join(out_dir, f"{hymn_id}_lyrics_metadata.json")

    coptic_content = "\n\n".join(s["coptic"] for s in parsed["stanzas"]) + "\n"
    english_content = "\n\n".join(s["english"] for s in parsed["stanzas"]) + "\n"
    arabic_content = "\n\n".join(s["arabic"] for s in parsed["stanzas"]) + "\n"

    with open(coptic_path, "w", encoding="utf-8") as f:
        f.write(coptic_content)
    with open(english_path, "w", encoding="utf-8") as f:
        f.write(english_content)
    with open(arabic_path, "w", encoding="utf-8") as f:
        f.write(arabic_content)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    return {
        "coptic_path": coptic_path,
        "english_path": english_path,
        "arabic_path": arabic_path,
        "metadata_path": meta_path,
        "storage_paths": {
            "lyricsCoptic": f"lyrics/coptic/{hymn_id}_coptic.md",
            "lyricsEnglish": f"lyrics/english/{hymn_id}_english.md",
            "lyricsArabic": f"lyrics/arabic/{hymn_id}_arabic.md",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Search and fetch Coptic/English/Arabic hymn lyrics from Tasbeha.org"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    search_p = sub.add_parser("search", help="Search Tasbeha.org Hymn Library")
    search_p.add_argument("--query", required=True, help="Hymn name to search")

    fetch_p = sub.add_parser("fetch", help="Fetch and format lyrics for a hymn")
    fetch_p.add_argument("--hymn-id", required=True, help="Hymn ID slug (e.g., tenen)")
    fetch_p.add_argument("--view-id", type=int, help="Tasbeha Hymn Library view ID (e.g., 154)")
    fetch_p.add_argument("--query", help="Search query if --view-id is not provided")
    fetch_p.add_argument("--html-file", help="Optional pre-downloaded HTML file path")
    fetch_p.add_argument(
        "--max-stanzas",
        type=int,
        help="Optional limit on number of stanzas to include (e.g., when a recording only chants the Greek stanzas)",
    )
    fetch_p.add_argument(
        "--strip-parens",
        action="store_true",
        help="Strip enclosing parentheses around refrain stanzas that are chanted in the recording",
    )
    fetch_p.add_argument(
        "--out-dir",
        default="staging/lyrics",
        help="Output base directory for lyrics/{coptic,english,arabic}",
    )

    args = parser.parse_args()

    if args.command == "search":
        results = search_tasbeha_hymn_library(args.query)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    if args.command == "fetch":
        source_url = ""
        if args.html_file:
            with open(args.html_file, "r", encoding="utf-8") as f:
                raw_html = f.read()
            source_url = f"https://tasbeha.org/hymn_library/view/{args.view_id or ''}"
        else:
            view_id = args.view_id
            if not view_id:
                if not args.query:
                    raise SystemExit("Either --view-id, --query, or --html-file must be provided.")
                results = search_tasbeha_hymn_library(args.query)
                if not results:
                    raise SystemExit(f"No hymn found on Tasbeha.org for query: {args.query}")
                view_id = results[0]["view_id"]
            source_url = f"https://tasbeha.org/hymn_library/view/{view_id}"
            raw_html = fetch_html(source_url)

        parsed = parse_tasbeha_hymn(raw_html, source_url=source_url)
        if args.max_stanzas is not None:
            parsed["stanzas"] = parsed["stanzas"][: args.max_stanzas]
            parsed["stanza_count"] = len(parsed["stanzas"])
        if args.strip_parens:
            for s in parsed["stanzas"]:
                for k in ("coptic", "translit", "english", "arabic"):
                    val = s.get(k, "")
                    if val.startswith("(") and val.endswith(")"):
                        s[k] = val[1:-1].strip()

        paths = write_lyrics_files(parsed, args.hymn_id, args.out_dir)
        output = {
            "hymn_id": args.hymn_id,
            "source_url": source_url,
            "title_english": parsed["title_english"],
            "title_coptic": parsed["title_coptic"],
            "title_arabic": parsed["title_arabic"],
            "breadcrumbs": parsed["breadcrumbs"],
            "stanza_count": parsed["stanza_count"],
            **paths,
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
