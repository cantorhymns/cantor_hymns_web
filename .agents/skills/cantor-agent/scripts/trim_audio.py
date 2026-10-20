#!/usr/bin/env python3
"""
CantorAgent - Step 2: Smart Audio Boundary & Preface Trimming
Analyzes the start and end of a hymn recording to detect:
  1. Leading and trailing silence / tape noise
  2. Potential spoken preface/commentary boundaries (short speech bursts followed by a pause before sustained chanting)
  3. Cleanly trims the audio with micro fade-in/fade-out so playback starts and ends smoothly.
"""

import argparse
import json
import math
import os
import struct
import subprocess
import wave
from typing import Dict, Any, List, Optional

os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:{os.environ.get('PATH', '')}"


def get_duration(file_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path,
    ]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return float(p.stdout.strip()) if p.returncode == 0 and p.stdout.strip() else 0.0


def extract_rms_envelope(file_path: str, start_sec: float, duration_sec: float, step_sec: float = 0.1) -> List[Dict[str, float]]:
    """Decodes a slice to 16kHz mono PCM and computes RMS dB and zero-crossing rate per window."""
    cmd = [
        "ffmpeg",
        "-ss", str(max(0.0, start_sec)),
        "-t", str(duration_sec),
        "-i", file_path,
        "-ac", "1",
        "-ar", "16000",
        "-f", "s16le",
        "-",
    ]
    p = subprocess.run(cmd, capture_output=True)
    raw = p.stdout
    sr = 16000
    win_samples = int(sr * step_sec)
    bytes_per_win = win_samples * 2

    envelope = []
    num_wins = len(raw) // bytes_per_win
    for i in range(num_wins):
        chunk = raw[i * bytes_per_win : (i + 1) * bytes_per_win]
        samples = struct.unpack(f"<{win_samples}h", chunk)
        sum_sq = sum(s * s for s in samples)
        rms = math.sqrt(sum_sq / win_samples) if win_samples > 0 else 0.0
        db = 20.0 * math.log10(max(rms, 1.0) / 32768.0)

        # Zero crossing rate (higher in consonant-heavy speech or hiss, smoother in sustained vowel chanting)
        zc = sum(1 for j in range(1, len(samples)) if (samples[j - 1] >= 0) != (samples[j] >= 0))
        zcr = zc / float(win_samples)

        envelope.append({
            "time": round(start_sec + i * step_sec, 2),
            "db": round(db, 1),
            "zcr": round(zcr, 3),
        })
    return envelope


def analyze_boundaries(file_path: str, intro_window: float = 45.0, outro_window: float = 45.0) -> Dict[str, Any]:
    total_dur = get_duration(file_path)
    intro_env = extract_rms_envelope(file_path, 0.0, min(intro_window, total_dur), step_sec=0.1)
    outro_start = max(0.0, total_dur - outro_window)
    outro_env = extract_rms_envelope(file_path, outro_start, total_dur - outro_start, step_sec=0.1)

    # Determine noise threshold dynamically from quietest 10% of windows
    all_dbs = sorted(w["db"] for w in intro_env + outro_env)
    noise_floor_db = all_dbs[max(0, int(len(all_dbs) * 0.1))] if all_dbs else -45.0
    voice_threshold_db = max(noise_floor_db + 8.0, -34.0)

    # 1. Find exact start of vocal onset
    first_voice_sec = 0.0
    for w in intro_env:
        if w["db"] >= voice_threshold_db:
            first_voice_sec = max(0.0, round(w["time"] - 0.15, 2))
            break

    # 2. Check for pauses in the first 45s (which could separate a spoken title/preface from the hymn start)
    intro_pauses = []
    in_pause = False
    p_start = 0.0
    for w in intro_env:
        if w["time"] < first_voice_sec + 0.5:
            continue
        if w["db"] < voice_threshold_db:
            if not in_pause:
                in_pause = True
                p_start = w["time"]
        else:
            if in_pause:
                p_dur = round(w["time"] - p_start, 2)
                if p_dur >= 0.35:
                    intro_pauses.append({
                        "pause_start": p_start,
                        "pause_end": w["time"],
                        "duration": p_dur,
                    })
                in_pause = False

    # 3. Find exact end of vocal activity in outro
    last_voice_sec = total_dur
    for w in reversed(outro_env):
        if w["db"] >= voice_threshold_db:
            last_voice_sec = min(total_dur, round(w["time"] + 0.35, 2))
            break

    # Check if there is a spoken preface candidate (e.g. a short 1-20s speech segment followed by a >=0.5s pause)
    spoken_preface_candidate: Optional[Dict[str, Any]] = None
    for p in intro_pauses:
        if 1.0 <= p["pause_start"] <= 25.0 and p["duration"] >= 0.45:
            spoken_preface_candidate = {
                "preface_ends_at": p["pause_start"],
                "hymn_starts_at": p["pause_end"],
                "pause_duration": p["duration"],
                "note": "Detected pause in opening 25s; verify if preceding segment is a spoken intro or first phrase of hymn.",
            }
            break

    return {
        "file_path": file_path,
        "total_duration_seconds": round(total_dur, 3),
        "noise_floor_db": round(noise_floor_db, 1),
        "voice_threshold_db": round(voice_threshold_db, 1),
        "leading_voice_starts_at": first_voice_sec,
        "trailing_voice_ends_at": last_voice_sec,
        "trailing_silence_seconds": round(total_dur - last_voice_sec, 2),
        "intro_pauses_first_45s": intro_pauses,
        "spoken_preface_candidate": spoken_preface_candidate,
    }


def trim_audio(input_path: str, output_path: str, start_sec: float, end_sec: Optional[float] = None) -> Dict[str, Any]:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    total_dur = get_duration(input_path)
    target_end = end_sec if end_sec is not None else total_dur
    new_dur = max(0.1, target_end - start_sec)

    # Apply subtle 40ms fade-in and 150ms fade-out for click-free boundaries
    fade_out_start = max(0.0, new_dur - 0.15)
    af = f"afade=t=in:st=0:d=0.04,afade=t=out:st={fade_out_start:.3f}:d=0.15"

    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start_sec:.3f}",
        "-to", f"{target_end:.3f}",
        "-i", input_path,
        "-af", af,
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        "-ar", "44100",
        output_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg trim failed:\n{proc.stderr}")

    final_dur = get_duration(output_path)
    return {
        "input_path": input_path,
        "output_path": output_path,
        "trimmed_start_sec": start_sec,
        "trimmed_end_sec": target_end,
        "final_duration_seconds": final_dur,
    }


def main():
    parser = argparse.ArgumentParser(description="CantorAgent Step 2: Smart Audio Boundary & Preface Trimming")
    sub = parser.add_subparsers(dest="action", required=True)

    s_an = sub.add_parser("analyze", help="Analyze start/end boundaries and detect spoken prefaces or silence")
    s_an.add_argument("--input", required=True, help="Path to audio file")

    s_tr = sub.add_parser("trim", help="Trim audio to specified start and end timestamps")
    s_tr.add_argument("--input", required=True, help="Input audio file")
    s_tr.add_argument("--output", required=True, help="Output trimmed audio file")
    s_tr.add_argument("--start", type=float, default=0.0, help="Start time in seconds")
    s_tr.add_argument("--end", type=float, default=None, help="End time in seconds")

    args = parser.parse_args()
    if args.action == "analyze":
        res = analyze_boundaries(args.input)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    elif args.action == "trim":
        res = trim_audio(args.input, args.output, args.start, args.end)
        print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
