#!/usr/bin/env python3
"""
CantorAgent - Step 4 & Step 6: Pedagogical Marker Detection & Lyrics-to-Marker Mapping
Analyzes a solo Coptic hymn recording to place learning markers at natural breath
pauses and musical phrase boundaries using envelope prominence + dynamic programming:
  1. Extracts 25ms RMS energy envelope at 16kHz.
  2. Identifies all breath pauses and local phrase valleys, positioning each candidate
     marker in the quiet pause ~100ms before the next vocal onset so looped sections
     never clip the preceding note or miss the next attack.
  3. Solves for the globally optimal pedagogical marker sequence via Dynamic Programming
     (balancing pause depth/duration with ideal 10-24s learning section lengths).
  4. Supports --anchor-times (e.g., stanza start timestamps) to guarantee exact markers
     at stanza boundaries and auto-generates <cantorId>_<hymnId>_lyrics_markers.txt.
"""

import argparse
import json
import math
import os
import struct
import subprocess
from typing import Any, Dict, List, Optional, Tuple

os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:{os.environ.get('PATH', '')}"


def extract_rms_envelope(
    file_path: str, sample_rate: int = 16000, frame_ms: int = 25
) -> Tuple[List[float], float, float]:
    """Returns (db_envelope, frame_sec, duration_sec)."""
    cmd = [
        "ffmpeg",
        "-i",
        file_path,
        "-ar",
        str(sample_rate),
        "-ac",
        "1",
        "-f",
        "s16le",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, check=True)
    raw = proc.stdout
    total_samples = len(raw) // 2
    frame_samples = int(sample_rate * frame_ms / 1000)
    num_frames = total_samples // frame_samples
    frame_sec = frame_ms / 1000.0
    duration_sec = total_samples / float(sample_rate)

    rms_vals: List[float] = []
    for i in range(num_frames):
        offset = i * frame_samples * 2
        chunk = raw[offset : offset + frame_samples * 2]
        samples = struct.unpack(f"<{frame_samples}h", chunk)
        mean_sq = sum(s * s for s in samples) / float(frame_samples)
        rms = math.sqrt(mean_sq)
        db = 20.0 * math.log10(max(1.0, rms) / 32768.0)
        rms_vals.append(db)

    return rms_vals, frame_sec, duration_sec


def detect_phrase_valleys(
    db_env: List[float],
    frame_sec: float,
    duration_sec: float,
    edge_margin_sec: float = 6.0,
) -> List[Dict[str, Any]]:
    """
    Finds candidate breath pauses and musical phrase boundaries across the recording.
    Each candidate is positioned just before the new vocal phrase onset.
    """
    n = len(db_env)
    if n == 0:
        return []

    sorted_db = sorted(db_env)
    p90_db = sorted_db[int(0.90 * (n - 1))]
    p15_db = sorted_db[int(0.15 * (n - 1))]
    silence_thresh_db = max(p15_db + 4.0, p90_db - 22.0)

    # Smooth envelope over 125ms (5 frames) to avoid micro-jitter
    smooth: List[float] = []
    for i in range(n):
        w0 = max(0, i - 2)
        w1 = min(n, i + 3)
        smooth.append(sum(db_env[w0:w1]) / float(w1 - w0))

    margin_frames = int(edge_margin_sec / frame_sec)
    look_frames = int(2.5 / frame_sec)  # 2.5s context before & after
    min_valley_sep_frames = int(1.2 / frame_sec)

    raw_valleys: List[Dict[str, Any]] = []
    i = margin_frames
    end_limit = n - margin_frames

    while i < end_limit:
        val = smooth[i]
        # Check if local minimum within +/- 0.4s (16 frames)
        w_local = 16
        local_slice = smooth[max(0, i - w_local) : min(n, i + w_local + 1)]
        if val <= min(local_slice) + 0.05:
            pre_slice = smooth[max(0, i - look_frames) : max(1, i - 4)]
            post_slice = smooth[min(n - 1, i + 4) : min(n, i + look_frames)]
            if pre_slice and post_slice:
                pre_p80 = sorted(pre_slice)[int(0.80 * (len(pre_slice) - 1))]
                post_p80 = sorted(post_slice)[int(0.80 * (len(post_slice) - 1))]
                drop_pre = pre_p80 - val
                drop_post = post_p80 - val
                prominence_db = min(drop_pre, drop_post)

                if prominence_db >= 4.5:
                    # Measure how many contiguous frames stay quiet (breath pause duration)
                    local_thresh = min(pre_p80, post_p80) - max(6.0, prominence_db * 0.55)
                    left = i
                    while left > margin_frames and smooth[left] <= local_thresh:
                        left -= 1
                    right = i
                    while right < end_limit and smooth[right] <= local_thresh:
                        right += 1

                    pause_dur_sec = (right - left) * frame_sec
                    # Position marker right before the vocal onset (or at valley center if brief)
                    if pause_dur_sec >= 0.20:
                        marker_frame = max(left, right - 3)  # ~75ms before vocal onset
                    else:
                        marker_frame = i

                    marker_time = round(marker_frame * frame_sec, 6)
                    score = prominence_db + min(18.0, pause_dur_sec * 16.0)
                    if val <= silence_thresh_db:
                        score += 6.0

                    if (
                        raw_valleys
                        and (marker_frame - raw_valleys[-1]["frame"]) < min_valley_sep_frames
                    ):
                        if score > raw_valleys[-1]["score"]:
                            raw_valleys[-1] = {
                                "frame": marker_frame,
                                "time": marker_time,
                                "valley_db": round(val, 2),
                                "prominence_db": round(prominence_db, 2),
                                "pause_duration_sec": round(pause_dur_sec, 3),
                                "score": round(score, 2),
                            }
                    else:
                        raw_valleys.append(
                            {
                                "frame": marker_frame,
                                "time": marker_time,
                                "valley_db": round(val, 2),
                                "prominence_db": round(prominence_db, 2),
                                "pause_duration_sec": round(pause_dur_sec, 3),
                                "score": round(score, 2),
                            }
                        )
                    i = max(i + 1, right)
                    continue
        i += 1

    return raw_valleys


