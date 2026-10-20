#!/usr/bin/env python3
"""
CantorAgent - Audio Restoration, De-Echo & Enhancement for Coptic Hymn Recordings
Handles two distinct problems in older/poorly-edited Coptic hymn recordings:
  1. Poor Editing / Artificial Echo ('de-echo-remaster'):
     - Automatically detects out-of-phase stereo echo/delay between Left & Right channels
       and computes the exact sub-millisecond sample lag + gain ratio k to mathematically
       cancel the echo via phase cancellation (L[n] + k * R[n + lag]).
     - Applies Spectral Dynamic Range Control (adrc) and fast downward expansion (compand)
       to suppress remaining room/hall reverb tails without clipping hazzat.
  2. Vintage Cassette Muffle & Hiss ('cassette-remaster'):
     - Removes clicks/pops (adeclick), 50/60Hz hum, and upper-band tape hiss.
     - Cuts 340-520Hz cassette boxiness and synthesizes lost upper vocal harmonics (aexciter).
"""

import argparse
import json
import math
import os
import re
import struct
import subprocess
from typing import Dict, Any, Tuple

os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:{os.environ.get('PATH', '')}"


def find_stereo_echo_cancellation_params(file_path: str) -> Dict[str, Any]:
    """
    Analyzes Left and Right channels to detect out-of-phase artificial echo/reverb
    and solves for the optimal sample lag and mixing weight k (L[i] + k * R[i+lag])
    that cancels the stereo echo tail.
    """
    cmd = [
        "ffmpeg", "-ss", "0", "-t", "90", "-i", file_path,
        "-ar", "44100", "-ac", "2", "-f", "s16le", "-",
    ]
    raw = subprocess.run(cmd, capture_output=True).stdout
    if len(raw) < 44100 * 4:
        return {"has_out_of_phase_echo": False, "lag_samples": 0, "weight_r": 1.0, "echo_reduction_db": 0.0}

    samples = struct.unpack(f"<{len(raw)//2}h", raw)
    L = samples[0::2]
    R = samples[1::2]

    # Check overall L/R zero-lag correlation
    step = 8
    norm_L = sum(L[i] * L[i] for i in range(0, len(L), step))
    norm_R = sum(R[i] * R[i] for i in range(0, len(R), step))
    if norm_L == 0 or norm_R == 0:
        return {"has_out_of_phase_echo": False, "lag_samples": 0, "weight_r": 1.0, "echo_reduction_db": 0.0}

    corr0 = sum(L[i] * R[i] for i in range(0, len(L), step)) / math.sqrt(norm_L * norm_R)

    # Identify pure echo-tail windows: the windows with the strongest negative L/R correlation
    win = 2205  # 50ms windows at 44.1kHz
    win_candidates = []
    for w in range(len(L) // win):
        sL = L[w * win : (w + 1) * win]
        sR = R[w * win : (w + 1) * win]
        eL = sum(x * x for x in sL)
        eR = sum(x * x for x in sR)
        rms = math.sqrt(eL / win)
        if 100 < rms < 1500 and eL > 0 and eR > 0:
            corr_w = sum(sL[i] * sR[i] for i in range(0, win, 2)) / math.sqrt(
                sum(sL[i] * sL[i] for i in range(0, win, 2))
                * sum(sR[i] * sR[i] for i in range(0, win, 2))
            )
            win_candidates.append((corr_w, w))

    win_candidates.sort()  # Most negative correlation first (pure out-of-phase echo tails)
    decay_indices = [w for corr_w, w in win_candidates[:12] if corr_w < -0.5]
    if not decay_indices and win_candidates:
        decay_indices = [w for _, w in win_candidates[:10]]

    best_red_db = 0.0
    best_lag = 0
    best_k = 1.0

    for lag in range(-12, 13):
        num = 0.0
        den = 0.0
        orig_e = 0.0
        for w in decay_indices:
            i0 = max(15, w * win)
            i1 = min(len(L) - 15, (w + 1) * win)
            for i in range(i0, i1, 2):
                l_val = L[i]
                r_val = R[i + lag]
                num -= l_val * r_val
                den += r_val * r_val
                orig_e += l_val * l_val
        if den <= 0 or orig_e <= 0:
            continue
        k = max(0.4, min(1.6, num / den))
        res_e = 0.0
        for w in decay_indices:
            i0 = max(15, w * win)
            i1 = min(len(L) - 15, (w + 1) * win)
            for i in range(i0, i1, 2):
                val = L[i] + k * R[i + lag]
                res_e += val * val
        red_db = 10.0 * math.log10(orig_e / max(1.0, res_e))
        if red_db > best_red_db:
            best_red_db = red_db
            best_lag = lag
            best_k = round(k, 3)

    return {
        "lr_zero_lag_correlation": round(corr0, 3),
        "has_out_of_phase_echo": corr0 < 0.2 or best_red_db >= 2.5,
        "lag_samples": best_lag,
        "weight_r": best_k,
        "echo_reduction_db": round(best_red_db, 2),
    }


def build_filter_graph(preset: str, file_path: str) -> Tuple[str, Dict[str, Any]]:
    extra_info: Dict[str, Any] = {}
    if preset == "de-echo-remaster":
        echo_params = find_stereo_echo_cancellation_params(file_path)
        extra_info["stereo_echo_analysis"] = echo_params
        lag = echo_params["lag_samples"]
        k = echo_params["weight_r"]

        if lag >= 0:
            phase_align = (
                f"[0:a]channelsplit=channel_layout=stereo[L][R];"
                f"[L]adelay={lag}S[Ld];"
                f"[Ld][R]amix=inputs=2:weights='1 {k}':normalize=0"
            )
        else:
            phase_align = (
                f"[0:a]channelsplit=channel_layout=stereo[L][R];"
                f"[R]adelay={-lag}S[Rd];"
                f"[L][Rd]amix=inputs=2:weights='1 {k}':normalize=0"
            )

        chain = (
            f"{phase_align},"
            "adeclick,"
            "highpass=f=130:poles=2,"
            "lowpass=f=6000:poles=2,"
            "afftdn=nr=28:nf=-28:tn=1:om=o,"
            "equalizer=f=320:t=q:w=1.0:g=-7.0,"
            "equalizer=f=550:t=q:w=1.0:g=-5.5,"
            "equalizer=f=2400:t=q:w=1.0:g=5.5,"
            "equalizer=f=3800:t=q:w=1.0:g=6.5,"
            "adrc=transfer='if(lt(p,-30),p+(p+30)*1.4,p)':attack=8:release=60,"
            "compand=attacks=0.015:decays=0.12:points=-90/-90|-44/-75|-31/-42|-22/-22|0/0:gain=0,"
            "aexciter=amount=1.6:drive=3.8:blend=1:freq=3200:ceil=10500,"
            "loudnorm=I=-15:TP=-1.2:LRA=8,"
            "aformat=channel_layouts=stereo"
        )
        return chain, extra_info

    elif preset == "cassette-remaster":
        chain = (
            "adeclick,"
            "highpass=f=115:poles=2,"
            "lowpass=f=6200:poles=2,"
            "afftdn=nr=34:nf=-25:tn=1:om=o,"
            "compand=attacks=0.04:decays=0.28:points=-90/-90|-46/-72|-35/-42|-25/-25|0/0:gain=0,"
            "equalizer=f=145:t=q:w=1.2:g=3.5,"
            "equalizer=f=340:t=q:w=0.9:g=-8.5,"
            "equalizer=f=520:t=q:w=1.0:g=-5.5,"
            "equalizer=f=2400:t=q:w=0.9:g=6.5,"
            "equalizer=f=3800:t=q:w=1.0:g=8.0,"
            "aexciter=level_in=1:level_out=1:amount=2.4:drive=4.8:blend=2:freq=3200:ceil=11500,"
            "crystalizer=i=1.5,"
            "loudnorm=I=-14.5:TP=-1.0:LRA=8"
        )
        return chain, extra_info

    else:
        raise ValueError(f"Unknown preset '{preset}'")


def analyze_audio_stats(file_path: str) -> Dict[str, Any]:
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,bit_rate:stream=sample_rate,channels",
        "-of", "json", file_path,
    ]
    probe_proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    meta = json.loads(probe_proc.stdout) if probe_proc.returncode == 0 and probe_proc.stdout.strip() else {}

    vol_cmd = ["ffmpeg", "-i", file_path, "-t", "120", "-af", "volumedetect", "-f", "null", "-"]
    vol_proc = subprocess.run(vol_cmd, capture_output=True, text=True)
    mean_vol = None
    max_vol = None
    for line in vol_proc.stderr.splitlines():
        if "mean_volume:" in line:
            mean_vol = line.split("mean_volume:")[1].strip()
        elif "max_volume:" in line:
            max_vol = line.split("max_volume:")[1].strip()

    fmt = meta.get("format", {})
    streams = meta.get("streams", [{}])
    return {
        "duration_seconds": float(fmt.get("duration", 0.0)),
        "bit_rate": fmt.get("bit_rate"),
        "sample_rate": streams[0].get("sample_rate") if streams else None,
        "channels": streams[0].get("channels") if streams else None,
        "mean_volume_first_2m": mean_vol,
        "max_volume_first_2m": max_vol,
    }


