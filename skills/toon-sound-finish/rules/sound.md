# Sound, music, subtitles and finishing: the rules

## Where sounds come from
- Never AI-generated or synthesised sound effects. They sound fake next to real pictures. Use real recordings:
  - your own recordings or packs you own;
  - Kenney audio packs (CC0): impacts, interface, RPG, sci-fi, footsteps, doors, cloth, glass;
  - BigSoundBank (CC0): real cars passing, engines, cabin hum, saws, splashes, machines;
  - OpenGameArt filtered to CC0.
- Keep a `CREDITS.txt` with each file, its source and its licence.
- No birds, no stock "nature ambience" packs. Wind beds outdoors, cabin hum inside cars, room tone indoors.
- Keep every download in its own folder (`sfx/kenney`, `sfx/bigsoundbank`, `sfx/mine`).

## Where sounds go
- A sound lands on the exact frame of the visible action: the crunch on the frame of the crash, the door on the
  frame it unlatches, every footstep on its foot plant. Work from the animation's own times (shot start + event time).
- Layer the big moments: a crash is a crunch + heavy metal + a little glass, each a few hundredths of a second apart.
- Big camera swings get a soft woosh whose peak (not its start) lands on the fastest part of the move.
  Use `"peak"` in the cue sheet.
- Engines and machines follow what is on screen: they fade when the camera climbs away, they speed up in a timelapse
  (`atempo`), and they stop when the shot changes place.
- Continuous beds (wind, hum) are laid with a fixed-count loop with fades. Never use a while loop: one that never
  advanced once filled the RAM and crashed the computer.
- Rhythmic effects (rumble strips) can be made from a real recording processed with ffmpeg
  (`tremolo`, `lowpass`), never from a synthesiser.
- Less is more: one clear sound per action beats five stacked ones. Nothing should cover the voice.

## Levels
- Voice: loudness-normalised to -14 LUFS (`loudnorm=I=-14:TP=-1.5`).
- Sound effects: the master gain is about 0.7, and each cue is set by hand (0.1 to 1.0).
- Music: about -21 LUFS for the stem, under the voice. Adjust it in the music picker by watching, not by numbers.
- Final: about -14 LUFS integrated, true peak under -1 dB, with a limiter at 0.89.
- Measure each stem and the final with `ebur128` and say the numbers. Audio can be measured but not heard by Claude:
  say so.

## Music
- The style must fit the story (western for a country road, light and playful for comedy). Never sad and never
  recognisable. Free or licensed tracks only, credited.
- Choose it with the picker: every track plays over the rendered video with the voice and sound effects, with a live
  volume slider. Then press Save as final, and the mix reads `music_choice.json`.
- Fade in 0.25 s and out over the last 1.2 s. Loop a short track instead of stopping it.

## Subtitles
- Word timings from the voice with Whisper (`tools/transcribe.py`). Compare every word with the script and fix
  mishearings (numbers, names, "guard rails"), so the subtitles match the script exactly.
- One word at a time, big white heavy font with a black outline and soft shadow, at about 70% of the height, with a
  small pop on each word (`tools/subs_overlay.js`).
- Make subtitles a separate transparent overlay and lay it on the clean picture with ffmpeg. Never bake them into the
  render: fixing a word must not need a re-render.

## Finishing checklist
1. The clean render's frame count equals the voice length × fps.
2. Overlay the subtitles, then the mix (`tools/mix_cues.py`), checking the duration.
3. Loudness numbers for voice, sound effects, music and final.
4. A contact sheet of the final (one frame a second) and close-ups of the key moments.
5. Spot-check sync: take a still at each big sound's time and see the action in it.
6. Say what was not checked.
