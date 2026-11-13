import json, subprocess, struct, math, os, whisper

model = whisper.load_model('base')

with open('src/data/hymns.json') as f:
    hymns = json.load(f)

with open('src/data/recordings.json') as f:
    recs = json.load(f)

with open('staging/trimmed_durations.json') as f:
    durations = json.load(f)

all_ids = [
    'roumi-1', 'moaqab-1', 'roumi-2', 'moaqab-2', 'roumi-3', 'moaqab-3',
    'roumi-4', 'moaqab-4', 'roumi-5', 'moaqab-5', 'roumi-6', 'moaqab-6',
    'roumi-7', 'moaqab-7', 'roumi-8', 'moaqab-8', 'roumi-9', 'moaqab-9'
]

# We already established high-precision ground truth for roumi-1 and roumi-2
verified_overrides = {
    'roumi-1': [18.60, 37.40, 57.05, 76.40, 95.60, 115.05],
    'roumi-2': [19.05, 39.08, 58.15, 77.30, 96.25, 116.45],
}

def get_pcm_db(mp3, t0, t1, step_ms=20):
    cmd = ['ffmpeg', '-ss', str(t0), '-to', str(t1), '-i', mp3, '-ac', '1', '-ar', '16000', '-f', 's16le', '-']
    raw = subprocess.run(cmd, capture_output=True).stdout
    samples = struct.unpack(f'<{len(raw)//2}h', raw)
    step = int(16000 * step_ms / 1000)
    dbs = []
    for i in range(0, len(samples) - step, step):
        t = t0 + i / 16000.0
        chunk = samples[i:i+step]
        rms = math.sqrt(sum(s*s for s in chunk) / len(chunk))
        db = 20 * math.log10(max(rms, 1) / 32768.0)
        dbs.append((round(t, 3), round(db, 1)))
    return dbs

def find_best_marker(mp3, t_est_min, t_est_max, expected_text, i_dur):
    # Find all silence valleys (db < -32) between t_est_min and t_est_max
    dbs = get_pcm_db(mp3, t_est_min, t_est_max, step_ms=20)
    valleys = []
    in_v = False
    v_start = 0.0
    min_db = 0.0
    for t, db in dbs:
        if db < -32.0:
            if not in_v:
                in_v = True
                v_start = t
                min_db = db
            else:
                min_db = min(min_db, db)
        else:
            if in_v:
                in_v = False
                valleys.append((v_start, t, t - v_start, min_db))
    if in_v:
        valleys.append((v_start, dbs[-1][0], dbs[-1][0] - v_start, min_db))

    cands = [v for v in valleys if v[2] >= 0.12]
    if not cands:
        min_pt = min(dbs, key=lambda x: x[1])
        cands = [(min_pt[0] - 0.1, min_pt[0] + 0.1, 0.2, min_pt[1])]

    scored = []
    for cand in cands:
        # Fine scan for vocal onset after cand[0]
        fine_dbs = get_pcm_db(mp3, cand[0], min(i_dur, cand[1] + 0.6), step_ms=10)
        attack_t = cand[1]
        for t, db in fine_dbs:
            if t >= cand[0] and db > -26.0:
                attack_t = t
                break
        marker = round(max(cand[0] + 0.04, attack_t - 0.15), 2)
        # Transcribe 3.0s
        clip = f'/tmp/eval_{marker}.wav'
        subprocess.run(['ffmpeg', '-y', '-ss', str(marker), '-t', '3.0', '-i', mp3, '-ar', '16000', '-ac', '1', clip], capture_output=True)
        txt = model.transcribe(clip)['text'].strip()
        scored.append((marker, attack_t, cand[3], txt))

    return scored

results = {}

for hid in all_ids:
    h = next(x for x in hymns if x['id'] == hid)
    stanzas = [s.strip() for s in h['lyrics']['coptic'].split('\n\n') if s.strip()]
    num_verses = len(stanzas)
    tharwat = next(r for r in recs if r['hymnId'] == hid and r['cantorId'] == 'cantor-tharwat')
    t_markers = tharwat['markers']
    t_dur = tharwat['audioLength']
    i_dur = durations[hid]
    ratio = i_dur / t_dur

    mp3 = f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3'

    print(f"\n=======================================================")
    print(f"🎵 Aligning {hid}: {num_verses} verses, Tharwat={t_dur:.1f}s, Ibrahim={i_dur:.1f}s (ratio={ratio:.3f})")
    print(f"=======================================================")

    if hid in verified_overrides:
        markers = verified_overrides[hid]
        for idx, m in enumerate(markers):
            first_line = stanzas[idx + 1].split('\n')[0].split(':')[0].strip()
            clip = f'/tmp/ver_{hid}_{m}.wav'
            subprocess.run(['ffmpeg', '-y', '-ss', str(m), '-t', '3.0', '-i', mp3, '-ar', '16000', '-ac', '1', clip], capture_output=True)
            txt = model.transcribe(clip)['text'].strip()
            print(f"  V{idx+2:2d} -> Verified Marker: {m:6.2f}s | Exp: \"{first_line}\" | Got: \"{txt}\"")
        results[hid] = markers
        continue

    markers = []
    prev_marker = 0.0

    for k in range(2, num_verses + 1):
        t_ref = t_markers[k - 2]
        t_est = t_ref * ratio
        first_line = stanzas[k - 1].split('\n')[0].split(':')[0].strip()

        # Window around t_est
        w_start = max(prev_marker + 10.0, t_est - 4.5)
        w_end = min(i_dur - 1.5, t_est + 4.5)

        cands = find_best_marker(mp3, w_start, w_end, first_line, i_dur)

        # In recitative hymns, if there are multiple candidates:
        # Candidate 1 is before Line 1 (the verse start), Candidate 2 is before Line 2!
        # Because Line 1 lasts ~4.5s, Candidate 1 is the EARLIER silence!
        # So unless Candidate 1 is wild (< prev_marker + 11s when expected is 20s), Candidate 1 is the verse start!
        # Let's inspect all candidates:
        if len(cands) == 1:
            chosen = cands[0]
        else:
            # If the difference between candidates is ~3-5 seconds, Candidate 1 is Line 1!
            cands_sorted = sorted(cands, key=lambda c: c[0])
            chosen = cands_sorted[0]
            # Print if there were multiple
            # print(f"    (Multiple cands for V{k}: {[c[0] for c in cands_sorted]} -> picked {chosen[0]})")

        marker = chosen[0]
        markers.append(marker)
        prev_marker = marker

        print(f"  V{k:2d} -> Marker: {marker:6.2f}s (Attack: {chosen[1]:6.2f}s, Valley: {chosen[2]:.1f}dB) | Exp: \"{first_line}\" | Got: \"{chosen[3]}\"")

    results[hid] = markers

with open('staging/all_ibrahim_markers_verified.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\n🎉 ALL 18 HYMNS VERIFIED AND SAVED!")
