# Preset audit, 2026-11-10

Audit of the 15 built in presets against the new creative direction: the app as a collection of old video recorders and tapes (VHS, camcorder, MiniDV), with the film and digicam looks kept as a secondary group. Direction and the final library: `docs/looks/vhs-preset-library.md`.

Environment: desktop Chrome in the embedded browser pane of the Claude desktop app, Windows 11. Not tested on iOS Safari (see `CLAUDE.md`, Verification environment).

## Method

Harness: `spikes/preset-audit/` (start with the `preset-audit` launch configuration, then open `/preset-audit/?view=grid&set=old`). It renders every preset of the baseline pipeline (a copy of `src/` taken before this rework, local only, `spikes/preset-audit/baseline/`) and of the current `src/` on the same eight scenes, and measures them.

Scenes. Two real photos, six synthetic stand ins (crude on purpose: they test tonal range, bright sources, shadow noise and fine detail, not realism):

| Scene | Source |
|---|---|
| Porträt | `docs/looks/references/user-reference-01-camcorder-digicam.png`, real, four portrait panels |
| Strand | synthetic: sky, sea, sand, two figures with light and dark skin |
| Landschaft | synthetic: sky, clouds, hills, trees, house |
| Sonnenuntergang | synthetic: gradient sky, bright sun, reflections, black silhouette |
| Innenaufnahme | `spikes/testmedia/Image.jpg`, real, 4032 x 3024 |
| Nacht | synthetic: near black sky, lit windows, street lamps, red neon |
| Gruppe | synthetic: six figures with six skin tones |
| Feine Details | synthetic: zone plate, line pairs, small text, color patches, gray ramp, red on blue |

Missing: a real daylight portrait of a single person in full frame, a real group photo, a real night photo. The reference collage stands in for the portrait.

Numbers, at 240 px render height, averaged over the eight scenes:

- **toOrig**: mean absolute difference to the original after a 4 x 4 box average (0 to 255). Color and tone, little noise.
- **nearest**: the other preset with the smallest mean difference (same measure). Below about 8 the two read as variants of one look in a side by side.
- **dSat**: saturation relative to the original. **detail**: fine luma detail kept, relative to the original.

## Baseline numbers

| Preset | toOrig | nearest (distance) | dSat | detail |
|---|---|---|---|---|
| 2000s Digital Camera | 14.2 | Pink Film (7.6) | 0.99 | 0.61 |
| Vintage Camcorder | 19.8 | Old Family Video (7.0) | 0.58 | 0.40 |
| Beach Memories | 10.0 | 90s Summer (7.3) | 1.08 | 0.46 |
| Faded Film | 24.3 | Old Family Video (12.7) | 0.40 | 0.35 |
| Old Sony Camera | 16.6 | Analog Summer 2003 (15.0) | 1.09 | 0.88 |
| MiniDV | **4.8** | Beach Memories (10.5) | 0.86 | 0.53 |
| 90s Summer | 10.5 | Beach Memories (7.3) | 1.06 | 0.50 |
| Expired Film | 20.6 | Old Family Video (10.2) | 0.90 | 0.51 |
| Disposable Camera | 26.5 | Warm Nostalgia (25.7) | 1.01 | 0.48 |
| VHS Tape | 15.4 | Old Family Video (**5.1**) | 0.54 | 0.63 |
| Warm Nostalgia | 14.6 | Vintage Camcorder (8.1) | 0.97 | 0.39 |
| Cool Vintage | 13.7 | VHS Tape (9.2) | 0.80 | 0.44 |
| Pink Film | 11.6 | 2000s Digital Camera (7.6) | 0.90 | 0.43 |
| Old Family Video | 15.8 | VHS Tape (5.1) | 0.61 | 0.36 |
| Analog Summer 2003 | 14.3 | 2000s Digital Camera (7.8) | 1.21 | 0.47 |

Closest pairs: VHS Tape / Old Family Video 5.1, Vintage Camcorder / Old Family Video 7.0, Beach Memories / 90s Summer 7.3, Vintage Camcorder / VHS Tape 7.4.

Sheets: `preset-audit/old-vhs.jpg`, `old-warm.jpg`, `old-film.jpg`.

## Audit table

