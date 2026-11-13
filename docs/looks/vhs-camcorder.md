# Look-Familie: VHS and analog camcorder

Presets: VHS Tape, VHS Night Recording, Vintage Camcorder, Old Family Video, Heavy VHS Distortion, Soft VHS Memories, Summer Vacation 1997, MiniDV (library and styles: `vhs-preset-library.md`). Bausteine BS-4, BS-6, BS-8, BS-9, BS-10, BS-11.

## Devices and era

- VHS decks and VHS-C camcorders, late 1980s to early 2000s. Recorded on tape, watched on a TV or digitized from a deck.
- Hi8 and Video8 camcorders, 1990s. Better luma than VHS, the same kind of artifacts.
- MiniDV camcorders, about 1995 to 2008. Digital tape, so no tape noise, but interlaced, with in camera sharpening and reduced chroma resolution.

## What the real devices did, in signal order

1. **Lens and sensor.** Small CCD and a cheap zoom lens: soft, little dynamic range, early clipping.
2. **Interlacing.** Each frame is two fields exposed 1/50 s (PAL) or 1/60 s (NTSC) apart. With motion the fields disagree and every other line is displaced; a paused frame shows combing on vertical edges. Effect: Interlacing.
3. **Recording to tape.** Luma is frequency modulated with about 3 MHz of bandwidth, roughly 240 lines of horizontal resolution for VHS (about 400 for S-VHS and Hi8). Chroma is recorded separately with far less bandwidth, roughly 30 lines. Effect: Band-Auflösung (Luma-Unschärfe, Chroma-Unschärfe).
4. **Playback.** The deck's sharpness circuit boosts high frequencies and leaves bright and dark overshoot halos beside edges (Band-Auflösung, Kantenüberschwinger). Chroma lags behind luma and smears to the right (Color Bleeding).
5. **Head switching.** The video heads change over a few lines before the end of each field. Those last lines skew sideways and get noisy, a strip at the bottom of the frame. Effect: Kopfumschaltung.
6. **Tape wear and tracking.** Dropouts, line jitter, a noise band where tracking is off. Effects: VHS Distortion, Analog Noise.
7. **Display and capture.** Scanlines only show at large display sizes. The deck's On Screen Display (`PLAY`, counter) is crisp, while a date burned in by the camcorder is part of the recorded picture. Effects: Scanlines, Kamera-Einblendungen.

## How y2k reproduces it

- At preview size there are fewer pixels per line than the scanline pattern needs, so scanlines fade to their average (moire guard). The look is now carried by Band-Auflösung instead: at default about 240 lines of luma and 30 lines of chroma, sizes relative to the image height, so they survive downscaling. At 100 the luma drops to about 120 lines, like a worn long play tape. Chroma taps are jittered per pixel so the wide kernel does not show as steps.
- Interlacing shows real combing from about 3 pixels per line; below that it blends both fields into a double image, which is what a downscaled interlaced frame looks like anyway. The field offset varies over the frame like real motion.
- MiniDV: no tape noise or line jitter; in camera sharpening, early clipping, mild DCT artifacts, reduced chroma, interlacing at 576 lines. VHS Tape: full tape chain with chroma noise, dropouts, head switching and a tracking band. Vintage Camcorder (warm, bright Hi8) and Old Family Video (faded brown VHS-C) carry a burned in date. Heavy VHS Distortion and VHS Night Recording are the worn and the dark end.
- Chroma noise (Analog Noise, Farbrauschen) is coarse and smeared along the line, worst in dark flat areas, with a slow hue drift down the frame: the color under signal has about a tenth of the luma bandwidth. Dropouts are short white flecks with a tail to the right.

## Known deviation

The overlay is composited in the composite pass, after the tape loss in the signal pass. A camcorder date stays sharper than the picture. Readable and close, but not quite what the tape did.