def solve_segment_dp(
    valleys: List[Dict[str, Any]],
    start_time: float,
    end_time: float,
    min_gap: float = 7.5,
    target_gap: float = 14.5,
    max_gap: float = 28.0,
) -> List[Dict[str, Any]]:
    """
    Uses Dynamic Programming to select the optimal sequence of markers between
    start_time and end_time.
    """
    candidates = [
        v for v in valleys if (start_time + min_gap) <= v["time"] <= (end_time - min_gap)
    ]
    if not candidates:
        return []

    # Node 0 is start_time, Nodes 1..M are candidates, Node M+1 is end_time
    nodes: List[Dict[str, Any]] = [{"time": start_time, "score": 0.0}] + candidates + [
        {"time": end_time, "score": 0.0}
    ]
    m = len(nodes)
    neg_inf = -1e12
    dp = [neg_inf] * m
    parent = [-1] * m
    dp[0] = 0.0

    for j in range(1, m):
        tj = nodes[j]["time"]
        node_reward = nodes[j].get("score", 0.0)
        best_val = neg_inf
        best_i = -1

        for i in range(j - 1, -1, -1):
            gap = tj - nodes[i]["time"]
            if gap < min_gap:
                continue
            if gap > max_gap and best_i != -1:
                break

            # Quadratic spacing penalty around target_gap, stronger if > max_gap
            rel_err = (gap - target_gap) / target_gap
            spacing_penalty = 18.0 * (rel_err * rel_err)
            if gap > max_gap:
                spacing_penalty += 60.0 * ((gap - max_gap) / target_gap) ** 2

            val = dp[i] + node_reward - spacing_penalty
            if val > best_val:
                best_val = val
                best_i = i

        dp[j] = best_val
        parent[j] = best_i

    # Reconstruct path
    chosen: List[Dict[str, Any]] = []
    curr = parent[m - 1]
    while curr > 0:
        chosen.append(nodes[curr])
        curr = parent[curr]
    chosen.reverse()
    return chosen


