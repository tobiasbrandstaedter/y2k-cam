# Look-Familie: early digital cameras

Presets: 2000s Digital Camera, Old Sony Camera. Bausteine BS-1, BS-4, BS-5, BS-6, BS-8.

## Devices and era

Compact digital cameras from about 1999 to 2006: 1 to 5 megapixel CCDs (Sony Cyber-shot and Mavica, Canon PowerShot, Olympus Camedia and similar), JPEG only, small sensors with little headroom.

## What the real devices did, in signal order

1. **Small CCD.** Little dynamic range. Bright areas clip per channel, so a clipped sky turns cyan or white and bright skin turns yellow, with a hard plateau. Effect: Digicam-Sensor, Lichter-Clipping. It runs in the color pass right after exposure, so later grading sees clipped values like the camera's own processing did.
2. **Lens and sensor at high contrast.** Purple fringes on the dark side of edges next to clipped highlights, from lens chromatic aberration and sensor blooming. Effect: Purple Fringing.
3. **Sensor noise.** Fine luminance noise in the shadows plus slower chroma blotches left by the camera's noise reduction. Effect: Sensorrauschen, at the pixel scale of a sensor with about 1500 lines; smaller outputs get it averaged.
4. **In camera sharpening.** A strong unsharp mask with a radius of one to two sensor pixels, visible as bright and dark halos around edges. Effect: Nachschärfung.
5. **Date imprint.** Drawn into the image before compression, usually orange, often seven segment style. Effect: Kamera-Einblendungen with Schrift Datum = 7-Segment, see `datumsstempel.md`.
6. **JPEG.** 8 x 8 blocks, fine texture inside a block gets flattened, chroma quantized harder than luma, mosquito noise beside edges. Effect: JPEG-Kompression, kept well below visible blocking as the user asked (`references/README.md`). The block structure fades out below 3 pixels per block so it cannot alias.

## Presets

- 2000s Digital Camera: mild clipping and sharpening, little noise, JPEG 15, orange seven segment date `'03 3 20`.
- Old Sony Camera: stronger clipping, sharpening and fringing, more shadow noise, JPEG 25, cool. Replaces the colored film grain it used before, which was the wrong kind of noise for a digicam.

## Known deviations

- Sharpening and the JPEG block mean are taken from the image before Soft Focus and the lens effects. In a camera the lens came first. At the low soft focus values these presets use, the difference does not show.
- The date imprint gets no JPEG artifacts, because overlays are composited later in the pipeline.
