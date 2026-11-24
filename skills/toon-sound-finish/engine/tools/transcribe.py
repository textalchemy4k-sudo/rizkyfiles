# Word-level timestamps for a voiceover. usage: python transcribe.py voice.mp3 out.json
import json, os, subprocess, sys
# os.environ.setdefault("HF_HOME", "<a cache folder>")
import numpy as np
from faster_whisper import WhisperModel

FFMPEG = os.path.join(os.path.dirname(__file__), "..", "node_modules", "ffmpeg-static", "ffmpeg.exe")
if not os.path.exists(FFMPEG): FFMPEG = "ffmpeg"   # ffmpeg on PATH (Mac/Linux, or no npm install)
pcm = subprocess.run([FFMPEG, "-v", "error", "-i", sys.argv[1], "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                     capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)

model = WhisperModel("small.en", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio, word_timestamps=True)
words = [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for seg in segments for w in seg.words]
json.dump(words, open(sys.argv[2], "w"), indent=0)
print(" ".join(f"{x['w']}@{x['s']}" for x in words))
