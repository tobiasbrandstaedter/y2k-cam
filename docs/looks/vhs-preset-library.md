# Preset library: old video recorders and tapes

The preset library reads as a shelf of old recording devices and tapes from the 1990s and early 2000s: VHS decks, analog camcorders, MiniDV. Film and early digicam looks stay as a secondary group. Audit that led here: `docs/testing/preset-audit-2026-11-10.md`. Device background: `docs/looks/vhs-camcorder.md`.

## Rules for every preset

- One clear creative job. A preset that only shifts the color temperature of another one does not get in.
- Built from the existing Bausteine and parameters in `src/editor/effects.ts`. No preset specific code.
- Distinct: in the audit harness, color distance plus texture distance to the nearest other preset at 8 or more (see the testing doc for the measure).
- Video presets carry their look through tape loss (Band-Auflösung, Color Bleeding, chroma noise), not through hard lines. Scanlines stay low, because at phone preview size they fade to their average anyway.
- Skin stays skin: no preset pushes faces green, gray or orange beyond what the device did.

## Styles

| Style | What makes it | Presets |
|---|---|---|
| A Classic VHS | ~240 lines luma, far less chroma, red bleed to the right, compressed whites, chroma noise, short dropouts, mild line jitter, a tracking band at the bottom | VHS Tape |
| B Heavy VHS | the same chain turned up: strong line shifts and wobble, wide tracking noise band, head switching strip, heavy chroma noise, colors drifted to cold green; still reads as tape, no RGB split blocks | Heavy VHS Distortion |
| C Soft VHS | low contrast pastel, soft glow, gentle tape texture, almost no disturbances | Soft VHS Memories |
| D 90s Home Video | camcorder auto white balance and exposure, slightly inaccurate color, Hi8 class luma, date stamp and REC | Vintage Camcorder, Old Family Video |
| E Early 2000s MiniDV | digital: in camera sharpening, early clipping, mild DCT artifacts, reduced chroma resolution, interlacing, no tape noise, DV OSD | MiniDV |
| F VHS Summer Memories | warm summer color, faded highlights, a little yellow green, soft contrast, VHS texture, date | Summer Vacation 1997 |
| Night | camcorder gain in the dark: crushed blacks, heavy luma and chroma noise, blooming lights, flicker | VHS Night Recording |

## Categories

Order in the preset panel, each preset with name, description, thumbnail, star and the shared Intensität slider.

| Category | Presets |
|---|---|
| VHS | VHS Tape, VHS Night Recording |
| Classic Camcorder | Vintage Camcorder, Old Family Video |
| Heavy Distortion | Heavy VHS Distortion |
| Soft & Faded | Soft VHS Memories, Faded Film, Warm Nostalgia, Cool Vintage |
| Summer Memories | Summer Vacation 1997, Beach Memories, 90s Summer, Analog Summer 2003 |
| Early Digital | MiniDV, 2000s Digital Camera, Old Sony Camera |
| Film & Experimental | Disposable Camera, Expired Film, Pink Film |

The brief named the last category "Experimental". It is "Film & Experimental" here, because Disposable Camera is the Einwegkamera Look-Familie (LK-4), not an experiment.

## How the presets differ

Video presets, from clean to worn:

| Preset | Color | Tape and signal | Overlay |
|---|---|---|---|
| MiniDV | punchy, slightly magenta, clipped highlights | sharp luma, soft chroma, interlacing, DCT mosquito noise, no tape noise | rec counter, SP, battery, stacked date |
| Vintage Camcorder | warm, bright, saturation kept | Hi8 luma, VHS chroma, light noise, tracking hint at the bottom | yellow date and time, REC |
| Summer Vacation 1997 | golden, faded highlights, a touch of green in the shadows | VHS texture, light head switching | white `JUL. 14 1997` |
| VHS Tape | neutral warm, whites compressed, reds kept | full VHS chain, dropouts, tracking band | PLAY, counter, SP |
| Soft VHS Memories | pastel peach and lavender, low contrast, glow | soft, almost no disturbances | none |
| Old Family Video | faded to brown, lifted blacks | soft, interlacing, noise, head switching | orange stacked date, REC |
| VHS Night Recording | dark, desaturated, magenta drift | heavy luma and chroma noise, flicker, blooming lights | white date, REC |
| Heavy VHS Distortion | cold green, washed out | strong jitter, wobble, glitches, wide tracking band, head switching | PLAY, counter, LP |

## Parameter changes

Only presets that changed. Values are the UI values from `src/editor/presets.ts`; "removed" means the effect is no longer switched on by the preset.

