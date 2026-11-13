import json, subprocess, struct, math, os

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

def get_pcm_db(mp3, t0, t1, step_ms=10):
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

all_markers = {}

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
    with open(f'staging/ibrahim_transcripts/{hid}.json') as f:
        tr = json.load(f)

    # All words with timestamps
    all_words = []
    for s in tr.get('segments', []):
        for w in s.get('words', []):
            all_words.append(w)

    print(f"\n=======================================================")
    print(f"🎵 Aligning {hid}: {num_verses} verses, Tharwat={t_dur:.1f}s, Ibrahim={i_dur:.1f}s (ratio={ratio:.3f})")
    print(f"=======================================================")

    markers = []
    prev_marker = 0.0

    for k in range(2, num_verses + 1):
        t_ref = t_markers[k - 2]
        t_est = t_ref * ratio
        first_line = stanzas[k - 1].split('\n')[0].split(':')[0].strip()

        # Look in window +/- 4.5s around t_est, ensuring > prev_marker + 9.0s
        w_start = max(prev_marker + 9.0, t_est - 4.5)
        w_end = min(i_dur - 1.5, t_est + 4.5)

        # In this window, find silences using PCM
        dbs = get_pcm_db(mp3, w_start, w_end, step_ms=20)
        if not dbs:
            m = round(t_est, 2)
            markers.append(m)
            prev_marker = m
            continue

        # Candidate breath valleys: db < -32dB
        # Group into contiguous valleys
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

        # Filter valleys by duration >= 0.12s
        cands = [v for v in valleys if v[2] >= 0.12]
        if not cands:
            min_pt = min(dbs, key=lambda x: x[1])
            cands = [(min_pt[0] - 0.1, min_pt[0] + 0.1, 0.2, min_pt[1])]

        # If multiple valleys in window:
        # Check if one of them matches a word start from whisper
        words_in_win = [w for w in all_words if w_start <= w['start'] <= w_end]
        
        # In recitative verses, the verse transition is the silence before Line 1.
        # Pick the candidate valley closest to t_est
        best_cand = min(cands, key=lambda c: abs((c[0] + c[1])/2 - t_est))

        # Fine scan with 10ms for exact vocal onset after best_cand[0]
        fine_dbs = get_pcm_db(mp3, best_cand[0], min(i_dur, best_cand[1] + 0.6), step_ms=10)
        attack_t = best_cand[1]
        for t, db in fine_dbs:
            if t >= best_cand[0] and db > -26.0:
                attack_t = t
                break

        # Breather Pre-roll: marker is 150ms before attack, inside the valley
        marker = round(max(best_cand[0] + 0.04, attack_t - 0.15), 2)
        markers.append(marker)
        prev_marker = marker

        print(f"  V{k:2d} -> Marker: {marker:6.2f}s (Attack: {attack_t:6.2f}s, Valley: {best_cand[3]:.1f}dB, t_est={t_est:6.2f}s) | Exp: \"{first_line}\"")

    all_markers[hid] = markers

with open('staging/all_ibrahim_markers.json', 'w') as f:
    json.dump(all_markers, f, indent=2)

print("\n🎉 ALL 18 HYMNS ALIGNED!")
