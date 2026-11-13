#!/usr/bin/env python3
# Word timestamps for voice files via faster-whisper.  usage: align.py <lang> file1.mp3 [file2 ...]
# prints JSON: [[ [word, start, end], ... ], ...]  (one list per file)
import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
import os

def load(path):
    ff = os.environ.get('FFMPEG', 'ffmpeg')
    raw = subprocess.run([ff, '-v', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

lang, files = sys.argv[1], sys.argv[2:]
model = WhisperModel('small', device='cpu', compute_type='int8')
out = []
for f in files:
    segs, _ = model.transcribe(load(f), language=lang, word_timestamps=True, beam_size=5)
    out.append([[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words])
print(json.dumps(out, ensure_ascii=False))
