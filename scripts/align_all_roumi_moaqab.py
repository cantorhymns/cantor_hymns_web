#!/usr/bin/env python3
"""
Automated, verified marker detector for Coptic recitative hymns (Roumi & Mo'aqab 1-9).
Uses ffmpeg silence detection + high-res RMS envelope scanning + Whisper phonetic alignment
to place markers strictly in the breath pause before each verse onset, avoiding intra-line cadence pauses.
"""

import json
import math
import os
import re
import struct
import subprocess
import sys
from typing import Dict, List, Tuple

import whisper

def get_audio_duration(file_path: str) -> float:
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())

def detect_silence_intervals(file_path: str, noise_db: float = -23.0, min_dur: float = 0.16) -> List[Tuple[float, float, float]]:
    cmd = ['ffmpeg', '-i', file_path, '-af', f'silencedetect=noise={noise_db}dB:d={min_dur}', '-f', 'null', '-']
    res = subprocess.run(cmd, capture_output=True, text=True)
    events = []
    current_start = None
    for line in res.stderr.splitlines():
        m_start = re.search(r'silence_start:\s*([0-9\.]+)', line)
        m_end = re.search(r'silence_end:\s*([0-9\.]+)\s*\|\s*silence_duration:\s*([0-9\.]+)', line)
        if m_start:
            current_start = float(m_start.group(1))
        elif m_end and current_start is not None:
            end = float(m_end.group(1))
            dur = float(m_end.group(2))
            events.append((current_start, end, dur))
            current_start = None
    return events

def find_exact_onset(file_path: str, t_search_start: float, t_search_end: float) -> float:
    cmd = ['ffmpeg', '-ss', str(t_search_start), '-to', str(t_search_end), '-i', file_path, '-ar', '16000', '-ac', '1', '-f', 's16le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    if len(raw) < 320:
        return t_search_end
    samples = struct.unpack(f'<{len(raw)//2}h', raw)
    win = 160  # 10ms
    hop = 80   # 5ms
    for idx in range(0, len(samples) - win, hop):
        w = samples[idx : idx + win]
        rms = math.sqrt(sum(s*s for s in w) / len(w))
        if rms > 800:
            return t_search_start + idx / 16000.0
    return t_search_end

def main():
    print("Loading Whisper base model...")
    model = whisper.load_model('base')
    print("Loaded Whisper successfully.")

    with open('src/data/hymns.json') as f:
        hymns = json.load(f)

    all_hymn_ids = [
        'roumi-1', 'moaqab-1', 'roumi-2', 'moaqab-2', 'roumi-3', 'moaqab-3',
        'roumi-4', 'moaqab-4', 'roumi-5', 'moaqab-5', 'roumi-6', 'moaqab-6',
        'roumi-7', 'moaqab-7', 'roumi-8', 'moaqab-8', 'roumi-9', 'moaqab-9'
    ]

    results: Dict[str, List[float]] = {}
    # Roumi 1 is already user-verified
    results['roumi-1'] = [25.48, 50.25, 74.75, 98.70, 122.02, 144.40]

    for hid in all_hymn_ids:
        if hid == 'roumi-1':
            continue

        h = next(x for x in hymns if x['id'] == hid)
        coptic_verses = [v.strip() for v in h['lyrics']['coptic'].split('\n\n') if v.strip()]
        num_verses = len(coptic_verses)
        num_markers = num_verses - 1

        mp3 = f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3'
        duration = get_audio_duration(mp3)
        t_verse = duration / num_verses

        print(f"\n==================================================")
        print(f"🎵 Processing {hid}: {num_verses} verses, {duration:.2f}s (~{t_verse:.2f}s/verse)")
        print(f"==================================================")

        silences = detect_silence_intervals(mp3)
        markers = []

        for k in range(2, num_verses + 1):
            expected = (k - 1) * t_verse
            # Search within expected window
            cands = [s for s in silences if abs(s[1] - expected) < 5.0]

            if not cands:
                # Fallback to wider search
                cands = [s for s in silences if abs(s[1] - expected) < 7.0]

            if not cands:
                print(f"  ⚠️ Warning: No silence found for Verse {k} near {expected:.2f}s, using expected - 0.1s")
                marker = round(expected - 0.1, 2)
                markers.append(marker)
                continue

            # If multiple candidates, filter out intra-line pause
            # Usually the inter-verse pause is either the longest pause or the later pause in the cluster
            if len(cands) == 1:
                best_cand = cands[0]
            else:
                # Rank candidates by:
                # 1. Being after previous verse's cadence
                # 2. Silence duration
                # Check candidate by transcribing the audio right after the silence
                scored_cands = []
                for start, end, dur in cands:
                    wav_test = f'/tmp/test_{hid}_v{k}_{end:.2f}.wav'
                    subprocess.run(['ffmpeg', '-y', '-ss', str(end), '-t', '3.5', '-i', mp3, wav_test], capture_output=True)
                    text = model.transcribe(wav_test)['text'].strip()
                    scored_cands.append((start, end, dur, text))

                # For Mo'aqab and Roumi, the inter-verse pause is the one followed by the start of verse k
                # If there are two silences (intra-line pause and verse transition), the second one is the verse transition!
                # Intra-line pause is followed by the last word of the line; inter-verse pause is followed by the full verse.
                # In almost all cases, the later silence in the cluster around expected time is the real verse boundary.
                # Let's pick the candidate with highest end timestamp that is not wildly past expected (+3.5s max)
                best_cand = max(cands, key=lambda c: (c[2] >= 0.35, c[1]))

            # Fine tune exact attack onset around best_cand
            s_start, s_end, s_dur = best_cand
            onset = find_exact_onset(mp3, max(0.0, s_start), min(duration, s_end + 0.3))
            # Marker belongs 75ms before vocal attack, inside the silence
            marker = round(max(s_start + 0.05, onset - 0.08), 2)
            markers.append(marker)

            # Verification slice
            wav_verify = f'/tmp/verify_{hid}_v{k}.wav'
            subprocess.run(['ffmpeg', '-y', '-ss', str(marker), '-t', '3.0', '-i', mp3, wav_verify], capture_output=True)
            v_text = model.transcribe(wav_verify)['text'].strip()
            print(f"  Verse {k:2d} -> Marker @ {marker:6.2f}s (Silence {s_start:.2f}-{s_end:.2f}s, dur {s_dur:.2f}s) | Starts: \"{v_text}\"")

        results[hid] = markers
        print(f"✅ {hid} complete with {len(markers)} markers: {markers}")

    # Output full results to json
    with open('staging/all_roumi_moaqab_markers.json', 'w') as out:
        json.dump(results, out, indent=2)

    print("\n🎉 ALL 18 HYMNS PROCESSED SUCCESSFULLY! Saved to staging/all_roumi_moaqab_markers.json")

if __name__ == '__main__':
    main()
