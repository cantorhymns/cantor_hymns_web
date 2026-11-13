"""
Variant DTW (different features: log-mel + delta, no DCT, no CMVN-by-dim, narrower band, 40ms hop)
to see where the primary alignment is fragile. Disagreement > 0.6 s => flagged for manual inspection.
"""
import json, sys
import numpy as np
sys.path.insert(0, 'scripts')
import dtw_align_ibrahim as D

recs = json.load(open('src/data/recordings.json'))
s2 = json.load(open('staging/stage2_markers.json'))


def feats_b(x):
    n_fft = 1024; hop = int(D.SR * D.HOP)
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + (len(x) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(n)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * win, axis=1)) ** 2
    mel = np.log(spec @ D.mel_fb(40, n_fft, D.SR, 100, 3500).T + 1e-8)
    mel = mel - mel.mean(1, keepdims=True)           # per-frame loudness/gain removal
    d = np.vstack([np.zeros((1, mel.shape[1])), np.diff(mel, axis=0)])
    f = np.hstack([mel, 2.0 * d])
    return f.astype(np.float32)


for hid in s2:
    t = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')
    xt = D.load(f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3')
    xi = D.load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3')
    ft, fi = feats_b(xt), feats_b(xi)
    # forward and reverse
    tt, ti = D.dtw_map(ft, fi, band_s=18.0)
    fwd = np.interp(t['markers'], tt, ti)
    ii, jj = D.dtw_map(fi, ft, band_s=18.0)      # Ibrahim -> Tharwat
    rev = np.interp(t['markers'], jj, ii)         # (jj monotone in Tharwat time)
    primary = np.array(s2[hid]['markers'])
    d1 = fwd - primary; d2 = rev - primary
    flag = [k + 1 for k in range(len(primary)) if max(abs(d1[k]), abs(d2[k])) > 0.6]
    print(f'{hid:9s} fwd-primary {np.round(d1, 2).tolist()}  rev-primary {np.round(d2, 2).tolist()}  FLAG {flag}')
