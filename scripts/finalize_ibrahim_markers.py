"""
Finalize Ibrahim markers:
  - take stage-2 markers (pause-anchored or DTW)
  - for DTW-only markers snap to the nearest vocal onset (end of a silence) within 0.6 s, keeping Tharwat's lead-in
  - compute a per-marker confidence from the local DTW path cost (+-2 s) relative to the hymn's median
Writes staging/ibrahim_markers_round3.json and prints a review table.
"""
import json, sys
import numpy as np
sys.path.insert(0, 'scripts')
import dtw_align_ibrahim as D
from anchor_refine_ibrahim import pauses

recs = json.load(open('src/data/recordings.json'))
s2 = json.load(open('staging/stage2_markers.json'))
final, conf = {}, {}

for hid, v in s2.items():
    t = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')
    tm = t['markers']
    xt = D.load(f'staging/tracks/cantor-tharwat/cantor-tharwat_{hid}.mp3')
    xi = D.load(f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3')
    ft, dbt = D.features(xt); fi, dbi = D.features(xi)
    tt, ti = D.dtw_map(ft, fi)
    # per-frame cost along the path
    a = ft / (np.linalg.norm(ft, axis=1, keepdims=True) + 1e-6)
    b = fi / (np.linalg.norm(fi, axis=1, keepdims=True) + 1e-6)
    pc = 1.0 - np.sum(a[(tt / D.HOP).astype(int)] * b[(ti / D.HOP).astype(int)], axis=1)
    med = np.median(pc)
    ips, _ = pauses(dbi, 0.1)
    out, cf = [], []
    for k, m in enumerate(v['markers']):
        src = v['notes'][k][0]
        mapped = v['notes'][k][1]
        if src == 'DTW-only':
            lead = 0.3
            c = [(abs(e - mapped), e, d) for s, e, d in ips if abs(e - mapped) <= 0.6]
            if c:
                _, e, d = min(c)
                m = round(float(e - min(lead, 0.6 * d)), 2)
        out.append(m)
        w = (tt > tm[k] - 2.0) & (tt < tm[k] + 2.0)
        cf.append(float(pc[w].mean() / med))
    final[hid] = out; conf[hid] = cf

json.dump(final, open('staging/ibrahim_markers_round3.json', 'w'), indent=1)
prev = json.load(open('staging/all_ibrahim_markers_final.json'))
print('hymn      marker  new      prev     delta   local-cost(rel)')
for hid in final:
    for k, m in enumerate(final[hid]):
        flag = '  <-- spot-check' if conf[hid][k] > 1.25 else ''
        print(f'{hid:9s} M{k+1:<2d}  {m:7.2f}  {prev[hid][k]:7.2f}  {m - prev[hid][k]:+6.2f}   {conf[hid][k]:.2f}{flag}')
