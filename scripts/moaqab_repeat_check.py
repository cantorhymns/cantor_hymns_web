"""
Mo'aqab repetition check v2.
Verse k+1 line 1 == verse k line 4, so the first 3 s sung at a correct marker must match something
sung in the ~14 s BEFORE it (subsequence DTW). Wrong anchors (line 2 of the same verse, or the earlier occurrence
of the repeated line) do not match anything before them.
Prints the match cost at the marker and at offsets -5..+5 s so a wrong anchor stands out.
"""
import json, sys
import numpy as np
sys.path.insert(0, 'scripts')
from dtw_align_ibrahim import load, features, HOP
from independent_checks import subseq_dtw, cosd


def cost_at(feat, m, qlen=3.0, back=14.0):
    q = feat[int(max(m - 0.1, 0) / HOP): int((m + qlen) / HOP)]
    t0 = max(0.0, m - back)
    tg = feat[int(t0 / HOP): int(max(m - 0.4, t0 + 1) / HOP)]
    if len(tg) < len(q) * 0.6:
        return 9.9, 0
    st, c = subseq_dtw(cosd(q, tg))
    return c, t0 + st * HOP


if __name__ == '__main__':
    markers = json.load(open(sys.argv[1]))
    markers = {h: (v['markers'] if isinstance(v, dict) else v) for h, v in markers.items()}
    offs = [-5, -3, -1.5, 0, 1.5, 3, 5]
    bad = []
    for h, ms in markers.items():
        if not h.startswith('moaqab'): continue
        x = load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{h}.mp3')
        f, _ = features(x)
        print(f'\n{h}   (cost at marker | cost at offsets {offs})')
        for k, m in enumerate(ms[:-1]):   # last marker is the refrain
            cs = [cost_at(f, m + o)[0] for o in offs]
            best = int(np.argmin(cs))
            verdict = 'OK ' if offs[best] == 0 else f'?? best offset {offs[best]:+}'
            if offs[best] != 0: bad.append((h, k + 1, m, offs[best]))
            print(f'  M{k+1} {m:7.2f}  ' + ' '.join(f'{c:.2f}' for c in cs) + '  ' + verdict)
    print('\nflagged:', bad)
