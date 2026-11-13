"""
Stage 2: anchor refinement + independent consistency check using pause structure.

For each hymn:
  - DTW maps Tharwat time -> Ibrahim time (coarse)
  - every Tharwat pause (line break) is matched to an Ibrahim pause with a monotonic DP
  - the pause match rate is the *independent* sanity check of the DTW (pauses were not used by DTW)
  - each marker is placed at: matched Ibrahim onset - min(Tharwat lead-in, 60% of the Ibrahim pause)
    (mirrors the way the user-corrected Tharwat markers sit relative to the vocal onset)
"""
import json, sys
import numpy as np
sys.path.insert(0, 'scripts')
from dtw_align_ibrahim import load, features, dtw_map, HOP, SR


def pauses(db, min_dur=0.15):
    thr = np.percentile(db, 85) - 12.0   # relative to speech level (Ibrahim cassette noise floor ~ -38 dB)
    out = []
    in_s = False
    s0 = 0
    for k, v in enumerate(db):
        if v < thr:
            if not in_s: in_s = True; s0 = k
        else:
            if in_s:
                in_s = False
                d = (k - s0) * HOP
                if d >= min_dur:
                    out.append((s0 * HOP, k * HOP, d))
    return out, thr


def match(tp, ip, tmap, max_diff=2.0):
    n, m = len(tp), len(ip)
    INF = 1e9
    D = np.full((n + 1, m + 1), INF)
    D[0, :] = np.arange(m + 1) * 0.25   # skipping Ibrahim pauses is cheap (extra breaths)
    D[:, 0] = np.arange(n + 1) * 1.0
    P = {}
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            best = D[i - 1, j] + 1.0; arg = 'T'
            if D[i, j - 1] + 0.25 < best: best = D[i, j - 1] + 0.25; arg = 'I'
            diff = abs(ip[j - 1][1] - tmap[i - 1])
            if diff <= max_diff:
                dr = abs(np.log((ip[j - 1][2] + 0.05) / (tp[i - 1][2] + 0.05)))
                c = D[i - 1, j - 1] + diff / 1.0 + 0.3 * dr - 0.5
                if c < best: best = c; arg = 'M'
            D[i, j] = best; P[(i, j)] = arg
    i, j = n, m
    pairs = {}
    while i > 0 and j > 0:
        a = P[(i, j)]
        if a == 'M': pairs[i - 1] = j - 1; i -= 1; j -= 1
        elif a == 'T': i -= 1
        else: j -= 1
    return pairs


def run(hid, recs):
    t_rec = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')
    tm = t_rec['markers']
    xt = load(f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3')
    xi = load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3')
    ft, dbt = features(xt); fi, dbi = features(xi)
    tt, ti = dtw_map(ft, fi)
    tp, thr_t = pauses(dbt); ip, thr_i = pauses(dbi)
    tmap = np.interp([p[1] for p in tp], tt, ti)
    pairs = match(tp, ip, tmap)
    # per-verse match rate (independent check)
    bounds = [0.0] + list(tm) + [len(xt) / SR]
    rates = []
    for v in range(len(bounds) - 1):
        idx = [k for k, p in enumerate(tp) if bounds[v] <= p[1] < bounds[v + 1]]
        rates.append((len([k for k in idx if k in pairs]), len(idx)))
    markers = []
    notes = []
    for mk in tm:
        # the Tharwat pause that ends right after the marker
        cand = [k for k, p in enumerate(tp) if p[0] - 0.4 <= mk <= p[1] + 0.05]
        k = cand[0] if cand else None
        mapped = float(np.interp(mk, tt, ti))
        if k is not None and k in pairs:
            s, e, d = ip[pairs[k]]
            lead = max(0.0, tp[k][1] - mk)
            val = e - min(lead, 0.6 * d)
            markers.append(round(float(val), 2)); notes.append(('pause', round(mapped, 2), round(e, 2)))
        else:
            markers.append(round(mapped, 2)); notes.append(('DTW-only', round(mapped, 2), None))
    return markers, notes, rates, (len(xt) / SR, len(xi) / SR)


if __name__ == '__main__':
    hymns = sys.argv[1:] or ['roumi-%d' % i for i in range(1, 10)] + ['moaqab-%d' % i for i in range(1, 10)]
    recs = json.load(open('src/data/recordings.json'))
    prev = json.load(open('staging/all_ibrahim_markers_final.json'))
    out = {}
    for hid in hymns:
        mk, notes, rates, durs = run(hid, recs)
        out[hid] = {'markers': mk, 'notes': notes, 'rates': rates}
        tot = sum(a for a, b in rates); allp = sum(b for a, b in rates)
        print(f'\n== {hid}  pause match {tot}/{allp}')
        print('  per-verse matches:', rates)
        print('  new :', mk)
        print('  prev:', prev[hid])
        print('  Δ   :', [round(a - b, 2) for a, b in zip(mk, prev[hid])])
        print('  src :', [n[0] for n in notes])
    json.dump(out, open('staging/stage2_markers.json', 'w'), indent=1)
