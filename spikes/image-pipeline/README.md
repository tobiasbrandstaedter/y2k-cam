# spike: image-pipeline

## What it tests

QA-2: tapping a Look on a 12 MP photo shows the result in under 0.5 s. The page runs four chained WebGL2 fragment shader passes (color cast and saturation, block quantization, noise, vignette with blur) over the photo, ping ponging between two framebuffers, and times each Look switch including a forced GPU sync. It does this at preview resolution (long edge 1600, what the editor would show) and at full resolution (what the export would do).

A Canvas 2D baseline (one `getImageData` saturation pass at full resolution) shows what the pixel loop alternative costs.

The three "Looks" are only parameter sets for the fixed chain. Real Looks are the filters agent's work.

## How to run

1. Serve as described in `spikes/README.md`, open `image-pipeline/` on the iPhone. Works over plain http too.
2. Pick a 12 MP photo from the camera (4032x3024). The "Photo" table shows decode time and size.
3. With "preview resolution" checked, tap Digicam, Handykamera, Einwegkamera, Original, each two or three times. The first tap after a photo change includes shader warm up.
4. Uncheck "preview resolution" (the texture is re-uploaded at full size) and tap the Looks again.
5. Tap "Canvas 2D baseline".
6. Optional: pick the largest photo you have (panorama or 48 MP) and repeat step 4. Watch for a Safari reload (out of memory).

## Numbers to write down

- `MAX_TEXTURE_SIZE`
- decode time and size of the photo
- texture upload time at preview and at full resolution
- per Look: time in ms at preview and at full resolution (QA-2 passes under 500 ms; the second tap counts, the first includes warm up)
- Canvas 2D baseline time
- any reload or blank page with a large photo
