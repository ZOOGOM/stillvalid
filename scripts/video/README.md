# scripts/video

Scripts used to produce the StillValid demo video. Written against a local
workspace at `/Users/zoogom/stillvalid-video` (hard-coded paths in render.mjs,
card.mjs, subs_render.mjs are the paths at authoring time; adjust before reuse).
Recordings, rendered overlays, frames, audio and the final video are NOT in this repo.

- tools/rec.mjs: records the app walkthrough in a headless browser.
- tools/grid.py: builds a contact-sheet grid of frames for review.
- tools/card.mjs, tools/cards.mjs: screenshot the title/info cards from card/card.html.
- card/card.html: card template.
- overlays/src/: HTML/CSS/JS overlays (intro, outro, panel, env, cards, bokeh); render.mjs renders them to frames.
- build/column.py: lays out the column/timeline of segments.
- build/subs.py, build/subs_render.mjs: generate and render subtitles.
- build/audio.py: builds the audio track; build/t0.py: computes start offsets.
- build/compose.py: composes recording, overlays, subtitles and audio into the final video.
- world3d/p*.js: Three.js scene parts (earth, city, cafe, phone, post, timeline, constants); the large p3_assets.js is excluded.

Order: tools/rec.mjs -> tools/card(s).mjs -> overlays/src/render.mjs -> build/column.py -> build/subs.py -> build/subs_render.mjs -> build/audio.py -> build/t0.py -> build/compose.py.

Added after the first commit: `tools/range_render.mjs` renders a frame range of the 3D film; `build/compose_music.py` synthesizes the background music and mixes it with the narration; `build/compose.py` builds the T1 and T2 masters.
