"""
Independent checks that do NOT depend on the Tharwat DTW:

 A) Refrain template check: the refrain ("Tenti-oo ne ...") is sung to the same tune in every hymn of a family.
    A 5 s query cut at each hymn's current refrain marker is subsequence-DTW'd into the tail of the other 8 hymns of the
    same family; the median of the 8 estimates is compared with the hymn's own refrain marker.
 B) Mo'aqab repetition check: the last line of verse k is repeated as line 1 of verse k+1. For each marker the phrase
    just before it must acoustically match the phrase right after it. Candidate pause onsets within +-5 s are scored and
    the position of our marker in that ranking is reported.
"""
import json, sys
import numpy as np
from numba import njit
sys.path.insert(0, 'scripts')
from dtw_align_ibrahim import load, features, HOP
from anchor_refine_ibrahim import pauses


@njit(cache=True)
def subseq_dtw(cost):
    Q, T = cost.shape
    INF = 1e18
    D = np.full((Q, T), INF)
    S = np.zeros((Q, T), dtype=np.int64)
    for j in range(T):
        D[0, j] = cost[0, j]; S[0, j] = j
    for i in range(1, Q):
        for j in range(T):
            best = D[i - 1, j] + 0.2; st = S[i - 1, j]
            if j > 0:
                if D[i - 1, j - 1] < best: best = D[i - 1, j - 1]; st = S[i - 1, j - 1]
                if D[i, j - 1] + 0.2 < best: best = D[i, j - 1] + 0.2; st = S[i, j - 1]
            D[i, j] = best + cost[i, j]; S[i, j] = st
    jb = 0; bv = INF
    for j in range(T):
        if D[Q - 1, j] < bv: bv = D[Q - 1, j]; jb = j
    return S[Q - 1, jb], bv / Q


def cosd(a, b):
    a = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-6)
    b = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-6)
    return (1.0 - a @ b.T).astype(np.float64)


def refrain_check(family, markers, feats, durs, qlen=5.0, tail=50.0):
    ids = [h for h in markers if h.startswith(family)]
    res = {}
    for h in ids:
        last = markers[h][-1]
        ests = []
        for o in ids:
            if o == h: continue
            qo = markers[o][-1]
            q = feats[o][int((qo - 0.2) / HOP): int((qo + qlen) / HOP)]
            t0 = max(0.0, durs[h] - tail)
            tg = feats[h][int(t0 / HOP):]
            st, c = subseq_dtw(cosd(q, tg))
            ests.append((t0 + st * HOP + 0.2, c))
        vals = np.array([e[0] for e in ests])
        res[h] = (last, float(np.median(vals)), float(np.percentile(vals, 25)), float(np.percentile(vals, 75)))
    return res


def rep_check(hid, markers, feat, db):
    """score of candidate boundaries (pause onsets) by similarity of preceding phrase vs following phrase."""
    ps, _ = pauses(db, min_dur=0.12)
    onsets = np.array([p[1] for p in ps]); starts = np.array([p[0] for p in ps])
    out = []
    for m in markers:
        best = []
        for k, on in enumerate(onsets):
            if abs(on - m) > 5.0 or k == 0: continue
            a0 = onsets[k - 1]; a1 = starts[k]
            if a1 - a0 < 1.5: continue
            A = feat[int(a0 / HOP): int(a1 / HOP)]
            Bw = feat[int(on / HOP): int((on + (a1 - a0) * 1.6) / HOP)]
            if len(Bw) < len(A) * 0.8: continue
            # open-end alignment via subsequence DTW with A as query over B (start fixed near 0 by slicing)
            st, c = subseq_dtw(cosd(A, Bw))
            best.append((c + 0.02 * st, on, st * HOP))
        best.sort()
        rank = None
        for r, (c, on, st) in enumerate(best):
            if abs(on - m) < 0.8: rank = r + 1; break
        out.append((m, rank, [(round(on, 1), round(c, 3)) for c, on, st in best[:3]]))
    return out


if __name__ == '__main__':
    markers = json.load(open(sys.argv[1]))
    markers = {h: (v['markers'] if isinstance(v, dict) else v) for h, v in markers.items()}
    feats, dbs, durs = {}, {}, {}
    for h in markers:
        x = load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{h}.mp3')
        feats[h], dbs[h] = features(x); durs[h] = len(x) / 16000
    for fam in ['roumi', 'moaqab']:
        r = refrain_check(fam, markers, feats, durs)
        print(f'\n== {fam}: refrain marker vs template-consensus')
        for h, (own, med, q1, q3) in r.items():
            flag = '' if abs(own - med) < 1.2 else '   <-- CHECK'
            print(f'  {h:9s} own {own:7.2f}  consensus {med:7.2f} (IQR {q1:.2f}-{q3:.2f})  diff {own - med:+.2f}{flag}')
    print('\n== moaqab repetition check (rank 1 = our marker is the best repeat boundary)')
    for h in markers:
        if not h.startswith('moaqab'): continue
        rc = rep_check(h, markers[h][:-1], feats[h], dbs[h])  # refrain marker is not a repeat
        print(' ', h, [(f'{m:.1f}', rk) for m, rk, _ in rc])
