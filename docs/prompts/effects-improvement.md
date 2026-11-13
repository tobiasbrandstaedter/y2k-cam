# Prompt: improve and extend the retro effects

How to use: start a `general-purpose` agent (it has the browser tools; the `filters` agent does not) and paste everything below the line as its prompt. Commit the current state first, so the agent's changes show up as a clean diff.

---

You are taking the role of the `filters` agent for y2k, a private retro photo editor. Read `.claude/agents/filters.md` for your role, then work through this brief. Your job is to make the existing effects look more like real cameras of the era and to add a small number of new effects where something important is missing. Visual quality comes first, new features second.

## Read before you touch code

In this order:

1. `CLAUDE.md`: project rules, verification environment, code conventions.
2. `docs/specs/foto-editor.md`: the user's spec for the photo editor. Sections 3 (effects), 4 (overlays), 5 (presets) and 9 (quality rules) are your requirements. This spec wins over `PRODUKTVISION.md` for photo editing.
3. `docs/decisions/ADR-002-photo-pipeline.md`: the pipeline architecture. Do not break its invariants (listed below).
4. `docs/looks/references/README.md` and the image `user-reference-01-camcorder-digicam.png` next to it: the visual target the user picked. Look at the image yourself.
5. `docs/testing/photo-editor-2026-11-10.md`: what was tested and the known limits.
6. The code, in this order: `src/editor/effects.ts` (schema), `src/render/uniforms.ts` (schema to shader values), `src/render/shaders.ts` (GLSL), `src/render/renderer.ts` (pass chain), `src/render/overlay.ts` (camera overlays), `src/editor/presets.ts` (15 presets), and the tests next to them.

## What the user has said so far

These are the user's own reactions while trying the app. Treat them as taste guidance.

- An early version looked "too pixelated". The user wants soft, analog looking results, not visible blocks. Anything that looks digital (block artifacts, hard scanlines, speckle noise) must stay subtle.
- After that the camcorder look was "already OK", but colors should be "more washed out and faded", and the date and REC numbers and letters should be in the picture.
- The reference image shows: soft focus and slight horizontal smear, fine dense grain, muted color casts (warm orange, teal, slightly green), lifted blacks, small pixel font overlays in white, yellow or orange with a faint glow, a red REC dot, faint fine lines.
- Spec section 9: natural skin tones, no unnatural color areas, no exaggerated scanlines, no artificial looking grain, no excessive blur, no destroyed detail, no clipped overlays, no rendering artifacts. Every effect controllable in strength.

## How the pipeline works

Six WebGL2 passes in a fixed order, all in `src/render/renderer.ts`:

1. **color**: levels, exposure and white balance in linear light, tone regions (highlights, shadows, whites, blacks), brightness, contrast, RGB curves via a 256 entry LUT texture, saturation, vibrance, fade, matte, highlight roll-off, split toning, Vintage Color Cast with a YCbCr skin mask.
2. **signal**: edge distortion, VHS line shift, wobble and glitches, chromatic aberration, color bleeding (luma sharp, chroma smeared to the right), motion blur.
3. **gaussian** H/V: only when Gaussian Blur is on.
4. **soft** H/V: one small radius, shared by Soft Focus, Lens Blur and Vintage Lens Softness.
5. **glow**: down sample to a quarter, blur H/V, shared by Bloom, Halation, Lens Haze, Lens Softness and Lens Blur.
6. **composite**: soft focus, lens softness, lens blur, bloom, halation, haze, light leak, flash, flare, vignette, soft edges, overlay text, scanlines, analog noise, tracking lines, grain, dither, before/after split.

Invariants you must keep:

- **Schema drives everything.** Each effect and parameter is declared once in `src/editor/effects.ts`. The UI builds its controls from it, and `planPasses` in `uniforms.ts` turns it into uniforms. Every visible control must change the image. New parameters need a shader consumer.
- **Sizes relative to image height.** Radii, line counts and grain sizes are fractions of the output height, so preview and export look the same. Never use raw pixel counts or `gl_FragCoord` for anything visible.
- **Image space coordinates.** All framebuffer textures store the image top row at v = 0. Only the composite pass flips (`uFlip`) when it draws to the canvas. Export reads back without a flip.
- **Deterministic noise.** Use the integer `hash2` / `vnoise` helpers in `shaders.ts` with the grain seed. No `sin` based hashes, no `Math.random` in shaders or uniforms.
- **RGBA8 framebuffers.** No float targets (memory on iPhone, see ADR-002). Tonal work belongs inside the color pass where it runs in float.
- **Target is iOS Safari 17 WebGL2.** GLSL ES 3.00, `highp` is fine. No WebGL extensions you have not checked against caniuse for iOS 17. No WebGPU.
- **Performance budget.** Desktop Chrome: a full preview render at 1600 x 1200 under 30 ms, a 12 MP export under 2 s. The phone is several times slower, so leave margin. Skip passes nothing reads.
- **No new runtime dependency** without a short ADR next to ADR-002.

## Known weaknesses to fix

Ordered roughly by how much they hurt the look. Fix what you can, in this order, and say what you did not get to.