| Preset | Changes |
|---|---|
| VHS Tape | grading: saturation -18 to -8, contrast -12 to -10, fade 24 to 12, matte 15 to 10, new highlights -10, temperature 4, tint 3, rolloff 35. scanlines opacity 30 to 20, width 55 to 50, variation 45 to 35. VHS Distortion shift 45 to 30, wobble 30 to 20, glitch 25 to 12, tracking 35 to 25, position 90 to 92. Chromatic Aberration 45 to 18. Analog Noise 45/45/30 to 32/25/20, chroma 40. Color Bleeding 55/45 to 45/40. Band-Auflösung 70/80/35 to 60/75/35. Kopfumschaltung 45 to 40. Soft Focus removed (the tape blur is enough) |
| Vintage Camcorder | grading: saturation -26 to +6, contrast -20 to -8, fade 26 to 10, matte 18 removed, temperature 10 to 14, new exposure +0.3, highlights -5, tint 5, vibrance 8, rolloff 25 to 40. Split toning highlights 45° at 15. Warm Yellow cast removed. scanlines opacity 18 to 15, variation 30 to 25. Analog Noise 25/20/15 to 20/10/12, chroma 25. VHS Distortion 25/15/8 to 18/10/5, tracking 15 at 94. Band-Auflösung 45/55/20 to 40/55/30. Soft Focus 35/40 to 15/35. Color Bleeding 30/30 to 35/30. Chromatic Aberration and Vignette removed |
| Old Family Video | grading: saturation -20 to -28, contrast -15 to -18, temperature 15 to 18, fade 30 to 28, matte 25 to 22, new exposure +0.1, rolloff 30. Split toning shadows 25° at 20. Muted Brown cast 30 to 40, shadows 90, highlights 50. scanlines opacity 15 to 12. Analog Noise 20/10/20 to 22/18/25, chroma 35. New VHS Distortion 15/15/4. Band-Auflösung 50/60/15 to 60/70/15. Color Bleeding 30/25 to 40/35. New Kopfumschaltung 30. Soft Focus, Lens Softness and Chromatic Aberration removed (three blurs stacked). Overlay: stacked `mon` date in orange bottom right, REC top left |
| MiniDV | grading: contrast 5 to 12, saturation -5 to +16, temperature -6 to +4, highlights 10 removed, new vibrance 10, tint 6, whites 5. New Digicam-Sensor sharpen 50, clip 30, fringe 15, noise 12. New JPEG 30. Band-Auflösung 15/35/15 to 10/45/5. Interlacing shift 25 to 30. scanlines opacity 12 to 8. VHS Distortion, Analog Noise, Soft Focus and Color Bleeding removed |
| Beach Memories | grading: exposure 0.15 to 0.2, temperature 20 to 2, highlights -15 to -20, saturation -10 to -18, fade 10 to 18, new tint -4, contrast -10, rolloff 35. Split toning highlights 48° at 32 to 55° at 26, shadows 130° at 22 to 165° at 34. Halation 20 to 12 |
| 90s Summer | grading: temperature 28 to 32, tint 6 to 4, saturation 8 to 14, contrast -18 removed, new vibrance 10, exposure 0.15 to 0.1, highlights 10 to 5, fade 15 to 10, rolloff 25 to 30. Split toning highlights 38° at 25 to 32° at 30, new shadows 20° at 10. Halation 25/60 to 30/58. Vignette 18 to 20 |
| Faded Film | grading fade 45 to 40, matte 40 to 25. Levels output black 8 removed |

New presets, full profile in `src/editor/presets.ts`: VHS Night Recording, Heavy VHS Distortion, Soft VHS Memories, Summer Vacation 1997.

Kept unchanged: 2000s Digital Camera, Old Sony Camera, Expired Film, Disposable Camera, Warm Nostalgia, Cool Vintage, Pink Film, Analog Summer 2003 (only the category is new).

## Engine changes

- **Analog Noise, new parameter Farbrauschen (`chroma`, 0 to 100, default 25).** Coarse color noise smeared along the line (about 18 % of the luma noise frequency horizontally), stronger in dark areas, plus a slow hue drift down the frame. Replaces the faint color tint on the luma noise.
- **Dropouts** (Analog Noise, Horizontale Störungen) are short white flecks with a tail that fades to the right, at random positions, instead of full width hairlines.
- **Luma noise** is slightly longer than high (0.6 aspect), like tape snow.
- **Tracking noise** (VHS Distortion, Tracking-Linien) comes as short horizontal dashes instead of square dots.

All four only touch the composite pass, use the existing integer hashes with the grain seed and stay in RGBA8. No new texture reads.

## Intensität

One slider in the preset panel, 0 to 100 %, stored as `intensity` in the edit state (so it is undoable and saved with user presets, and applying a preset resets it to 100).

The renderer draws `withIntensity(state)` (`src/editor/effects.ts`):

- every strength parameter moves linearly toward its neutral value: the default for the effects that are on by default (their defaults are no-ops), 0 for all others
- parameters marked `shape` in the schema stay as they are: hues, sizes, positions, thresholds, line counts, seeds, the overlay's look. A VHS preset at 40 % is the same VHS look, weaker, not a different one
- selects, toggles and texts stay
- RGB curves move toward the diagonal
- at 0 every effect that is off by default is switched off, so the result is the original photo; above 0 the camera overlay stays fully visible

The individual sliders keep showing the preset's values; the scaling happens only on the way to the renderer. This is LA-3 from PRODUKTVISION and the Intensität requirement of spec section 6.

## Not covered by the presets

- Rounded frame corners and dark boxes behind overlay text (reference 3). Still open, see `docs/testing/effects-2026-11-10.md`.
- The burned in camcorder date stays sharper than the tape picture, because overlays are composited after the signal pass.