def diagnose_recording_quality(file_path: str) -> Dict[str, Any]:
    def band_rms(freq: int) -> float:
        cmd = [
            "ffmpeg", "-ss", "10", "-t", "30", "-i", file_path,
            "-af", f"bandpass=f={freq}:width_type=q:w=1.5,volumedetect",
            "-f", "null", "-",
        ]
        p = subprocess.run(cmd, capture_output=True, text=True)
        m = re.search(r"mean_volume:\s*([-\d.]+)", p.stderr)
        return float(m.group(1)) if m else -99.0

    rms_500 = band_rms(500)
    rms_3500 = band_rms(3500)
    dropoff_db = rms_500 - rms_3500
    is_archival_cassette = dropoff_db >= 15.0
    echo_info = find_stereo_echo_cancellation_params(file_path)

    if echo_info["has_out_of_phase_echo"]:
        rec_preset = "de-echo-remaster"
    elif is_archival_cassette:
        rec_preset = "cassette-remaster"
    else:
        rec_preset = "none"

    return {
        "file_path": file_path,
        "rms_500hz_db": rms_500,
        "rms_3500hz_db": rms_3500,
        "high_freq_dropoff_db": round(dropoff_db, 1),
        "is_archival_cassette": is_archival_cassette,
        "stereo_echo_analysis": echo_info,
        "recommended_preset": rec_preset,
    }


