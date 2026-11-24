# Generic final mix from a cue sheet. usage: python -I tools/mix_cues.py cues.json clean.mp4 final.mp4
#   (or final.m4a for audio only, e.g. for the camera editor / music picker)
# cues.json:
# {
#   "duration": 56.54,                       length of the video in seconds
#   "voice": "audio/voice.mp3",              loudness-normalised to -14 LUFS
#   "music": "music/track.mp3",              optional; trimmed/looped to the video, faded in/out
#   "music_lufs": -21,                       music stem level (music_choice.json from the picker overrides it)
#   "sfx_gain": 0.7,                         master gain for all sound effects
#   "cues": [
#     {"file": "sfx/mine/door.ogg", "at": 24.05, "gain": 0.35},
#     {"file": "sfx/bigsoundbank/saw.mp3", "at": 0, "gain": 0.5, "ss": 20, "dur": 6.2, "fi": 0.05, "fo": 2.2},
#     {"file": "sfx/mine/woosh.mp3", "at": 3.6, "gain": 0.16, "peak": 0.8},     peak: seconds into the file where it hits
#     {"file": "sfx/x.mp3", "at": 27.3, "gain": 0.3, "af": "atempo=1.6"}        any ffmpeg audio filter
#   ],
#   "loops": [ {"file": "sfx/mine/wind.mp3", "from": 0, "to": 6.3, "gain": 0.16} ]   beds laid with a fixed count
# }
# at = time on the video, ss = start inside the file, dur = how long, fi/fo = fade in/out seconds.
import json, os, re, subprocess, sys, tempfile

cfg_path, video, out = sys.argv[1], sys.argv[2], sys.argv[3]
C = json.load(open(cfg_path))
DUR = float(C['duration']); VO = C['voice']; MUSIC = C.get('music'); MUSLUFS = float(C.get('music_lufs', -21))
choice = os.path.join(os.path.dirname(os.path.abspath(cfg_path)), 'music_choice.json')
if os.path.exists(choice):
    ch = json.load(open(choice)); MUSIC = ch['file']; MUSLUFS = -21 + float(ch.get('db', 0)); print('music from picker:', MUSIC, MUSLUFS)

def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-800:]); sys.exit(1)
    return r
def length(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
def lufs(f, pre=None, af=None):
    a = ['ffmpeg', *(pre or []), '-i', f, '-vn', '-af', (af + ',' if af else '') + 'ebur128', '-f', 'null', '-']
    return float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', subprocess.run(a, capture_output=True, text=True).stderr)[-1])

ev = []
def add(f, at, g, ss=0.0, dur=None, fi=0.005, fo=0.05, af=''):
    assert os.path.exists(f), 'missing sound file: ' + f
    if dur is None: dur = length(f) - ss
    if at < 0: ss -= at; dur += at; at = 0
    if at + dur > DUR: dur = DUR - at
    if dur > 0.01: ev.append((f, ss, dur, at, g, fi, fo, af))
for c in C.get('cues', []):
    at = c['at'] - c.get('peak', 0)
    add(c['file'], at, c.get('gain', 0.5), c.get('ss', 0), c.get('dur'), c.get('fi', 0.005), c.get('fo', 0.05), c.get('af', ''))
for L in C.get('loops', []):   # fixed-count loop: never a while loop (one that never advanced once filled the RAM)
    wl = length(L['file']); ss = L.get('ss', 0.3); step = max(0.5, wl - ss - 0.7); a, b = L['from'], L['to']
    for k in range(int((b - a) / step) + 1):
        t = a + k * step
        if t < b - 0.1: add(L['file'], t, L.get('gain', 0.15), ss=ss, dur=min(wl - ss - 0.2, b - t), fi=0.6, fo=0.6)

d = os.path.dirname(os.path.abspath(out)); tmp = tempfile.mkdtemp(); parts = []
for b in range(0, len(ev), 20):   # 20 sounds per ffmpeg call
    args = ['ffmpeg', '-v', 'error', '-y']; fl = []; chunk = ev[b:b + 20]
    for i, (f, ss, dur, at, g, fi, fo, af) in enumerate(chunk):
        args += ['-i', f]; ms = int(round(at * 1000))
        fl.append(f'[{i}:a]atrim={ss}:{ss + dur},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,{af + "," if af else ""}afade=t=in:d={fi},afade=t=out:st={max(0, dur - fo)}:d={fo},volume={g},adelay={ms}|{ms}[e{i}]')
    fl.append(''.join(f'[e{i}]' for i in range(len(chunk))) + f'amix=inputs={len(chunk)}:normalize=0:duration=longest,apad=whole_dur={DUR}[o]')
    q = os.path.join(tmp, f'p{b}.wav'); run(args + ['-filter_complex', ';'.join(fl), '-map', '[o]', '-c:a', 'pcm_f32le', q]); parts.append(q)
sfx = d + '/stem_sfx.wav'
if parts:
    args = ['ffmpeg', '-v', 'error', '-y']
    for q in parts: args += ['-i', q]
    run(args + ['-filter_complex', ''.join(f'[{i}:a]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,volume={C.get("sfx_gain", 0.7)},atrim=0:{DUR}[o]', '-map', '[o]', '-c:a', 'pcm_f32le', sfx])
else:
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r=48000:cl=stereo', '-t', str(DUR), '-c:a', 'pcm_f32le', sfx])
vo = d + '/stem_vo.wav'
run(['ffmpeg', '-v', 'error', '-y', '-i', VO, '-af', 'aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', '-c:a', 'pcm_f32le', vo])
stems = [vo, sfx]
if MUSIC:
    shape = f'atrim=0:{DUR},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.25,afade=t=out:st={DUR - 1.2}:d=1.2'
    loop = ['-stream_loop', '-1'] if length(MUSIC) < DUR + 0.5 else []
    I0 = lufs(MUSIC, loop, shape); mus = d + '/stem_music.wav'
    run(['ffmpeg', '-v', 'error', '-y', *loop, '-i', MUSIC, '-af', shape + f',volume={MUSLUFS - I0}dB', '-c:a', 'pcm_f32le', mus]); stems.append(mus)
n = len(stems); mixf = ''.join(f'[{i + (0 if out.endswith(".m4a") else 1)}:a]' for i in range(n)) + f'amix=inputs={n}:normalize=0:duration=longest,alimiter=limit=0.89,atrim=0:{DUR}[a]'
ins = sum((['-i', s] for s in stems), [])
if out.endswith('.m4a'): run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', mixf, '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', out])
else: run(['ffmpeg', '-v', 'error', '-y', '-i', video, *ins, '-filter_complex', mixf, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out])
print(len(ev), 'sounds placed')
for name, f in [('voice', vo), ('sfx', sfx)] + ([('music', stems[2])] if MUSIC else []) + [('final', out)]:
    print(f'{name:6s} {lufs(f):6.1f} LUFS')
