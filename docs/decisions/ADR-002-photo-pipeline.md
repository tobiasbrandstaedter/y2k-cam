# ADR-002: Photo editing pipeline

Date: 2026-11-10
Status: accepted

## Context

`docs/specs/foto-editor.md` asks for a non-destructive retro photo editor with color grading, color casts, film grain, six VHS components, light and lens effects, optics, device overlays, 15 presets, undo and redo, a before/after slider and export to JPEG, PNG and WebP. It must run on desktop and on iOS Safari 17 (QA-6), and export must match the preview. ADR-001 already fixed TypeScript, Vite, Preact, WebGL2 and IndexedDB. This ADR fixes how the photo pipeline is built on top of that.

## Decision

**Parameters, not pixels.** The edit is one plain object (`EditState`): one entry per effect with an `enabled` flag and its values, plus overlay settings and RGB curves. The original `ImageBitmap` is never changed. Undo and redo are snapshots of `EditState`. Presets are partial `EditState` objects merged over the defaults.

**One schema drives UI and shader.** `src/editor/effects.ts` lists every effect with its parameters, ranges and defaults. The UI renders sliders from it; the renderer reads the same keys. A slider without a shader consumer would be a bug, and the preset test checks every preset key against the schema.

**Fixed pass order, WebGL2, one context.**

| Pass | Input | Does |
|---|---|---|
| color | source (mipmapped) | levels, exposure, white balance, tone regions, brightness, contrast, curves LUT, saturation, vibrance, fade, matte blacks, highlight roll-off, split toning, color cast with skin protection |
| signal | color | edge distortion, VHS line shift and wobble, chromatic aberration, color bleeding, motion blur |
| gaussian H/V | signal | only when Gaussian Blur is on |
| soft H/V, lens H/V | previous | Soft Focus with its own radius at full size; Lens Blur and Vintage Lens Softness at half size (amended 2026-11-10) |
| glow and bright down/H/V | previous | quarter resolution, large radius; glow feeds Lens Haze and the lens effects, bright is thresholded before the blur and feeds Bloom (rgb) and Halation (alpha) |
| composite | previous, soft, glow, overlay | soft focus, lens blur, lens softness, bloom, halation, haze, light leak, flash, flare, vignette, soft edges, overlay text, scanlines, analog noise, tracking lines, grain; before/after split |

Blur and glow passes are skipped when nothing reads them.

**Sizes relative to image height.** Every radius, line density and grain size is expressed as a fraction of the output height. Preview and export use the same parameters and differ only in pixel count. Grain finer than a pixel is rendered at pixel scale with its amplitude reduced by the averaging factor, so preview grain matches downscaled export grain.

**Deterministic noise.** All noise uses an integer hash (PCG style) on `uvec` coordinates plus the user seed. Same seed, same grain, on every GPU.

**Render resolution.** The source is uploaded once at full resolution (capped at `MAX_TEXTURE_SIZE`) with mipmaps. The preview renders at display size times device pixel ratio times zoom, capped at the source size. Changing a slider re-renders, it never re-uploads.

**Intermediate precision.** Framebuffers are RGBA8. Half float would need four full size targets of 8 bytes per pixel, about 380 MB at 12 MP, which an iPhone does not reliably give a web page. All tonal work happens inside the first pass in float, so there is only one quantization step that matters. The composite pass adds half a code value of noise as dither against banding.

**Overlays.** Drawn with Canvas 2D into a texture at render size, composited in the composite pass before scanlines, noise and grain, so they look recorded. Font is VT323 (SIL OFL 1.1) bundled through `@fontsource/vt323`, no CDN at runtime (QA-7). Pixelation is done by drawing at reduced size and scaling up without smoothing.

**Export.** The composite pass renders into a framebuffer at export size, `readPixels` copies it into a 2D canvas, `toBlob` encodes once. Export area is capped at 16,777,216 pixels, the Safari canvas limit; the UI says when it downscales. "Optimize file size" searches the quality value until the file fits the target. "Keep metadata" copies the source JPEG's EXIF segment into a JPEG export with the orientation tag set to 1, since the pixels are already rotated. PNG and WebP export without metadata. The before/after export draws original and result side by side.

**User presets and favorites** are stored in IndexedDB through `idb` (ADR-001).

**No Web Worker.** All heavy work is on the GPU. The only CPU work is curve LUTs (256 entries), overlay drawing and EXIF parsing. A worker would add messaging for no measurable gain. Revisit if export encoding blocks the UI noticeably on a phone.

## Consequences

- Adding an effect means: one schema entry, shader code, a preset value if wanted. The UI follows automatically.
- The composite shader is large. Uniform driven `if` branches keep it readable; on desktop the full chain at 12 MP stays well under the QA-2 budget (to be measured, see `docs/testing/`).
- Highlights and shadows pick their tone region from a local average (a mip level of the source covering about 3 % of the height), so strong values keep local contrast; very strong values can leave soft halos at large bright and dark boundaries (amended 2026-11-10).
- Preact instead of React. The spec prefers React; Preact has the same component and hook API and is already the project's choice (ADR-001).

## Evidence

- Desktop measurements from the image spike: four WebGL2 passes at 12 MP in 28 to 44 ms (`docs/testing/spike-protocol.md`).
- Safari canvas area limit of 16,777,216 pixels: WebKit `CanvasRenderingContext2D` maximum, documented in caniuse notes for canvas and repeatedly in WebKit bug reports.
