---
name: toon-sound-finish
description: Sound, music, subtitles and the final mix for cartoon shorts - real CC0 sound effects placed on the exact visible frames, layered impacts, wooshes timed to camera moves, wind and cabin beds, voice at -14 LUFS, a music picker that plays every track over the rendered video with live volume, word-by-word subtitles as a separate overlay, loudness checks. Use when adding or changing sound effects, music, subtitles, or making the final deliverable of a short.
---

# Sound, music, subtitles and finishing

Read `rules/sound.md` first. Tools are in `engine/`. Run `npm install` there once. You need ffmpeg and ffprobe on PATH,
Python 3 and `pip install faster-whisper numpy`.

## 1. Word timings
`python -I tools/transcribe.py audio/voice.mp3 words.json` prints every word with its start time. Fix mishearings in
`words.json` against the script. Use these times for the storyboard beats, the animation and every sound cue.

## 2. Sound cue sheet
Write `cues.json` (format at the top of `tools/mix_cues.py`): one entry per sound, with `at` taken from the animation's
event times. `out/mix_rumble_example.py` is the full Rumble Strips mix, about 60 cues, as a worked example of layering.

## 3. Music picker
1. Make the stems: `python -I tools/mix_cues.py cues.json out/clean.mp4 out/editor_audio.m4a`. This writes
   `out/stem_vo.wav` and `out/stem_sfx.wav`.
2. Make a small preview: `ffmpeg -i out/clean.mp4 -vf scale=540:-2 -an out/preview_540.mp4`.
3. Prepare the tracks: `python -I tools/music_options.py <folder of tracks> <duration>`.
4. Start the server with `node tools/editor_server.js 5179` and open http://localhost:5179/music.html. Play each track
   over the video, set the volume, then press Save as final. That writes `music_choice.json`.

## 4. Subtitles
`node tools/subs_overlay.js words.json out/subs.mov <frames> 30` makes a transparent overlay. Lay it on the picture:
`ffmpeg -i out/clean.mp4 -i out/subs.mov -filter_complex "[0:v][1:v]overlay" -c:v libx264 -crf 16 -pix_fmt yuv420p out/subs.mp4`

## 5. Final mix
`python -I tools/mix_cues.py cues.json out/subs.mp4 out/final.mp4` prints the LUFS of the voice, sound effects, music
and final. The target for the final is about -14. Then follow the finishing checklist in `rules/sound.md`.

## Files
- `tools/transcribe.py`: Whisper word timings.
- `tools/mix_cues.py`: the cue-sheet mixer (voice, sound effects, beds, music, loudness).
- `tools/subs_overlay.js`: the subtitle overlay.
- `tools/music_options.py`, `music.html`, `tools/editor_server.js`: the music picker.
- `out/mix_rumble_example.py`: the real Rumble Strips mix, kept for reference.
