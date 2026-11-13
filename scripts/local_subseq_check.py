"""Local check: Tharwat's first 5 s after each marker is subsequence-DTW'd into Ibrahim +-6 s around our marker.
Independent of the global path. Reports where the best local start disagrees with our marker."""
import sys, json, numpy as np
sys.path.insert(0, 'scripts')
import dtw_align_ibrahim as D
from independent_checks import subseq_dtw, cosd
HOP = D.HOP
recs = json.load(open('src/data/recordings.json'))
final = json.load(open(sys.argv[1]))
bad = []
for hid, ms in final.items():
    t = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')['markers']
    ft, _ = D.features(D.load(f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3'))
    fi, _ = D.features(D.load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3'))
    row = []
    for k, (tm, m) in enumerate(zip(t, ms)):
        q = ft[int(tm / HOP): int((tm + 5.0) / HOP)]
        w0 = max(0.0, m - 6.0)
        tg = fi[int(w0 / HOP): int((m + 11.0) / HOP)]
        st, c = subseq_dtw(cosd(q, tg))
        est = w0 + st * HOP
        row.append(round(est - m, 2))
        if abs(est - m) > 0.8: bad.append((hid, k + 1, m, round(est, 2)))
    print(f'{hid:9s} local-start minus marker: {row}')
print('\nDISAGREE >0.8 s:', bad)
