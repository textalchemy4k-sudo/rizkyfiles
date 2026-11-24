# Final mix for shorts 17: voice at -14 LUFS, a barely-there music bed at -38, Kenney CC0 sounds and the user's own files,
# each tied to a visible action in anim.js. Usage: python -I mix.py <clean.mp4> <out.mp4>
import subprocess, sys, glob, os, re, tempfile
# folders (relative to the project): put your sound files here
K = 'sfx/kenney/'; U = 'sfx/mine/'; X = 'sfx/extra/'
VO = os.environ.get('VOICE', 'audio/voice.mp3'); MUSIC = os.environ.get('MUSIC', 'music/track.mp3'); MUSLUFS = float(os.environ.get('MUSLUFS', '-30')); MSS = float(os.environ.get('MSS', '0'));
# the music picker's saved choice (music_choice.json next to the project) wins: its db is relative to -21 LUFS
_ch = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'music_choice.json')
if os.path.exists(_ch) and 'MUSIC' not in os.environ:
    import json; _c = json.load(open(_ch)); MUSIC = _c['file']; MUSLUFS = -21 + float(_c.get('db', 0)); MSS = 0
DUR = float(os.environ.get("DUR", "56.54"))   # length of the video in seconds
video, out = sys.argv[1], sys.argv[2]
def pick(pack, stem, i=0):
    g = sorted(glob.glob(K + pack + '/Audio/' + stem + '*.ogg')); assert g, stem; return g[i % len(g)]
def length(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
ev = []
def add(f, at, g, ss=0.0, dur=None, fi=0.005, fo=0.05, af=''):
    if dur is None: dur = length(f) - ss
    if at + dur > DUR: dur = DUR - at
    ev.append((f, ss, dur, at, g, fi, fo, af))
# big camera swings: a soft woosh whose peak (0.8 s into the file) lands on the move
for t, g in [(4.4, 0.16), (6.3, 0.14), (11.3, 0.2), (21.9, 0.16), (23.6, 0.14), (29.0, 0.14), (36.9, 0.12), (43.2, 0.2)]: add(U + 'woosh.mp3', max(0, t - 0.8), g, dur=2.2, fi=0.05, fo=0.5)
# crashes into the guardrail: crunch + heavy metal + a little glass
for i, t in enumerate([8.75, 15.05, 19.05]):
    g = [1.0, 0.8, 0.7][i]
    add(pick('sci-fi-sounds', 'explosionCrunch', i), t - 0.02, 0.45 * g); add(pick('impact-sounds', 'impactMetal_heavy', i), t, 0.6 * g); add(pick('impact-sounds', 'impactGlass_medium', i), t + 0.04, 0.25 * g)
# the state worker's hammer on the post bracket (and the sign ringing a little)
for i, t in enumerate([15.8, 16.5, 17.2]): add(pick('impact-sounds', 'impactMetal_medium', i), t, 0.4); add(pick('impact-sounds', 'impactBell_heavy', i), t + 0.01, 0.05)
# the guardrail man pats the rails in his bed
for i, t in enumerate([19.73, 20.18]): add(pick('impact-sounds', 'impactMetal_light', i), t, 0.22)
# the hero's door, his hop to the ground, the cut-off saw's blade catching the light
add(pick('rpg-audio', 'doorOpen', 0), 24.05, 0.35); add(pick('impact-sounds', 'footstep_concrete', 0), 24.62, 0.3); add(pick('rpg-audio', 'cloth', 0), 24.4, 0.15)
add(pick('interface-sounds', 'glass', 0), 25.25, 0.12)
# the thermos hits the seat and the door
add(pick('impact-sounds', 'impactGeneric_light', 0), 44.82, 0.35); add(pick('impact-sounds', 'impactGeneric_light', 1), 45.05, 0.2)
# he yanks the wheel: cloth
add(pick('rpg-audio', 'cloth', 2), 43.1, 0.2)
# wind in the day shots (fixed-count loop)
wl = length(U + 'wind.mp3'); ss = 0.3; step = wl - ss - 0.7
for a, b in [(0.0, 6.3), (15.2, 17.8), (19.3, 31.1)]:
    n = int((b - a) / step) + 1
    for k in range(n):
        t = a + k * step
        if t < b - 0.1: add(U + 'wind.mp3', t, 0.16, ss=ss, dur=min(wl - ss - 0.2, b - t), fi=0.6, fo=0.6)
# ---------------------------------------------------------------- BigSoundBank CC0 (Joseph Sardin): saw, cars, cabin, rumble, splash
B = 'sfx/bigsoundbank/'; SAW = B + 's3458.mp3'; PASS = B + 's3434.mp3'; CABIN = B + 's3098.mp3'; SPLASH = B + 's1529.mp3'; GRIND = B + 's0853.mp3'
# the concrete saw while he cuts (fading as the camera climbs away), when he cuts again, and sped up in the timelapse
add(SAW, 0.0, 0.5, ss=20, dur=6.2, fi=0.05, fo=2.2)
add(SAW, 25.5, 0.55, ss=40, dur=1.9, fi=0.05, fo=0.3)
add(SAW, 27.32, 0.35, ss=60, dur=1.55, fi=0.05, fo=0.4, af='atempo=2.0')
add(GRIND, 24.9, 0.18, ss=0.5, dur=0.6, fi=0.05, fo=0.3)   # he squeezes the throttle as the blade glints
# cars: the passing car in shot 1, the crash cars rolling in, his pickup arriving, timelapse traffic
add(PASS, 4.3, 0.25, ss=2.0, dur=2.0, fi=0.4, fo=0.6)
add(PASS, 6.3, 0.35, ss=0.5, dur=2.5, fi=0.6, fo=0.2)
add(PASS, 12.9, 0.35, ss=3.0, dur=2.15, fi=0.5, fo=0.1)
add(PASS, 18.3, 0.3, ss=6.0, dur=0.75, fi=0.3, fo=0.05)
add(PASS, 23.45, 0.3, ss=9.0, dur=0.95, fi=0.5, fo=0.4)
add(PASS, 27.32, 0.25, ss=1.0, dur=1.5, fi=0.2, fo=0.3, af='atempo=1.6')
# inside the inspector's car at night: the cabin hum; the strips: the same hum chopped into a fast drone (real recording, processed)
add(CABIN, 34.7, 0.35, ss=5.0, dur=6.0, fi=0.4, fo=0.2)
add(CABIN, 40.6, 0.9, ss=12.0, dur=2.85, fi=0.02, fo=0.25, af='tremolo=f=38:d=0.95,lowpass=f=900,volume=2.2')
add(CABIN, 43.45, 0.35, ss=20.0, dur=4.7, fi=0.2, fo=0.5)
add(CABIN, 49.85, 0.35, ss=30.0, dur=5.15, fi=0.4, fo=0.2)
add(CABIN, 55.0, 0.95, ss=40.0, dur=1.54, fi=0.02, fo=0.3, af='tremolo=f=38:d=0.95,lowpass=f=900,volume=2.2')
# coffee everywhere
add(SPLASH, 44.85, 0.5); add(SPLASH, 45.1, 0.3, ss=0.2)
tmp = tempfile.mkdtemp(); parts = []
def run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-800:]); sys.exit(1)
for b in range(0, len(ev), 20):
    args = ['ffmpeg', '-v', 'error', '-y']; fl = []; chunk = ev[b:b + 20]
    for i, (f, ss, dur, at, g, fi, fo, af) in enumerate(chunk):
        args += ['-i', f]; ms = int(round(max(0, at) * 1000))
        fl.append(f'[{i}:a]atrim={ss}:{ss + dur},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,{af + ',' if af else ''}afade=t=in:d={fi},afade=t=out:st={max(0, dur - fo)}:d={fo},volume={g},adelay={ms}|{ms}[e{i}]')
    fl.append(''.join(f'[e{i}]' for i in range(len(chunk))) + f'amix=inputs={len(chunk)}:normalize=0:duration=longest,apad=whole_dur={DUR}[o]')
    q = os.path.join(tmp, f'p{b}.wav'); run(args + ['-filter_complex', ';'.join(fl), '-map', '[o]', '-c:a', 'pcm_f32le', q]); parts.append(q)
