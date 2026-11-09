# spike: video-export

## What it tests

Whether the proposed video pipeline (mediabunny + WebCodecs, per frame effect on a WebGL2 canvas, H.264 encode, MP4 mux, AAC audio copied without re-encoding) meets QA-4 on a real iPhone: a 30 s 1080p clip exported in at most 60 s. Also QA-3 (preview fps with the effect) and whether a 1080p HEVC MOV from the camera can be read at all (QA-5, offene Frage 4).

Two decode modes, because WebCodecs HEVC decode only arrived in iOS 17.4:

- **Mode A: WebCodecs decode.** `Conversion` from mediabunny demuxes, decodes with `VideoDecoder`, calls `process()` per frame, encodes with `VideoEncoder`. Not bound to real time. This is the proposal.
- **Mode B: `<video>` decode.** The clip plays in a hidden video element, `requestVideoFrameCallback` grabs frames, the same encoder writes the MP4. Bound to playback speed (1x or 2x). This is the fallback for clips `VideoDecoder` refuses.
- **Preview test:** plays 10 s with the effect at the chosen resolution and counts frames per second. No encoding. This is QA-3.

The effect (scanlines, snow, color bleed, tracking jitter) is a stand in for a Camcorder Look. It is cheap on purpose; a real Look will cost more GPU time, so a result that only barely passes here is a warning.

## How to run

1. Serve as described in `spikes/README.md`, open `video-export/` on the iPhone.
2. Record a 30 s clip in 1080p with the iPhone camera (Settings, Camera, Record Video, 1080p at 30 fps) or pick an existing one.
3. Pick the clip. The "Clip" table shows codec (expect `hevc`), size, fps, color space (`transfer: hlg` or `pq` means HDR), and whether `VideoDecoder` accepts it.
4. Keep the defaults (1920 long edge, 8 Mbit/s, first 30 s, audio on) and tap **Mode A**. Watch the progress bar. Note the result table.
5. Tap **Mode B** with 1x, then again with 2x.
6. Tap **Preview test**.
7. Tap **Share / save result** and save the MP4 to Photos. Open it in Photos: does it play, is the audio there, does it look right?
8. Repeat step 4 once with "copy GL frame through a 2D canvas" checked if Mode A failed.
9. Repeat Mode A with a 60 s or longer clip (set "only first" to 0) to see memory behaviour: does Safari reload the page?

## Numbers to write down

From the result table, for each run:

- mode, output size, exported duration
- **elapsed** and **ratio elapsed / clip length** (QA-4 passes at <= 2.0)
- frames encoded, throughput fps, time in `process()` per frame (Mode A)
- frames dropped (Mode B)
- output file size and whether the saved MP4 plays in Photos with sound
- texture upload path used (VideoFrame direct, or via 2D canvas)
- preview fps (QA-3 passes at >= 15)
- any error text from the log

Plus from the clip table: codec string, color space, `canDecode()`.
