# Mean colour (sRGB 0-255) of named rectangular regions of a frame. Regions are fractions of width/height.
# python -I regions.py <video-or-image> <time-or-'img'> '<json {name:[x0,y0,x1,y1]}>'
import sys, json, subprocess
src, t, regs = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
W, H = 270, 480
args = ['ffmpeg', '-v', 'error'] + ([] if t == 'img' else ['-ss', t]) + ['-i', src, '-frames:v', '1', '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
raw = subprocess.run(args, capture_output=True).stdout
for name, (x0, y0, x1, y1) in regs.items():
    xs, ys = range(int(x0 * W), max(int(x0 * W) + 1, int(x1 * W))), range(int(y0 * H), max(int(y0 * H) + 1, int(y1 * H)))
    s = [0, 0, 0]; n = 0
    for y in ys:
        for x in xs:
            i = (y * W + x) * 3; s[0] += raw[i]; s[1] += raw[i + 1]; s[2] += raw[i + 2]; n += 1
    m = [round(v / n) for v in s]
    print(f'{name:16s} rgb({m[0]:3d},{m[1]:3d},{m[2]:3d})  #{m[0]:02x}{m[1]:02x}{m[2]:02x}')
