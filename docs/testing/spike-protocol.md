# Spike protocol

Fill this in per run. One copy per environment. The numbers feed `docs/decisions/ADR-001-stack.md`, section Evidence. How to serve the spikes: `spikes/README.md`.

The project has no iPhone for testing. Runs happen in desktop Chrome on the dev machine. Desktop numbers are not evidence for the QA targets; they show the pipeline works. Fields that only apply to a phone stay empty.

## Environment

| Field                                                       | Value |
| ----------------------------------------------------------- | ----- |
| Browser and version, or device model                        | Chrome 152.0.7977.167 (embedded browser pane of the Claude desktop app) |
| OS version                                                  | Windows 11 Enterprise 10.0.26100 |
| GPU (desktop) or iOS version (phone)                        | not read out; 24 hardware threads |
| Date of run                                                 | 2026-11-09 |
| Run from browser tab, installed PWA or home screen icon     | browser tab, served over http://localhost:5180 (`pnpm spikes:http`), pane hidden during the runs |
| Battery at start / end (phone only)                         | n/a |
| Device noticeably warm afterwards (phone only)              | n/a |

Media were synthetic: generated in the page with canvas and MediaRecorder, then injected into the file inputs. No HEIC, no HEVC, no HDR material was available, so everything that depends on those formats stays open.

## Capability table (from `spikes/index.html`)

Copy the rows that are not "yes" or that surprise you. Screenshot the whole table and store it as `docs/testing/spike-caps-<device>.png`.

| API                                              | Value |
| ------------------------------------------------ | ----- |
| VideoDecoder / VideoEncoder                      | yes / yes |
| AudioDecoder / AudioEncoder                      | yes / yes (desktop Chrome; iOS 17 has neither, see ADR-001) |
| VideoDecoder hvc1.1.6.L120.B0 (HEVC 8 bit)       | yes |
| VideoDecoder hvc1.2.4.L120.B0 (HEVC 10 bit, HDR) | yes |
| VideoEncoder 1080p avc1.4d002a / avc1.640028     | yes / yes (avc1.42001f: no) |
| MediaRecorder video/mp4                          | yes |
| navigator.canShare({files})                      | no (desktop Chrome in the embedded pane; navigator.share also no) |
| storage quota                                    | 5422.8 MB |
| storage persisted()                              | false |
| WebGPU                                           | yes (irrelevant, disabled on iOS 17) |

## Spike video-export (QA-3, QA-4, QA-5, offene Frage 1)

Clip used: synthetic-1080p30-30s.mp4, canvas animation recorded with MediaRecorder in the page, 1920x1080, 29.96 s, 29.3 fps avg, H.264 avc1.640028 plus AAC 440 Hz tone, 11.7 MB, no HDR

Clip table: codec string avc1.640028, color space transfer smpte170m, canDecode() true

| Run                                             | Output px | Exported s | Elapsed s | Ratio (<= 2.0) | Frames | fps | ms/frame in process() | Output MB | Plays in Photos with sound | Notes / errors  |
| ----------------------------------------------- | --------- | ---------- | --------- | -------------- | ------ | --- | --------------------- | --------- | -------------------------- | --------------- |
| Mode A, 1080p, 8 Mbit/s, audio on               | 1920x1080 | 29.96      | 32.20     | 1.07           | 894    | 27.8 | 0.3                  | 29.2      | n/a (desktop, not saved)   | passes the desktop threshold, but see verdict |
| Mode A, 1080p, via 2D canvas (only if A failed) | not run   |            |           |                |        |     |                       |           |                            | A did not fail  |
| Mode A, 720p                                    | 1280x720  | 29.96      | 10.94     | 0.37           | 894    | 81.7 | 0.3                  | 29.4      | n/a                        | 3x faster than 1080p |
| Mode B 1x, 1080p                                | not run   |            |           |                |        |     |                       |           |                            | needs a visible video element, pane was hidden |
| Mode B 2x, 1080p                                | not run   |            |           |                |        |     |                       |           |                            | same            |
| Mode A, whole clip > 60 s (memory test)         | not run   |            |           |                |        |     |                       |           |                            | no long clip generated |

Texture upload path reported by Mode A: VideoFrame -> texImage2D

