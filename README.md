# Cartoon Shorts Pack

The full kit behind the "Rumble Strips" short: 2D cartoon characters living in a realistic 3D world made in code.

## What's inside
| Folder | What it is |
|---|---|
| `pdf/Prompt_Guide.pdf` | How to write the prompts, give feedback, and get Claude to model objects. |
| `skills/cartoon-shorts-complete/` | The whole pipeline in one skill: world, characters, cameras, camera editor, music picker, render, subtitles, mix. |
| `skills/toon-characters-style/` | Characters: skeleton, movement, faces, clothes, lighting on characters. Includes a 10 s demo scene and `face_board.jpg`. |
| `skills/toon-world-objects/` | Realistic backgrounds and objects: terrain, grass, roads, damage, cars with interiors, town, props. |
| `skills/toon-camera-lighting/` | Camera engine, camera editor, music picker, sun/sky/night lighting. |
| `skills/toon-sound-finish/` | Sound effects on exact frames, the cue-sheet mixer, music picker, subtitles, loudness, finishing checklist. |
| `skills/toon-storyboard-review/` | Storyboard first: brief, beats, storyboard sheets, approval, the review loop and checklists. Real Rumble Strips examples. |
| `github_skills/` | The open-source GitHub skills used to build all this, with their licences and links. |
| `videos/` | `music_picker_walkthrough.mp4`: the music picker in use (42 s, with sound). |
| `face_board.jpg` | Every emotion, blend and eye type the face engine draws, with the values that make each one. |
| `rules/` | All the rules as plain text files. Each skill also carries its own copy. |

## Install a skill
Copy a skill folder into `~/.claude/skills/` (Windows: `C:\Users\<you>\.claude\skills\`). Claude Code picks it up
by its `SKILL.md`. Then ask, for example: "make a short with the cartoon-shorts-complete skill, here is my script and
voice". The part skills (characters, world, camera, sound, storyboard) can be installed on their own or together.

## What you need
- Node 18 or newer, Python 3, ffmpeg + ffprobe on PATH, Google Chrome (WebGPU on).
- In each `engine/` folder: `npm install` (Playwright, ffmpeg-static).
- Word timings for subtitles: `pip install faster-whisper numpy`.
- Your own files: the voice at `audio/voice.mp3`, sound effects in `sfx/` (`sfx/mine`, `sfx/kenney`,
  `sfx/bigsoundbank`), music in `music/`. None are included.

## Sound sources (free, CC0)
- Kenney audio packs: https://kenney.nl/assets/category:Audio
- BigSoundBank: https://bigsoundbank.com
- OpenGameArt (filter CC0): https://opengameart.org

## Licences
- three.js (in `vendor/`): MIT.
- `github_skills/`: each folder keeps its own licence (MIT or Apache-2.0). See `github_skills/README.md`.
- Code and rules in this pack: yours to use for your own videos.
- Use only sounds and music you have the right to use.
