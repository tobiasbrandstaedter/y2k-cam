# Look references

Images in this folder are the visual target for the Look-Familien. The filters agent reads them before writing a reference sheet or a Baustein. Text descriptions below say what the user pointed at in each image, so nobody has to guess.

## user-reference-01-camcorder-digicam.png

Supplied by the user on 2026-11-10 with the note that the spike output looked too pixelated and should look like this instead. Four panels, same portrait subject (person in a dark top, long blond hair, outdoors by the water), each in a different device style.

What all four panels share, and what the Looks must get right:

- **Softness, not pixelation.** Detail is lost through blur and low contrast at the fine scale, the way a cheap lens and analog or low-bitrate video lose it. There are no visible pixel or compression blocks anywhere. Any Kompressionsartefakte Baustein must stay far below the threshold where blocks become visible at normal viewing size.
- **Fine grain, not snow.** Noise is small, dense and mostly luminance, like film grain or video noise seen from a distance. Nothing sparkles.
- **Overlays in period fonts.** Date and time stamps in yellow, orange or white pixel or segment fonts, small, in a corner. A `REC` with a red dot, a `CAMERA PLAY` style status line, a battery or tape counter. All rendered slightly soft, as if part of the recorded picture.
- **Muted, shifted color.** Each panel has its own cast (warm orange, cool teal, slightly green), with lifted blacks and compressed highlights. Saturation is moderate, not candy colored.
- **Faint structure, not hard lines.** Where scanlines or interlacing appear they are low contrast and fine. A visible every-other-line stripe pattern at 18 percent darkening is far too strong.

Panel by panel, top left to bottom right:

1. **Camcorder, warm.** Orange-yellow cast, strong softness, date stamp `03/20/23  PM 3:20` bottom left in yellow. Slight horizontal smear.
2. **Camcorder, cool.** Teal-green shadows, a bit more contrast, stamp block `AM 10:00` / `MAR 20 2023` on the right in orange pixel font.
3. **Camcorder viewfinder.** Status overlay top left (`CAMERA`, `PLAY`, a counter `00:07:20`), cool tint, very soft, faint fine lines.
4. **Digicam / camcorder with REC.** Red `REC` dot top right, vertical frame markers at the sides, cool cast, light vignette.

Takeaway for the spike and for the real Bausteine: lower the frequency and strength of anything that looks digital (blocks, hard scanlines, speckle noise), raise the analog traits (blur, grain, color cast, lifted blacks, soft overlays).

## user-reference-02-vhs-glitch.png

Supplied by the user on 2026-11-10 as a second target: a heavily degraded VHS frame, rows of bright objects in the dark, date stamp `DEC 21 1991` bottom left.

- **Horizontal smear and echo.** Bright objects trail to the right and repeat as faint copies, edges have bright overshoot halos. That is the tape's limited luma bandwidth plus the deck's sharpness circuit, not a blur in both directions.
- **Color fringes.** Red and cyan edges offset horizontally, chroma far softer than luma.
- **Warm, crushed shadows.** Blacks lifted to brown, highlights bloom and clip.
- **Pixel date stamp** in white, as soft and doubled as the rest of the picture.

This is the far end of the VHS range. The VHS Tape preset aims at a milder version; Band-Auflösung, Color Bleeding and Chromatic Aberration turned up reach this look.

## user-reference-03-vcr-overlays.webp

Supplied by the user on 2026-11-10: one photo (red car under palms) as original and in three VCR variants.

- **Overlay layouts.** `PLAY`, `AM 10:00` over `MAR. 20 2023` bottom left; `CAMERA1 RAW`, `PLAY`, `00:07:20` top left; `● REC` and `00:00:00` on dark translucent boxes; `VCR TAPE` over `IPHONE` bottom right.
- **Color.** Faded, cool or slightly purple casts, raised blacks, reduced saturation. The red car stays red but loses punch.
- **Texture.** Fine noise, faint horizontal lines, soft edges, soft vignette, rounded frame corners in one variant.

Not built yet: dark boxes behind overlay text and rounded frame corners. Both would be new overlay options; see the open points in `docs/testing/effects-2026-11-10.md`.
