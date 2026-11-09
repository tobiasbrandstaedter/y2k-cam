# Spike protocol

Fill this in on the phone run. One copy per device. The numbers feed `docs/decisions/ADR-001-stack.md`, section Evidence. How to serve the spikes: `spikes/README.md`.

## Device

| Field                                               | Value |
| --------------------------------------------------- | ----- |
| Device model (Settings, General, About, Model Name) |       |
| iOS version                                         |       |
| Date of run                                         |       |
| Run from Safari tab or from home screen icon        |       |
| Battery at start / end                              |       |
| Phone noticeably warm afterwards (yes/no)           |       |

## Capability table (from `spikes/index.html`)

Copy the rows that are not "yes" or that surprise you. Screenshot the whole table and store it as `docs/testing/spike-caps-<device>.png`.

| API                                              | Value |
| ------------------------------------------------ | ----- |
| VideoDecoder / VideoEncoder                      |       |
| AudioDecoder / AudioEncoder                      |       |
| VideoDecoder hvc1.1.6.L120.B0 (HEVC 8 bit)       |       |
| VideoDecoder hvc1.2.4.L120.B0 (HEVC 10 bit, HDR) |       |
| VideoEncoder 1080p avc1.4d002a / avc1.640028     |       |
| MediaRecorder video/mp4                          |       |
| navigator.canShare({files})                      |       |
| storage quota                                    |       |
| storage persisted()                              |       |
| WebGPU                                           |       |

## Spike video-export (QA-3, QA-4, QA-5, offene Frage 1)

Clip used: ________ (name, how recorded, 1080p yes/no, HDR yes/no, length)

Clip table: codec string ________, color space transfer ________, canDecode() ________

| Run                                             | Output px | Exported s | Elapsed s | Ratio (<= 2.0) | Frames | fps | ms/frame in process() | Output MB | Plays in Photos with sound | Notes / errors  |
| ----------------------------------------------- | --------- | ---------- | --------- | -------------- | ------ | --- | --------------------- | --------- | -------------------------- | --------------- |
| Mode A, 1080p, 8 Mbit/s, audio on               |           |            |           |                |        |     |                       |           |                            |                 |
| Mode A, 1080p, via 2D canvas (only if A failed) |           |            |           |                |        |     |                       |           |                            |                 |
| Mode A, 720p                                    |           |            |           |                |        |     |                       |           |                            |                 |
| Mode B 1x, 1080p                                |           |            |           |                |        |     |                       |           |                            | frames dropped: |
| Mode B 2x, 1080p                                |           |            |           |                |        |     |                       |           |                            | frames dropped: |
| Mode A, whole clip > 60 s (memory test)         |           |            |           |                |        |     |                       |           |                            | page reloaded?  |

Texture upload path reported by Mode A: ________

Preview test: ________ fps at ________ px (QA-3 passes at >= 15)

**QA-4 verdict:** pass / fail. If fail, which setting passed (720p? shorter)? ________

## Spike input-formats (IM-3, offene Frage 4)

Photo used: ________ (format shown in Photos: HEIC/JPEG, MP, MB)
Video used: ________ (format in Photos, HDR yes/no, length, MB)

| Picker             | File           | file.type | Real container | MB  | Time until readable | Decode result | Notes                                   |
| ------------------ | -------------- | --------- | -------------- | --- | ------------------- | ------------- | --------------------------------------- |
| A `image/*,video/*` | photo          |           |                |     |                     |               |                                         |
| B image/heic first | photo          |           |                |     |                     |               |                                         |
| C jpeg,png,heic    | photo          |           |                |     |                     |               |                                         |
| D no accept        | photo          |           |                |     |                     |               |                                         |
| G camera photo     | photo          |           |                |     |                     |               |                                         |
| B image/heic first | PNG screenshot |           |                |     |                     |               | converted to HEIC?                      |
| A `image/*,video/*` | video          |           |                |     |                     |               | codec, transfer, canDecode, first frame |
| E video/*          | video          |           |                |     |                     |               |                                         |
| F quicktime,mp4    | video          |           |                |     |                     |               |                                         |
| H camera video     | video          |           |                |     |                     |               |                                         |

Same behaviour from the home screen icon as from a Safari tab? ________

**Verdict:** HEIC arrives as ________ by default. HEVC MOV decodes via WebCodecs: yes / no / only with Mode B. HDR clip decodes: yes / no.

## Spike image-pipeline (QA-2)

Photo used: ________ (px, MP, MB), decode time ________, MAX_TEXTURE_SIZE ________

| Resolution               | Upload ms | Digicam ms (2nd tap) | Handykamera ms | Einwegkamera ms | Original ms | Pass (< 500) |
| ------------------------ | --------- | -------------------- | -------------- | --------------- | ----------- | ------------ |
| preview (long edge 1600) |           |                      |                |                 |             |              |
| full                     |           |                      |                |                 |             |              |

Canvas 2D baseline, 1 pass, full res: ________ ms

Large photo (> 24 MP) at full resolution: ok / reload / blank ________

**QA-2 verdict:** pass / fail at preview resolution; full resolution ________ ms.

## Overall

Anything that crashed, reloaded, or behaved differently from the home screen:

Battery used in total: ________ %
