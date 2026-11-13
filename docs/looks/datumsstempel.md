# Datumsstempel (BS-1)

## Fonts

| Option | Used for | Source and license |
|---|---|---|
| Pixel | camcorder OSD, VHS, default | VT323, SIL Open Font License 1.1, bundled through `@fontsource/vt323` (ADR-002) |
| 7-Segment | date backs of film compacts, digicam imprints | drawn as shapes in Canvas 2D in `src/render/segments.ts`. No font file, so no license question. |

The seven segment glyphs are slanted like LED and LCD date backs, with small gaps between the segments. Digits, `-`, `'`, `:`, `.`, `/` and the letters a seven segment display can show (A, b, C, d, E, F, H, J, L, n, o, P, r, t, U, y) are drawn as segments. Other letters (M, R and so on) fall back to VT323, so a 12 hour time like `PM 3:20` stays readable but mixes styles. The digicam date formats need no letters.

## Rendering

- The glow is the overlay's own shadow blur in the text color, which reads like the soft bloom of a date burned into film by an LED.
- 7-Segment applies to date and time only. REC, status lines and counters keep the pixel font, as on the real devices.
- The 2000s Digital Camera preset uses 7-Segment in orange with the format `'03 3 20`.