def select_pedagogical_markers(
    valleys: List[Dict[str, Any]],
    duration_sec: float,
    min_gap: float = 7.5,
    target_gap: float = 14.5,
    max_gap: float = 28.0,
    anchor_times: Optional[List[float]] = None,
) -> Tuple[List[Dict[str, Any]], List[int]]:
    """
    Selects markers across [0, duration_sec], snapping any provided anchor_times
    to the nearest natural breath pause (within +/- 1.5s) and solving DP in each
    sub-interval. Returns (selected_markers, anchor_1based_indices).
    """
    anchors: List[Dict[str, Any]] = []
    if anchor_times:
        for at in sorted(anchor_times):
            if at <= 1.0:
                continue
            # Snap anchor to nearest detected breath valley within +/- 1.5s if available
            nearby = [v for v in valleys if abs(v["time"] - at) <= 1.5]
            if nearby:
                best_v = max(nearby, key=lambda v: v["score"] - 3.0 * abs(v["time"] - at))
                anchors.append(best_v)
            else:
                anchors.append(
                    {
                        "time": round(at, 6),
                        "valley_db": 0.0,
                        "prominence_db": 15.0,
                        "pause_duration_sec": 0.25,
                        "score": 25.0,
                        "is_manual_anchor": True,
                    }
                )

    boundaries = [0.0] + [a["time"] for a in anchors] + [duration_sec]
    all_selected: List[Dict[str, Any]] = []
    anchor_indices_1based: List[int] = [0]  # Stanza 1 always starts at 0

    for idx in range(len(boundaries) - 1):
        seg_start = boundaries[idx]
        seg_end = boundaries[idx + 1]
        sub_markers = solve_segment_dp(
            valleys,
            start_time=seg_start,
            end_time=seg_end,
            min_gap=min_gap,
            target_gap=target_gap,
            max_gap=max_gap,
        )
        all_selected.extend(sub_markers)
        if idx < len(anchors):
            all_selected.append(anchors[idx])
            anchor_indices_1based.append(len(all_selected))

    return all_selected, anchor_indices_1based


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect pedagogical learning markers and stanza mappings for a Coptic hymn recording"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_pauses = sub.add_parser(
        "top-pauses", help="List the deepest/longest breath pauses in a time range"
    )
    p_pauses.add_argument("--input", required=True, help="Audio file path")
    p_pauses.add_argument("--start", type=float, default=0.0, help="Start time (s)")
    p_pauses.add_argument("--end", type=float, default=99999.0, help="End time (s)")
    p_pauses.add_argument("--limit", type=int, default=25, help="Max pauses to return")

    p_gen = sub.add_parser("generate", help="Generate markers.txt and lyrics_markers.txt")
    p_gen.add_argument("--input", required=True, help="Input audio file path")
    p_gen.add_argument("--output-markers", required=True, help="Output _markers.txt path")
    p_gen.add_argument(
        "--output-lyrics-markers",
        help="Optional output _lyrics_markers.txt path",
    )
    p_gen.add_argument(
        "--anchor-times",
        help="Comma-separated timestamps (s) for Stanza 2, Stanza 3, ... starts",
    )
    p_gen.add_argument("--min-gap", type=float, default=7.5)
    p_gen.add_argument("--target-gap", type=float, default=14.5)
    p_gen.add_argument("--max-gap", type=float, default=28.0)

    args = parser.parse_args()

    db_env, frame_sec, duration_sec = extract_rms_envelope(args.input)
    valleys = detect_phrase_valleys(db_env, frame_sec, duration_sec)

    if args.command == "top-pauses":
        in_range = [v for v in valleys if args.start <= v["time"] <= args.end]
        in_range.sort(key=lambda v: v["score"], reverse=True)
        print(
            json.dumps(
                {
                    "duration_sec": round(duration_sec, 3),
                    "total_valleys": len(valleys),
                    "top_pauses": in_range[: args.limit],
                },
                indent=2,
            )
        )
        return

    if args.command == "generate":
        anchors: Optional[List[float]] = None
        if args.anchor_times:
            anchors = [
                float(x.strip()) for x in args.anchor_times.split(",") if x.strip()
            ]

        selected, anchor_indices = select_pedagogical_markers(
            valleys,
            duration_sec=duration_sec,
            min_gap=args.min_gap,
            target_gap=args.target_gap,
            max_gap=args.max_gap,
            anchor_times=anchors,
        )

        os.makedirs(os.path.dirname(os.path.abspath(args.output_markers)), exist_ok=True)
        with open(args.output_markers, "w", encoding="utf-8") as f:
            for m in selected:
                f.write(f"{m['time']:.6f}\n")

        if args.output_lyrics_markers:
            os.makedirs(
                os.path.dirname(os.path.abspath(args.output_lyrics_markers)),
                exist_ok=True,
            )
            with open(args.output_lyrics_markers, "w", encoding="utf-8") as f:
                for idx_val in anchor_indices:
                    f.write(f"{idx_val}\n")

        # Compute gap statistics
        times = [0.0] + [m["time"] for m in selected] + [duration_sec]
        gaps = [round(times[i + 1] - times[i], 2) for i in range(len(times) - 1)]

        print(
            json.dumps(
                {
                    "input_audio": args.input,
                    "duration_sec": round(duration_sec, 3),
                    "marker_count": len(selected),
                    "min_section_sec": min(gaps) if gaps else 0.0,
                    "avg_section_sec": round(sum(gaps) / len(gaps), 2) if gaps else 0.0,
                    "max_section_sec": max(gaps) if gaps else 0.0,
                    "output_markers": args.output_markers,
                    "output_lyrics_markers": args.output_lyrics_markers,
                    "stanza_marker_mapping": anchor_indices,
                    "stanza_start_timestamps": [
                        0.0
                    ]
                    + [
                        selected[i - 1]["time"]
                        for i in anchor_indices[1:]
                        if 1 <= i <= len(selected)
                    ],
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