def enhance_audio(input_path: str, output_path: str, preset: str = "de-echo-remaster") -> Dict[str, Any]:
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    filter_graph, extra_info = build_filter_graph(preset, input_path)
    before_stats = analyze_audio_stats(input_path)

    filter_flag = "-filter_complex" if ";" in filter_graph else "-af"
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        filter_flag, filter_graph,
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        "-ar", "44100",
        output_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg enhancement failed:\n{proc.stderr}")

    after_stats = analyze_audio_stats(output_path)
    return {
        "input_path": input_path,
        "output_path": output_path,
        "preset": preset,
        "extra_info": extra_info,
        "before_stats": before_stats,
        "after_stats": after_stats,
    }


def main():
    parser = argparse.ArgumentParser(description="CantorAgent Audio Restoration, De-Echo & Enhancement")
    parser.add_argument("--input", required=True, help="Path to input MP3")
    parser.add_argument("--output", default=None, help="Path to enhanced output MP3")
    parser.add_argument(
        "--preset",
        default="de-echo-remaster",
        choices=["de-echo-remaster", "cassette-remaster"],
        help="Restoration preset (default: de-echo-remaster)",
    )
    parser.add_argument("--inspect-only", action="store_true", help="Only diagnose audio issues without modifying")
    args = parser.parse_args()

    if args.inspect_only:
        print(json.dumps(diagnose_recording_quality(args.input), ensure_ascii=False, indent=2))
        return

    if not args.output:
        parser.error("--output is required unless --inspect-only is set")

    res = enhance_audio(args.input, args.output, args.preset)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