Scores 1 to 10. VHS-Authentizität rates how much of an old video recording the preset carries; film and digicam presets score low on it by design, which is not a defect.

| Preset | Stil | Qualität | VHS | Eigenst. | Technik | Probleme | Maßnahme |
|---|---|---|---|---|---|---|---|
| 2000s Digital Camera | Early digital, warm | 7 | 2 | 6 | 8 | close to Pink Film and Analog Summer 2003 in color, kept apart by date stamp and sensor traits | KEEP |
| Vintage Camcorder | Camcorder | 6 | 6 | 4 | 7 | saturation -26 plus fade 26 plus matte 18 turn every scene the same muddy gray; night scenes lift to flat gray; same recipe as Old Family Video | IMPROVE: 90s Home Video, camcorder white balance, slight overexposure, moderate saturation |
| Beach Memories | Film, beach | 7 | 2 | 4 | 8 | warm cast and softness almost the same as 90s Summer | IMPROVE: pale, green shadows, cyan blues, less warmth |
| Faded Film | Film, faded | 6 | 2 | 6 | 7 | blacks lifted three times (levels out black, fade, matte); night and indoor scenes go flat gray with no black left | IMPROVE: one way of lifting blacks, keep a dark point |
| Old Sony Camera | Early digital, cool | 8 | 1 | 8 | 8 | none worth changing | KEEP |
| MiniDV | Digital camcorder | 4 | 3 | 3 | 5 | barely differs from the original (toOrig 4.8); tape line jitter and analog snow on a digital format; no DV traits (edge sharpening, clipped highlights, DCT artifacts) | IMPROVE: real early 2000s DV look |
| 90s Summer | Film, summer | 7 | 2 | 4 | 8 | close to Beach Memories | IMPROVE: golden orange, a bit more punch, halation |
| Expired Film | Film, damaged | 7 | 1 | 7 | 7 | none worth changing | KEEP |
| Disposable Camera | Einwegkamera | 7 | 1 | 9 | 8 | none worth changing | KEEP |
| VHS Tape | VHS | 6 | 6 | 3 | 6 | closest pair of the library with Old Family Video; thin white full width streaks look digital; Chromatic Aberration 45 on top of Color Bleeding doubles the fringes; no chroma noise in the engine; cool gray, no VHS tonal character | IMPROVE: becomes the Classic VHS reference |
| Warm Nostalgia | Soft warm grade | 6 | 2 | 5 | 7 | near Vintage Camcorder, which moves away with its rework | KEEP |
| Cool Vintage | Soft cool grade | 7 | 2 | 6 | 7 | none worth changing | KEEP |
| Pink Film | Film, pink | 7 | 1 | 5 | 7 | near 2000s Digital Camera in tone, but the pink cast is its own | KEEP |
| Old Family Video | Camcorder | 6 | 6 | 3 | 6 | three blurs stacked (Soft Focus, Lens Softness, Band-Auflösung); same gray as Vintage Camcorder and VHS Tape | IMPROVE: aged VHS-C family tape, warm brown, REC, more tape wear |
| Analog Summer 2003 | Film, summer | 7 | 2 | 5 | 7 | near 2000s Digital Camera, light leak keeps it apart | KEEP |

No exact duplicates. No preset is REMOVE or MERGE material: all 15 are mandatory in `docs/specs/foto-editor.md` section 5, and after the reworks above none of them is a near copy of another.

## Library gaps against the new direction

| Style | Covered before | Gap |
|---|---|---|
| A Classic VHS | VHS Tape, but weak and gray | rework VHS Tape |
| B Heavy VHS | nothing | ADD Heavy VHS Distortion |
| C Soft VHS | nothing; the soft grades have no video texture | ADD Soft VHS Memories |
| D 90s Home Video | Vintage Camcorder, Old Family Video, both gray | rework both into two clearly different camcorders |
| E Early 2000s MiniDV | MiniDV, but almost the original | rework MiniDV |
| F VHS Summer Memories | only film summer looks | ADD Summer Vacation 1997 |
| Dark scenes | every video preset turns night gray | ADD VHS Night Recording |

Candidates from the brief that were not added, and why:

