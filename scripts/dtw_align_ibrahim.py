"""
Acoustic alignment of Cantor Ibrahim recordings to Cantor Tharwat's (user-corrected) markers.

Method (no ASR - Whisper cannot read Coptic):
  1. log-mel features (CMVN) for both recordings
  2. DTW (Sakoe-Chiba band, numba) maps Tharwat time -> Ibrahim time
  3. Tharwat marker -> mapped Ibrahim time -> snapped to the nearest real vocal onset
     (end of a silence valley) that is consistent with Tharwat's lead-in before its own marker.
Outputs staging/dtw_candidates.json with diagnostics for every marker.
"""
import json, subprocess, sys
import numpy as np
from numba import njit

SR = 16000
HOP = 0.02  # 20 ms


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def mel_fb(n_mels, n_fft, sr, fmin=80, fmax=4000):
    def hz2mel(f): return 2595 * np.log10(1 + f / 700)
    def mel2hz(m): return 700 * (10 ** (m / 2595) - 1)
    mels = np.linspace(hz2mel(fmin), hz2mel(fmax), n_mels + 2)
    hz = mel2hz(mels)
    bins = np.floor((n_fft + 1) * hz / sr).astype(int)
    fb = np.zeros((n_mels, n_fft // 2 + 1), dtype=np.float32)
    for i in range(n_mels):
        l, c, r = bins[i], bins[i + 1], bins[i + 2]
        for k in range(l, c):
            fb[i, k] = (k - l) / max(c - l, 1)
        for k in range(c, r):
            fb[i, k] = (r - k) / max(r - c, 1)
    return fb


def features(x, n_mels=32):
    n_fft = 512
    hop = int(SR * HOP)
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + (len(x) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(n)[:, None]
    frames = x[idx] * win
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    mel = np.log(spec @ mel_fb(n_mels, n_fft, SR).T + 1e-8)
    # per-frame energy (dB) for silence logic
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    # DCT -> MFCC-ish (drop c0) for speaker robustness, then CMVN
    from scipy.fft import dct
    mf = dct(mel, type=2, axis=1, norm='ortho')[:, 1:20]
    mf = (mf - mf.mean(0)) / (mf.std(0) + 1e-6)
    return mf.astype(np.float32), db.astype(np.float32)


@njit(cache=True)
def dtw_band(cost, band):
    N, M = cost.shape
    INF = 1e18
    D = np.full((N, M), INF)
    B = np.zeros((N, M), dtype=np.int8)
    D[0, 0] = cost[0, 0]
    for i in range(N):
        jc = int(i * (M - 1) / (N - 1))
        j0 = max(0, jc - band)
        j1 = min(M, jc + band + 1)
        for j in range(j0, j1):
            if i == 0 and j == 0:
                continue
            best = INF
            arg = 0
            if i > 0 and j > 0 and D[i - 1, j - 1] < best:
                best = D[i - 1, j - 1]; arg = 0
            if i > 0 and D[i - 1, j] + 0.3 < best:
                best = D[i - 1, j] + 0.3; arg = 1
            if j > 0 and D[i, j - 1] + 0.3 < best:
                best = D[i, j - 1] + 0.3; arg = 2
            D[i, j] = best + cost[i, j]
            B[i, j] = arg
    # backtrack
    i, j = N - 1, M - 1
    pi = [i]; pj = [j]
    while i > 0 or j > 0:
        a = B[i, j]
        if a == 0: i -= 1; j -= 1
        elif a == 1: i -= 1
        else: j -= 1
        pi.append(i); pj.append(j)
    return np.array(pi[::-1]), np.array(pj[::-1])


def dtw_map(ft, fi, band_s=25.0):
    # cosine distance
    a = ft / (np.linalg.norm(ft, axis=1, keepdims=True) + 1e-6)
    b = fi / (np.linalg.norm(fi, axis=1, keepdims=True) + 1e-6)
    cost = (1.0 - a @ b.T).astype(np.float64)
    band = int(band_s / HOP)
    pi, pj = dtw_band(cost, band)
    return pi * HOP, pj * HOP


def onsets_after(db, t0, t1, thr=-38.0, min_sil=0.06):
    """Return list of (silence_start, onset_time) pairs: vocal onsets that follow a silence valley."""
    i0, i1 = int(max(t0, 0) / HOP), int(t1 / HOP)
    out = []
    in_sil = False
    s0 = 0
    for k in range(i0, min(i1, len(db))):
        if db[k] < thr:
            if not in_sil:
                in_sil = True; s0 = k
        else:
            if in_sil:
                in_sil = False
                if (k - s0) * HOP >= min_sil:
                    out.append((s0 * HOP, k * HOP))
    return out


if __name__ == '__main__':
    hymns = sys.argv[1:] or ['roumi-%d' % i for i in range(1, 10)] + ['moaqab-%d' % i for i in range(1, 10)]
    recs = json.load(open('src/data/recordings.json'))
    result = {}
    for hid in hymns:
        t_rec = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')
        tm = t_rec['markers']
        xt = load(f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3')
        xi = load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3')
        ft, dbt = features(xt)
        fi, dbi = features(xi)
        tt, ti = dtw_map(ft, fi)
        mapped = np.interp(tm, tt, ti)
        info = []
        for k, (m, mp) in enumerate(zip(tm, mapped)):
            # Tharwat lead-in: silence between its marker and the next vocal onset
            ons_t = onsets_after(dbt, m - 0.3, m + 2.0)
            lead_t = None
            for s0, on in ons_t:
                if on >= m - 0.05:
                    lead_t = on - m; onset_t = on; break
            # Ibrahim candidate onsets around mapped position
            cands = onsets_after(dbi, mp - 3.0, mp + 3.0, min_sil=0.12)
            info.append({'tharwat': m, 'mapped': round(float(mp), 3),
                         'tharwat_onset': None if lead_t is None else round(onset_t, 3),
                         'tharwat_lead': None if lead_t is None else round(lead_t, 3),
                         'cands': [(round(s, 3), round(o, 3)) for s, o in cands]})
        result[hid] = {'markers': info, 'dur_t': len(xt) / SR, 'dur_i': len(xi) / SR}
        print(hid, 'T dur %.1f I dur %.1f' % (len(xt) / SR, len(xi) / SR), 'mapped:', [round(float(x), 2) for x in mapped])
    json.dump(result, open('staging/dtw_candidates.json', 'w'), indent=1)