1. **VHS and camcorder looks are too subtle at screen size.** Scanlines at 480 lines fade to their average below 3 render pixels per line, to avoid moire. That is correct, but at preview size the VHS Tape preset then looks almost clean. Real VHS lost most horizontal detail: about 240 lines of luma resolution and far less chroma resolution. Make the softness and chroma loss carry the look, so it reads as VHS even when individual lines are not resolved. Keep the moire guard.
2. **Grain is plain value noise.** It reads as "noise", not film. Improve toward film grain: clumping, size that varies with exposure (bigger and more visible in midtones and shadows, little in clipped highlights), a slightly irregular structure. Keep mono and color modes, the seed, the three distributions and the sub-pixel amplitude scaling.
3. **Highlights and Shadows are global tone curves.** Strong values flatten local contrast. If you can do a cheap local version with the existing glow or soft texture as the local average, do it. Otherwise improve the global curves so strong values do not look flat.
4. **Bloom thresholds the already blurred image.** Correct is threshold first, then blur. Consider a bright pass in the glow down sample, but keep the haze and lens effects working, they need the unthresholded glow.
5. **One soft radius for three effects.** Soft Focus, Lens Blur and Vintage Lens Softness share the soft chain radius, which is driven by Soft Focus when it is on. Lens Blur in particular needs a much larger and progressive blur toward the edges. Find a cheap way to give them independent radii.
6. **Light Leak, Lens Flare and Lens Haze are simple shapes.** Leaks should look like light burning into film from the frame edge: soft, uneven, slightly streaky, hottest at the edge, with a color shift toward red and yellow at the core. The flare is three round ghosts. Make both read as optical, not as graphics.
7. **Digicam traits are missing.** Early digital cameras had over-sharpening halos around edges, highlights that clip with a color shift, purple fringing on high contrast edges, and fine luminance noise in the shadows. Old Sony Camera and 2000s Digital Camera would gain the most. Add what is needed as new effects or parameters.
8. **The Datumsstempel font.** All overlays use VT323. Digicam and film camera date stamps were orange or yellow seven segment digits with a soft bloom. A seven segment style for the digicam date format would be more authentic. Any font must be bundled locally with a license that allows redistribution (SIL OFL or similar), or drawn as shapes in Canvas 2D.
9. **Unused effects and casts.** No preset uses Gaussian Blur, Motion Blur, Lens Blur, Edge Distortion, Lens Flare, or the Olive Film and Sepia Light casts. Check that each of them looks good at its defaults. Where a preset would honestly benefit, use them, but do not add effects to presets just to use them.

## Extensions worth adding

Only after the weaknesses above, and only if they fit in the time:

- **Interlacing** (combing on horizontal edges, as in a paused camcorder frame). It is in the product vision as Baustein BS-9.
- **Head switching noise**: the distorted strip at the bottom edge of VHS frames.
- **Dust and scratches** for the film presets, very subtle by default, off by default.
- **Subtle JPEG compression** for the digicam presets, off by default and far below the point where blocks become visible. The user disliked pixelation, so be careful.

Each new effect: schema entry with German UI labels, defaults that look good, off by default unless it is a no-op at default, shader code, uniforms, and a mention in the effect list of your report.

## Presets

After the effects improve, retune the 15 presets in `src/editor/presets.ts` so each still matches its description in spec section 5. Keep ids and names. Presets must stay different from each other in real parameter values (there is a test). Pay special attention to skin tones on the portrait reference image; the Disposable Camera flash was already reduced once because faces went white.

## Verification

There is no iPhone in this project. Verify in the browser pane:

- Start the dev server with the Browser tool `preview_start` and the name `app` from `.claude/launch.json` (port 5173). The user may be using the visible tab; open your own tab with `tabs_create` for automated checks so you do not click around in their session.
- Test images: `docs/looks/references/user-reference-01-camcorder-digicam.png` (portrait collage, skin tones) and `spikes/testmedia/Image.jpg` (4032 x 3024 interior with EXIF; local only, gitignored). The dev server serves both from the project root.
- A hidden tab gets no animation frames, so the preview canvas may not redraw there. For measurements, import the modules directly in the page and render off screen, like this:

  ```js
  const { Renderer } = await import('/src/render/renderer.ts');
  const { EFFECTS, defaultState, applyPartial } = await import('/src/editor/effects.ts');
  const r = new Renderer(document.createElement('canvas'));
  r.setImage(await createImageBitmap(await (await fetch('/spikes/testmedia/Image.jpg')).blob()));
  const pixels = r.renderPixels(defaultState(), 1600, 1200, { date: new Date() });
  ```

- To look at results, draw `renderPixels` output into a canvas, put it in a fixed overlay div, take a screenshot, then remove the div. Compare before and after your change side by side, at screen size and as a 1:1 crop.
- Re-run the parameter harness: for every parameter of every effect, render once at default and once changed, and confirm the image changes. Earlier run: 176 variants, all with an effect (see the testing doc for the expected exceptions at small sizes).
- Check preview against export: an export rendered at preview size must match the preview almost exactly (last run: mean difference 0.016 of 255).
- Measure render times for the budget above and write them down.
- `pnpm lint`, `pnpm build` and `pnpm test` must pass. Add unit tests for any new pure logic (schema entries, uniform math, overlay layout).

## Rules

- Follow the user's global style rules summarized in `CLAUDE.md`: code and comments in English, German domain terms and UI labels stay German, never use em or en dashes anywhere, simplest thing that works, comments explain why, not what.
- Do not change UI layout or components beyond what new parameters need; the UI renders from the schema automatically.
- Do not commit. Leave everything in the working tree.
- Do not touch IndexedDB data in the user's browser. If a test needs stored presets, remove them afterwards.

## Deliverables

1. The code changes.
2. An updated `docs/looks/references/README.md` if your understanding of the reference changed, and a short reference sheet per device family you worked on in `docs/looks/` (what the real device did and which effect reproduces it).
3. A new test log `docs/testing/effects-<date>.md` with before and after observations, the harness result, preview against export, and render times.
4. A final report, under 500 words: what changed per weakness (done, partly, not done and why), new effects with their defaults, preset changes, measurements, and anything that needs a decision from the user.