| Candidate | Decision |
|---|---|
| Classic VHS 1998 | is the reworked VHS Tape |
| Old Family Video | exists, reworked |
| Retro Home Movie | is the reworked Vintage Camcorder |
| Glitchy VHS Tape | merged into Heavy VHS Distortion; two heavy presets would be one look at two strengths, which the Intensität slider covers |
| Faded Analog Tape | covered by Soft VHS Memories (soft, faded) and Old Family Video (aged tape) |
| Beach Camcorder 2002 | would differ from MiniDV mostly in color temperature |

## Engine findings

The VHS engine already simulates far more than lines: Band-Auflösung (separate luma and chroma bandwidth, edge ringing), Color Bleeding, Chromatic Aberration, Interlacing, Kopfumschaltung, line jitter, glitches, a tracking band, scanlines with a moire guard, luma noise, dropout streaks and brightness flicker. Missing or weak:

1. **Chroma noise.** Only a faint color tint on the fine luma noise. Real VHS chroma noise is coarse, smeared along the line and strongest in dark, flat areas. Biggest missing VHS trait.
2. **Color instability.** No slow hue drift down the frame.
3. **Dropouts** are full width hairlines of constant brightness, which reads as a digital overlay. Real dropouts are short white flecks with a fading tail.
4. **Luma noise** is isotropic. Tape snow is slightly longer than high.
5. **No Intensität control** (spec 6, PRODUKTVISION LA-3).
6. **No preset categories, no visible description** on touch devices (the hint only shows as a hover title).

## Revision list

1. Engine: chroma noise and hue drift as a new Analog Noise parameter `chroma` (Farbrauschen); comet shaped dropouts; slightly stretched luma noise.
2. Intensität 0 to 100 % over the whole edit, non-destructive, see the library doc.
3. Rework: VHS Tape, Vintage Camcorder, Old Family Video, MiniDV, Beach Memories, 90s Summer, Faded Film.
4. Add: Heavy VHS Distortion, Soft VHS Memories, Summer Vacation 1997, VHS Night Recording.
5. Categories and descriptions in the preset panel.
6. Re-run the harness: nearest distance for every preset at 8 or more, comparison sheets original / before / after.

Results of steps 1 to 6 are in the second half of this file.

---

# Results after the rework

Same harness, same scenes, same 240 px measure. Library and parameter changes: `docs/looks/vhs-preset-library.md`.

## Library

| List | Presets |
|---|---|
| Kept | 2000s Digital Camera, Old Sony Camera, Expired Film, Disposable Camera, Warm Nostalgia, Cool Vintage, Pink Film, Analog Summer 2003 |
| Improved | VHS Tape, Vintage Camcorder, Old Family Video, MiniDV, Beach Memories, 90s Summer, Faded Film |
| Merged or removed | none (all 15 are mandatory in spec section 5) |
| New | VHS Night Recording, Heavy VHS Distortion, Soft VHS Memories, Summer Vacation 1997 |

19 presets in 7 categories.

## Distinctness

Nearest other preset, color distance plus texture distance (8 x 8 block luma detail energy). Below 8 the two read as variants of one look.

| Preset | Before: nearest (sum) | After: nearest (sum) |
|---|---|---|
| VHS Tape | Old Family Video (9.5) | Heavy VHS Distortion (9.7) |
| Vintage Camcorder | Old Family Video (**7.8**) | Pink Film (9.4) |
| Old Family Video | Vintage Camcorder (**7.8**) | Soft VHS Memories (8.5) |
| MiniDV | Beach Memories (12.9) | Old Sony Camera (13.5) |
| Beach Memories | 90s Summer (8.3) | Summer Vacation 1997 (9.2) |
| 90s Summer | Beach Memories (8.3) | Vintage Camcorder (13.8) |
| Faded Film | Old Family Video (14.0) | Old Family Video (8.7) |
| VHS Night Recording | | VHS Tape (12.4) |
| Heavy VHS Distortion | | VHS Tape (9.7) |
| Soft VHS Memories | | Old Family Video (8.5) |
| Summer Vacation 1997 | | Beach Memories (9.2) |

Every preset is now at 8.5 or more. The color only distance (the first table) understates the video presets: VHS Tape and Heavy VHS Distortion share part of their grade and differ mainly in line damage, which a 4 x 4 average hides. Side by side they are clearly different (sheet `new-1-video-soft.jpg`).