Preview test: not measurable in this run. The test plays the source through a `<video>` element and `requestVideoFrameCallback`; with the browser pane hidden, Chrome stops delivering frames and the test never reports. Mode B is affected the same way. Both need a visible tab. (QA-3 passes at >= 15)

**QA-4 verdict:** pass on desktop (1.07). Warning: 1080p is three times slower than 720p on this machine while the GL effect costs 0.3 ms per frame, so the H.264 encoder at 1080p is the bottleneck, not the Look. A phone encoder will not be faster than this desktop. Expect 1080p to miss 2.0 on a three year old iPhone; 720p export as default (EX-3) is the likely outcome. Not verified on iOS.

## Spike input-formats (IM-3, offene Frage 4)

Photo used: synthetic.jpg, canvas rendered, 4032x3024 JPEG, 0.1 MB (no HEIC available on desktop)
Video used: synthetic-3s.mp4, canvas recorded, 1920x1080 H.264, 2.94 s, 0.2 MB, no audio, no HDR (no HEVC available)

Only picker A was exercised, by injecting both files programmatically. Pickers B to H need the iOS file dialog to mean anything.

| Picker             | File           | file.type | Real container | MB  | Time until readable | Decode result | Notes                                   |
| ------------------ | -------------- | --------- | -------------- | --- | ------------------- | ------------- | --------------------------------------- |
| A `image/*,video/*` | photo          | image/jpeg | JPEG          | 0.1 | 0 ms                | ok, 28 ms total | desktop Chrome, injected file          |
| B image/heic first | photo          |           |                |     |                     |               |                                         |
| C jpeg,png,heic    | photo          |           |                |     |                     |               |                                         |
| D no accept        | photo          |           |                |     |                     |               |                                         |
| G camera photo     | photo          |           |                |     |                     |               |                                         |
| B image/heic first | PNG screenshot |           |                |     |                     |               | converted to HEIC?                      |
| A `image/*,video/*` | video          | video/mp4 | ISOBMFF MP4    | 0.2 | 0 ms                | first frame ok, NV12, 20 ms | avc1.640028, smpte170m, canDecode true, isConfigSupported true |
| E video/*          | video          |           |                |     |                     |               |                                         |
| F quicktime,mp4    | video          |           |                |     |                     |               |                                         |
| H camera video     | video          |           |                |     |                     |               |                                         |

Same behaviour from the home screen icon as from a Safari tab? not testable on desktop

**Verdict:** the inspection path works for JPEG and H.264 MP4. HEIC delivery, HEVC decode and HDR handling on iOS stay open; the decision rests on the sources in ADR-001.

## Spike image-pipeline (QA-2)

Photo used: synthetic-12mp.jpg, canvas rendered, 4032x3024 (12.2 MP), 0.8 MB, decode time 34 ms, MAX_TEXTURE_SIZE not shown by the page

| Resolution               | Upload ms | Digicam ms (2nd tap) | Handykamera ms | Einwegkamera ms | Original ms | Pass (< 500) |
| ------------------------ | --------- | -------------------- | -------------- | --------------- | ----------- | ------------ |
| preview (long edge 1600) | 57        | 19 (1st tap 30)      | 16             | 21              | 15          | pass         |
| full                     | 29        | 44 (1st tap 123)     | 28             | 29              | 9           | pass         |

Canvas 2D baseline, 1 pass, full res: 105 ms (four passes in JavaScript would be around 400 ms on this desktop CPU)

Large photo (> 24 MP) at full resolution: not run

**QA-2 verdict:** pass at preview resolution on desktop with a margin of about 25x; full resolution 44 ms. Even a phone that is ten times slower would pass at preview resolution. Not verified on iOS.

## Overall

Anything that crashed, reloaded, or behaved differently from the home screen: nothing crashed or reloaded. Home screen behaviour not testable.

Battery used in total: n/a

Conclusions for ADR-001: WebGL2 chain confirmed as fast enough with large margin (desktop). WebCodecs export works end to end with audio passthrough (desktop). 1080p encoding is the bottleneck; plan for 720p as the default export size and treat 1080p as an option. Everything Safari-specific remains documentation-based.
