# Photo editor test run, 2026-11-13

Environment: Chrome in the embedded browser pane of the Claude desktop app, Windows 11, device pixel ratio 1, pane about 800 x 600. Not tested on iOS Safari; see `CLAUDE.md`, section Verification environment.

Test photo: `spikes/testmedia/Image.jpg`, 4032 x 3024 JPEG with EXIF (local only, gitignored).

The pane was in the background for most of the run, so `requestAnimationFrame` barely fired. Checks that need the preview canvas ran through the UI; the rest ran against `Renderer.renderPixels` and the export module directly, imported from the dev server.

## Automated

| Check | Result |
|---|---|
| `pnpm test`, `pnpm lint`, `pnpm build` | 45 tests pass, lint and typecheck clean |
| Every slider of every effect, driven through the UI, changes the preview | 99 sliders, 94 change the image; the other 5 are expected no-ops (Split Toning hue and balance at saturation 0, cast and overlay at 0) |
| Every select option, toggle and text field changes the render (800 x 600) | all pass; overlay status position has nothing to move while all status items are off |
| Every effect switched on with defaults | effects that are on by default are no-ops at default, all others change the image |
| All 19 presets at Intensität 100, 50 and 0 | full look, weaker look, original |

## Interaction

| Case | Result |
|---|---|
| Slider drag with live updates and one commit, undo, redo, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y | one undo step per drag, all as expected |
| Double click on a slider, card reset, Alles zurücksetzen | back to defaults |
| Apply preset, Intensität, save, duplicate, favorite, apply saved, delete; built-in favorite | stored in IndexedDB, Intensität kept in the saved preset, test data removed afterwards |
| Curve editor: add and drag point, drag end point, click on the left and right edge, channel switch, channel reset, card reset, undo | pass after fix 2 |
| Zoom in, out, fit; compare split; hold for original; fullscreen and Escape | pass |
| Export panel: JPEG at 1200 px with quality 70, PNG before/after, download from the result | file names, sizes and notes as expected |

## Export

| Case | Result |
|---|---|
| JPEG original size | 4032 x 3024, EXIF kept, about 1 s |
| PNG, WebP | 29 MB PNG, 1.7 MB WebP, metadata note shown |
| Custom long edge 1000 | 1000 x 750 |
| Before/after | capped to 3344 x 2508 per side, note shown |
| Optimize to 400 KB and 150 KB, with and without EXIF, WebP | all below the limit after fix 1 |
| Unreachable target (20 KB at 4000 px) | note asks for a smaller resolution |

## Fixed in this run

1. Export with "Dateigröße optimieren" and "Metadaten erhalten" ended up above the target (401 KB for 400 KB) because the EXIF block was added after the quality search. The EXIF size now comes off the budget first (`src/io/export.ts`).
2. Curve editor: a click near the left or right edge added a second point at x = 0 or x = 1, and the curve jumped. A click within 0.02 of an existing point's x now grabs that point (`src/ui/CurveEditor.tsx`).
3. A changed RGB curve did not mark the Farbe category with the change dot, because the curves effect has no params. `isChanged` now looks at the curve points (`src/app.tsx`).

## Not covered

- Phone layout and touch gestures (pinch, double tap on a slider) were not re-run; nothing in the layout changed since the 2026-11-10 run.
- iOS: see the open points in `photo-editor-2026-11-10.md`.