MiniDV moved from 5.0 to 13.1 away from the original, it no longer looks like an unedited photo. Saturation relative to the original: the three old VHS and camcorder presets sat at 0.54 to 0.61, all the same gray; the video presets now range from 0.55 (Heavy VHS Distortion) to 0.99 (Vintage Camcorder, Summer Vacation 1997), MiniDV 1.18.

## Visual tests

Sheets in `docs/testing/preset-audit/`:

- `new-1-video-soft.jpg`, `new-2-summer-digital-film.jpg`: all 19 presets on seven scenes
- `compare-<preset>.jpg`: original, baseline preset, current preset on all eight scenes, for the seven reworked and the four new presets
- `old-*.jpg`: the baseline sheets from the audit

| Check | Result |
|---|---|
| VHS look recognizable at once | yes for all eight video presets, at thumbnail size (190 px) as well; carried by chroma smear, softness and the overlay rather than by lines |
| Intensity appropriate | Soft VHS Memories and Vintage Camcorder subtle, VHS Tape and Old Family Video medium, Night and Heavy strong. Heavy still keeps faces and text recognizable |
| Color shifts believable | warm, brown, pastel and cold green drifts all stay within what tape and camcorder white balance did; reds keep their color on VHS Tape, as on real tape |
| Noise realistic | chroma noise reads as colored mottling in dark flat areas (night scene at 600 px), luma noise as fine snow; dropouts are short flecks |
| Disturbances analog | line jitter, wobble, tracking dashes and the head switching strip; no block or RGB split glitches |
| Too artificial | the tracking band of Heavy VHS Distortion is the most graphic element; still dashes, not pixels |
| Details kept | detail chart rendered at 450 px height, text block cropped: text of about 8 px height stays readable on VHS Tape, Old Family Video, VHS Night Recording, Heavy VHS Distortion and Soft VHS Memories; 6 px text is only readable on the original. Zone plate and line pairs lose the finest rings, as tape resolution should |
| Skin tones | six skin tones on the group scene keep their order and stay skin colored on all presets; Heavy shifts the darker tones slightly green, by design |
| Night scene | before, every video preset lifted the night sky to flat gray; VHS Night Recording keeps it dark with visible gain noise |

Limits: six of eight scenes are synthetic. No real daylight portrait in full frame, no real group or night photo. The portrait collage and the interior are the only real photos.

## Intensität in the app

Checked in the app (`pnpm dev`, desktop Chrome, then 375 x 812 emulation): VHS Tape applied, description shown above the slider, slider at 26 % gives a visibly weaker look with the overlay still on, the effect sliders keep the preset values, undo restores 100 %. No console errors. Stars visible on touch layout (`hover: none`). Unit tests cover 0 % (original), 50 % (halved strengths, shape parameters and toggles untouched), curves and storage.

## Render times

Desktop Chrome, render to canvas at 1600 x 1200 synced with a one pixel `readPixels`, median of 7, second series (the first includes shader compilation).

| Preset | Baseline ms | After ms |
|---|---|---|
| VHS Tape | 6.9 | 4.8 |
| Vintage Camcorder | 7.0 | 6.1 |
| Old Family Video | 8.0 | 4.5 |
| MiniDV | 5.5 | 3.7 |
| Beach Memories | 6.2 | 6.9 |
| 90s Summer | 4.6 | 4.9 |
| Faded Film | 4.0 | 3.8 |
| VHS Night Recording | | 4.4 |
| Heavy VHS Distortion | | 5.0 |
| Soft VHS Memories | | 6.0 |
| Summer Vacation 1997 | | 4.0 |

All far under the 30 ms budget. VHS Tape and Old Family Video got faster because the extra blur chains (Soft Focus, Lens Softness) are gone. The 12 MP export was not re-measured; the shader changes add arithmetic only, no texture reads.

## Automated

| Check | Result |
|---|---|
| `pnpm test` | 45 passed (38 before). New: intensity at 100, at 0, at 50, curves, storage; every preset in a known category, no empty category, every preset described |
| `tsc --noEmit`, `eslint .` | pass |

## Not verified

- iOS Safari 17: everything. The new shader code uses only GLSL ES 3.00 core features already in use (`mat2`, `vnoise`, `noise1`, `rgb2ycc`).
- Export at full resolution with the new presets (only preview size and 240 px measured).
