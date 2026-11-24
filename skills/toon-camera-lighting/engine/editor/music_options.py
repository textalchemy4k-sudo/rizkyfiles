# Build the music picker's files: python -I tools/music_options.py <folder of tracks> [duration]
# Writes out/opts/base.m4a (voice + sound effects, from out/stem_vo.wav + out/stem_sfx.wav made by out/mix.py),
# out/opts/musN.m4a (each track trimmed or looped to the video length, at -21 LUFS = about the reference shorts' music
# level) and out/opts/tracks.json, which music.html reads. Run mix.py once first so the stems exist.
import subprocess, re, glob, json, os, sys
folder = sys.argv[1]; DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 56.54
os.makedirs('out/opts', exist_ok=True)
def run(a): subprocess.run(a, check=True, capture_output=True)
def length(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
run(['ffmpeg', '-y', '-i', 'out/stem_vo.wav', '-i', 'out/stem_sfx.wav', '-filter_complex', '[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.89[a]', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', 'out/opts/base.m4a'])
tracks = []
for i, f in enumerate(sorted(g for g in glob.glob(folder + '/*') if g.lower().endswith(('.mp3', '.ogg', '.wav', '.m4a', '.flac')))):
    loop = ['-stream_loop', '-1'] if length(f) < DUR + 0.5 else []
    shape = f'atrim=0:{DUR},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.25,afade=t=out:st={DUR - 1.2}:d=1.2'
    I0 = float(re.findall(r'I:\s+(-?[0-9.]+) LUFS', subprocess.run(['ffmpeg', *loop, '-i', f, '-vn', '-af', shape + ',ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1])
    run(['ffmpeg', '-y', *loop, '-i', f, '-vn', '-af', shape + f',volume={-21 - I0}dB', '-c:a', 'aac', '-b:a', '192k', f'out/opts/mus{i + 1}.m4a'])
    tracks.append({'n': i + 1, 'name': os.path.splitext(os.path.basename(f))[0], 'file': os.path.abspath(f).replace('\\', '/')}); print(i + 1, os.path.basename(f))
json.dump(tracks, open('out/opts/tracks.json', 'w'), indent=1)
