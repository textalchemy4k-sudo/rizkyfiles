# GitHub skills used to build these shorts

These are the open-source skills and repos that went into making the Rumble Strips short and this kit. Each folder
here is an unchanged copy with its own licence file. Install a skill by copying its folder into `~/.claude/skills/`
(Windows: `C:\Users\<you>\.claude\skills\`), or install the latest version from the link.

| Folder | What it is | What it was used for | Licence | Source |
|---|---|---|---|---|
| `cook/` | The Cook Loop: long autonomous build, render, compare and fix runs against reference images or videos. | The working loop: brief, reference analysis, stills every round, fresh-eyes critics, the stills gate before the final render. | MIT | https://github.com/Leonxlnx/cook |
| `threejs-skills/` | 13 three.js skills: fundamentals, geometry, materials, lighting, textures, shaders, post-processing, animation, interaction, loaders, performance and more. | Modelling the world and objects from code, lights and shadows, texturing, shaders. | MIT | https://github.com/CloudAI-X/threejs-skills |
| `3d-web-experience/` | A skill for 3D web experiences (part of claude-code-templates). | Early direction for the 3D world in the browser. | MIT | https://github.com/davila7/claude-code-templates |
| `img2threejs/` | Rebuilds an object from a reference photo as a procedural three.js model, with staged passes and review gates. | Method for modelling objects from photos (cars, saw, props) part by part. | Apache-2.0 | https://github.com/img2threejs/img2threejs |
| `watch-skill/` | Lets Claude "watch" a video: frames, OCR, transcript, index. | Analysing the reference shorts frame by frame. The skill files need the Watch Skill tool installed (see its page). | MIT | https://github.com/oxbshw/watch-skill |

## Linked only (not copied)

| Repo | What it is | Why it is only linked |
|---|---|---|
| https://github.com/dgreenheck/webgpu-claude-skill | The WebGPU + three.js TSL skill (node materials, compute shaders, post-processing). It was used for the WebGPU renderer, TSL grass and materials. | The repo has no licence file, so it can't be redistributed. Install it from the link. |
| https://github.com/Noniv/abyssal-garden | An underwater world made entirely in code with WebGPU, in one HTML file (MIT). | It is a reference project to study (how far code-only worlds can go), not a skill. |
| https://github.com/mrdoob/three.js | three.js itself (MIT). | It is already bundled in each engine's `vendor/` folder. |

## How they fit together
- The **toon skills in this pack** hold the style, rules and working engines.
- **cook** drives the long build-and-review loop.
- The **three.js / WebGPU skills** are the reference for the 3D code itself.
- **img2threejs** is the method for turning a photo into a model.
- **watch-skill** is used to study reference videos.