args = ['ffmpeg', '-v', 'error', '-y']
for q in parts: args += ['-i', q]
d = os.path.dirname(os.path.abspath(out))
sfx = d + '/stem_sfx.wav'; run(args + ['-filter_complex', ''.join(f'[{i}:a]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,volume=0.7[o]', '-map', '[o]', '-c:a', 'pcm_f32le', sfx])
shape = f'atrim={MSS}:{MSS + DUR},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.25,afade=t=out:st={DUR - 1.2}:d=1.2'
LOOPIN = ['-stream_loop', '-1'] if length(MUSIC) < MSS + DUR + 0.5 else []   # short tracks loop
I0 = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', subprocess.run(['ffmpeg', *LOOPIN, '-i', MUSIC, '-af', shape + ',ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1]); print('music raw', I0)
mus = d + '/stem_music.wav'; run(['ffmpeg', '-v', 'error', '-y', *LOOPIN, '-i', MUSIC, '-af', shape + f',volume={MUSLUFS - I0}dB', '-c:a', 'pcm_f32le', mus])
vo = d + '/stem_vo.wav'; run(['ffmpeg', '-v', 'error', '-y', '-i', VO, '-af', 'aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', '-c:a', 'pcm_f32le', vo])
if out.endswith('.m4a'): run(['ffmpeg', '-v', 'error', '-y', '-i', vo, '-i', sfx, '-i', mus, '-filter_complex', f'[0:a][1:a][2:a]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.89,atrim=0:{DUR}[a]', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', out])
else: run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', vo, '-i', sfx, '-i', mus, '-filter_complex', f'[1:a][2:a][3:a]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.89,atrim=0:{DUR}[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out])
for name, f in [('voice', vo), ('sfx', sfx), ('music', mus), ('final', out)]:
    print(name, re.findall(r'I:\s+(-?[0-9.]+) LUFS', subprocess.run(['ffmpeg', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1])
