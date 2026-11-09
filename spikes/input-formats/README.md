# spike: input-formats

## What it tests

IM-3 and offene Frage 4: what iOS Safari actually delivers when the user picks a HEIC photo or a HEVC/HDR MOV from Photos, and how the `accept` attribute changes that. WebKit transcodes photos depending on the first non wildcard MIME type in `accept` (HEIC to JPEG by default). Videos have been handed over untouched since iOS 13.6, but that needs confirming for HDR clips on iOS 17.

For every picked file the page shows: `file.type`, size, the real container from the first bytes, `<img>` or `<video>` decode result, `createImageBitmap` size and time, and for video the codec string, color space, fps, whether WebCodecs can decode it, and whether one real frame could be decoded.

## How to run

1. Serve as described in `spikes/README.md`, open `input-formats/` on the iPhone. This page also works over plain http.
2. In Photos, find one HEIC photo (Settings, Camera, Formats, "High Efficiency" produces HEIC) and one video recorded with HDR on. Swipe up on each in Photos to see its format.
3. Pick the **same photo** with pickers A, B, C, D and G (G opens the camera: take a photo).
4. Pick the **same video** with pickers A, E, F and H (H opens the camera: record a few seconds).
5. Also try a JPEG and a PNG screenshot with picker B to see whether they get converted to HEIC.

## Numbers to write down

Per picker and file:

- `file.type` and the real container (JPEG, HEIF, MOV, MP4)
- size in MB (a transcoded file has a very different size than the original in Photos)
- "time until file readable" (how long iOS spent transcoding before the change event)
- image: `<img>` decode ok or failed, `createImageBitmap` size and time
- video: codec (`hevc` or `avc`), color space transfer (`hlg`, `pq` or `bt709`), `canDecode()`, first frame decoded ok or failed and how long it took
- whether the picker from the home screen behaves the same as in a Safari tab
