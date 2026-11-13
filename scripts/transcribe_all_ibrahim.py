import json, os, subprocess
import whisper

model = whisper.load_model('base')

all_ids = [
    'roumi-1', 'moaqab-1', 'roumi-2', 'moaqab-2', 'roumi-3', 'moaqab-3',
    'roumi-4', 'moaqab-4', 'roumi-5', 'moaqab-5', 'roumi-6', 'moaqab-6',
    'roumi-7', 'moaqab-7', 'roumi-8', 'moaqab-8', 'roumi-9', 'moaqab-9'
]

os.makedirs('staging/ibrahim_transcripts', exist_ok=True)

for hid in all_ids:
    out_json = f'staging/ibrahim_transcripts/{hid}.json'
    if os.path.exists(out_json):
        print('Already transcribed:', hid)
        continue
    mp3 = f'staging/tracks/cantor-ibrahim/cantor-ibrahim_{hid}.mp3'
    print('Transcribing:', hid)
    res = model.transcribe(mp3, word_timestamps=True)
    with open(out_json, 'w') as f:
        json.dump(res, f, indent=2)
    num_segs = len(res.get('segments', []))
    print(f'✅ Saved {hid}.json ({num_segs} segments)')

print('All 18 transcribed!')
