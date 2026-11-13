# Photo editor test run, 2026-11-10

Environment: Chrome 152 in the embedded browser pane of the Claude desktop app, Windows 11, device pixel ratio 1. Not tested on iOS Safari; see `CLAUDE.md`, section Verification environment.

Test photos:

- `docs/looks/references/user-reference-01-camcorder-digicam.png`: portrait collage with skin tones, 4 panels, PNG.
- `spikes/testmedia/Image.jpg`: 4032 x 3024 interior shot with EXIF, 8.6 MB JPEG (local only, gitignored).

## Automated

| Check | Result |
|---|---|
| Unit tests (`pnpm test`): curves, history, date formats, schema, presets, uniform plan, overlay layout, EXIF | 30 passed |
| Every parameter of every effect changes the rendered image (in-browser harness, 176 variants at 320 x 320) | all pass, see note below |
| Lint, typecheck, production build | pass |

Note on the parameter harness: five variants showed no change at 320 x 320 and were re-checked at 1600 x 1200. All change the image there.

- Scanline density and variation: below 3 px per line the lines are averaged on purpose to avoid moire.
- Vignette roundness: only matters for non-square images.
- Motion blur at 180°: same axis as 0°.

## Preview against export

| Check | Result |
|---|---|
| Export at preview size against the preview canvas, VHS Tape preset | mean difference 0.016 of 255, max 26 (single pixels) |
| Full size export, downscaled, against preview | visually identical side by side; global channel means within 1.5 of 255 |
| Export not mirrored | flipped comparison differs 2.5 times more than the straight one |

## Export

| Case | Result |
|---|---|
| JPEG, original size 4032 x 3024 | 3.7 MB, about 1 s including encode |
| EXIF kept | APP1 present after JFIF, orientation set to 1, thumbnail link removed |
| Before/after | capped to 3344 x 2508 per side, the Safari canvas limit; note shown |
| Optimize to 400 KB | quality search lands at 383 KB |
| WebP | 2.5 MB WebP, metadata note shown |

## Interaction

| Case | Result |
|---|---|
| Slider drag, release, undo, redo, double click reset, Ctrl+Z, Ctrl+Shift+Z | one undo step per drag, all as expected |
| Curve point add, drag, channel reset | mean brightness 153 to 183 and back to 153 |
| Save, duplicate, favorite, delete preset | stored in IndexedDB, survives reload; test data removed afterwards |
| Phone layout 375 x 812 | no horizontal scroll, toolbar on top, sheet and tabs at the bottom |

## Known limits

- Scanlines at the default 480 lines are only visible from about 3 render pixels per line. At device pixel ratio 1 in a small window they average out; zooming in or a higher pixel ratio shows them. This is intentional, the alternative is moire.
- A background browser tab does not get animation frames, so the preview only redraws when the tab is visible. Export renders independently.
- Not verified on iOS: HEIC input, share sheet with files, WebP export (Safari before 18 cannot encode WebP; the UI disables the option), memory behaviour at 12 MP export.
