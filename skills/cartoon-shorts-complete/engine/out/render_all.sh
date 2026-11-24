#!/bin/bash
# renders anim.html in 300-frame chunks; retries a chunk until its frame count matches
cd "$(dirname "$0")/.."
N=1697
for a in $(seq 0 300 $((N-1))); do
  b=$((a+300)); [ $b -gt $N ] && b=$N
  f=out/chunk_$(printf %04d $a).mp4
  for try in 1 2 3; do
    if [ -f "$f" ] && [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" | tr -d ",
")" = "$((b-a))" ]; then break; fi
    PAGE=anim.html node tools/render.js "$f" --range $a,$b 2>&1 | grep -E "pageerror|done|frame (0|300|600|900|1200|1500) " 
  done
done
ls out/chunk_*.mp4 | sed 's/^/file /' | sed "s#file out/#file #" > out/list.txt
cd out && ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy anim_clean.mp4 && ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 anim_clean.mp4
