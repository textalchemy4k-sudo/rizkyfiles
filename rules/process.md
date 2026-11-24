# Process, quality bar, sound and delivery

## Order of work
1. Brief: read the script and the voice; get word timings (Whisper); write BRIEF.md with every must-have and one
   timed beat per line of the voice.
2. Analyse every reference at full size: extract frames, measure colours and motion, compare side by side; never guess.
3. Models and world first, each inspected from fixed views at full size.
4. Storyboard first: one still per beat, timed to the voice, on a sheet with time, line and transition. Get approval
   before animating.
5. Animate (shots with camera keys, performances, impacts, dissolves). Test frames across every shot.
6. Render frame-exact in chunks (each chunk's frame count verified), concatenate.
7. Subtitles as a separate transparent overlay (word by word), so fixes don't need a re-render.
8. Sound: voice at -14 LUFS; real sound effects on the exact visible moments; background music under the voice.
9. Check, then deliver.

## Quality bar
- Never send a render with a defect you can see; inspect every part, close-ups and a contact sheet first.
- Say plainly what was not checked (audio is measured, not heard; motion seen as stills).
- Every frame is a pure function of the frame number (no clock, seeded randomness).
- Keep the user's corrections as rules (they apply to every future video).

## Sound
- Never AI-generated sound effects: real recordings (CC0 libraries such as BigSoundBank, Kenney, OpenGameArt, or the
  creator's own files), each placed on the exact moment it happens on screen (saw cutting, cars passing, crash
  crunch, splash, door, footsteps, whooshes on big camera moves).
- Background music sits under the voice, loud enough to set the mood without covering speech (about -21 LUFS for
  the music stem, adjust by ear). Pick it by watching the rendered video with each track (music picker).
- Final loudness about -14 LUFS integrated.
