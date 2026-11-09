// Spike: export a video with a per-frame GPU effect to MP4 on iOS Safari 17.
// Targets QA-3 (preview fps), QA-4 (export time <= 2x clip length), QA-5 (1080p input),
// offene Frage 1. Two decode paths:
//   Mode A: mediabunny Conversion -> WebCodecs VideoDecoder -> process() -> VideoEncoder -> MP4
//   Mode B: <video> + requestVideoFrameCallback -> CanvasSource (VideoEncoder) -> MP4
// Audio is copied as encoded AAC packets in both modes. iOS 17 has no AudioEncoder.

import {
  Input,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  Quality,
  CanvasSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
} from 'https://cdn.jsdelivr.net/npm/mediabunny@1.65.2/+esm';
import { $, log, row, fmtBytes, fmtMs, deviceInfo, shareOrDownload } from '../common/report.js';
import { createEffect } from '../common/effect-gl.js';

deviceInfo('device');

let file = null;
let input = null;
let videoTrack = null;
let audioTrack = null;
let clip = {}; // width, height, duration, fps
let resultBlob = null;
let cancelCurrent = null;

const previewCtx = $('preview').getContext('2d');

$('file').addEventListener('change', async (e) => {
  file = e.target.files[0];
  if (!file) return;
  resultBlob = null;
  $('share').disabled = true;
  try {
    await inspect(file);
    for (const id of ['runA', 'runB', 'runPreview']) $(id).disabled = false;
  } catch (err) {
    log('inspect failed: ' + err.message);
  }
});

async function inspect(file) {
  row('clip', 'name', file.name);
  row('clip', 'file.type', file.type || '(empty)');
  row('clip', 'size', fmtBytes(file.size));

  input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  row('clip', 'container', (await input.getFormat()).name);
  row('clip', 'mime (from file)', await input.getMimeType());

  videoTrack = await input.getPrimaryVideoTrack();
  audioTrack = await input.getPrimaryAudioTrack();
  if (!videoTrack) throw new Error('no video track');

  const w = await videoTrack.getDisplayWidth();
  const h = await videoTrack.getDisplayHeight();
  const duration = await videoTrack.computeDuration();
  const stats = await videoTrack.computePacketStats(200);
  const cfg = await videoTrack.getDecoderConfig();
  clip = { width: w, height: h, duration, fps: stats.averagePacketRate };

  row('clip', 'video codec', `${await videoTrack.getCodec()} (${cfg?.codec ?? '?'})`);
  row('clip', 'display size', `${w}x${h}, rotation ${await videoTrack.getRotation()}`);
  row('clip', 'duration', duration.toFixed(2) + ' s');
  row('clip', 'fps (avg)', stats.averagePacketRate.toFixed(2));
  row('clip', 'color space', cfg?.colorSpace ? JSON.stringify(cfg.colorSpace) : 'n/a');
  row('clip', 'VideoDecoder canDecode()', await videoTrack.canDecode());
  if (audioTrack) {
    const acfg = await audioTrack.getDecoderConfig();
    row('clip', 'audio codec', `${await audioTrack.getCodec()} (${acfg?.codec ?? '?'})`);
  } else {
    row('clip', 'audio codec', 'none');
  }
}

function settings() {
  const longEdge = Number($('longEdge').value);
  const scale = longEdge ? Math.min(1, longEdge / Math.max(clip.width, clip.height)) : 1;
  // encoders want even dimensions
  const even = (n) => Math.round(n / 2) * 2;
  return {
    width: even(clip.width * scale),
    height: even(clip.height * scale),
    bitrate: Number($('bitrate').value),
    seconds: Number($('seconds').value) || 0,
    mute: $('mute').checked,
    via2d: $('via2d').checked,
    rate: Number($('rate').value),
  };
}

function exportedDuration(s) {
  return s.seconds ? Math.min(s.seconds, clip.duration) : clip.duration;
}

function resetResult({ keepBlob = false } = {}) {
  $('result').innerHTML = '';
  $('progress').value = 0;
  if (keepBlob) return;
  $('share').disabled = true;
  $('download').hidden = true;
  resultBlob = null;
}

function busy(on) {
  for (const id of ['runA', 'runB', 'runPreview', 'file']) $(id).disabled = on;
  $('cancel').disabled = !on;
}

function showPreview(canvas) {
  previewCtx.drawImage(canvas, 0, 0, previewCtx.canvas.width, previewCtx.canvas.height);
}

function report(mode, s, elapsedMs, frames, blob, extra = {}) {
  const dur = exportedDuration(s);
  const ratio = elapsedMs / 1000 / dur;
  row('result', 'mode', mode);
  row('result', 'output size (px)', `${s.width}x${s.height}`);
  row('result', 'exported duration', dur.toFixed(2) + ' s');
  row('result', 'elapsed', fmtMs(elapsedMs));
  row('result', 'ratio elapsed / clip length', ratio.toFixed(2) + ' (QA-4 target <= 2.0)');
  row('result', 'frames encoded', frames);
  row('result', 'throughput', (frames / (elapsedMs / 1000)).toFixed(1) + ' fps');
  if (blob) row('result', 'output file', fmtBytes(blob.size) + ', ' + blob.type);
  for (const [k, v] of Object.entries(extra)) row('result', k, v);
  const is1080 = Math.max(s.width, s.height) >= 1920;
  const pass = ratio <= 2 && is1080;
  const verdict = pass ? 'PASS' : is1080 ? 'FAIL (too slow)' : 'n/a (not 1080p)';
  row('result', 'QA-4', verdict);
  $('result').querySelector('tr[data-key="QA-4"] td').className = pass ? 'pass' : 'fail';
}

// ---------- Mode A: mediabunny Conversion with process() ----------

$('runA').addEventListener('click', async () => {
  resetResult();
  busy(true);
  const s = settings();
  let effect = null;
  let copyCanvas = null;
  let frames = 0;
  let processMs = 0;
  let uploadPath = 'VideoFrame -> texImage2D';

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const t0 = performance.now();
  try {
    const conversion = await Conversion.init({
      input,
      output,
      trim: s.seconds ? { start: 0, end: s.seconds } : undefined,
      video: {
        width: s.width,
        height: s.height,
        fit: 'fill',
        codec: 'avc',
        quality: new Quality({ bitrate: s.bitrate }),
        process: (sample) => {
          const p0 = performance.now();
          if (!effect) {
            effect = createEffect(sample.displayWidth, sample.displayHeight);
            log(`effect canvas ${sample.displayWidth}x${sample.displayHeight}`);
          }
          let out;
          try {
            if (uploadPath.startsWith('VideoFrame')) {
              const src = sample.toCanvasImageSource();
              out = effect.render(src, sample.timestamp);
              if (src instanceof VideoFrame) src.close();
            } else {
              throw new Error('fallback');
            }
          } catch (err) {
            // Safari may refuse a VideoFrame as texture source. Go through a 2D canvas.
            if (uploadPath.startsWith('VideoFrame')) {
              log('texImage2D(VideoFrame) failed, falling back to 2D canvas: ' + err.message);
              uploadPath = 'sample.draw(2D) -> texImage2D';
            }
            copyCanvas ??= new OffscreenCanvas(sample.displayWidth, sample.displayHeight);
            sample.draw(copyCanvas.getContext('2d'), 0, 0);
            out = effect.render(copyCanvas, sample.timestamp);
          }
          if (s.via2d) {
            copyCanvas ??= new OffscreenCanvas(sample.displayWidth, sample.displayHeight);
            copyCanvas.getContext('2d').drawImage(out, 0, 0);
            out = copyCanvas;
          }
          frames++;
          processMs += performance.now() - p0;
          if (frames % 15 === 0) showPreview(out);
          return out;
        },
      },
      audio: s.mute ? { discard: true } : {},
    });

    if (!conversion.isValid) {
      log('conversion invalid: ' + JSON.stringify(conversion.discardedTracks));
    }
    for (const d of conversion.discardedTracks) {
      row('result', `discarded ${d.track.type} track`, d.reason);
    }
    conversion.onProgress = (p) => ($('progress').value = p);
    cancelCurrent = () => conversion.cancel();
    await conversion.execute();

    const elapsed = performance.now() - t0;
    resultBlob = new Blob([output.target.buffer], { type: 'video/mp4' });
    report('A (WebCodecs decode)', s, elapsed, frames, resultBlob, {
      'texture upload path': uploadPath,
      'time in process() total':
        fmtMs(processMs) + ` (${(processMs / frames).toFixed(1)} ms/frame)`,
      audio: s.mute ? 'muted' : audioTrack ? 'copied (passthrough)' : 'none in source',
    });
    $('share').disabled = false;
    log('mode A done');
  } catch (err) {
    log('mode A failed: ' + (err.stack || err.message));
    row('result', 'mode A error', err.message);
  } finally {
    busy(false);
    cancelCurrent = null;
  }
});

// ---------- Mode B: <video> element + requestVideoFrameCallback ----------

$('runB').addEventListener('click', async () => {
  resetResult();
  busy(true);
  const s = settings();
  const video = $('video');
  let frames = 0;
  let stopped = false;

  const t0 = performance.now();
  try {
    video.src = URL.createObjectURL(file);
    video.playbackRate = s.rate;
    await new Promise((res, rej) => {
      video.onloadedmetadata = res;
      video.onerror = () => rej(new Error('video element cannot load this file'));
    });
    const effect = createEffect(s.width, s.height);
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const canvasSource = new CanvasSource(effect.canvas, {
      codec: 'avc',
      quality: new Quality({ bitrate: s.bitrate }),
    });
    output.addVideoTrack(canvasSource, { frameRate: Math.round(clip.fps) || 30 });

    let audioSource = null;
    if (!s.mute && audioTrack) {
      audioSource = new EncodedAudioPacketSource(await audioTrack.getCodec());
      output.addAudioTrack(audioSource);
    }
    await output.start();

    // copy audio packets while the video plays
    const audioDone = (async () => {
      if (!audioSource) return;
      const sink = new EncodedPacketSink(audioTrack);
      const cfg = await audioTrack.getDecoderConfig();
      const end = s.seconds || Infinity;
      let first = true;
      for await (const packet of sink.packets()) {
        if (packet.timestamp > end) break;
        await audioSource.add(packet, first ? { decoderConfig: cfg } : undefined);
        first = false;
      }
      audioSource.close();
    })();

    cancelCurrent = () => {
      stopped = true;
      video.pause();
    };

    const frameDuration = 1 / (clip.fps || 30);
    const end = s.seconds || Infinity;
    // Do not await add() inside the frame callback: the video keeps playing while
    // the encoder works, so a blocking await drops almost every frame. Keep a
    // bounded number of frames in flight instead and skip when the encoder lags.
    let inFlight = 0;
    let skipped = 0;
    let lastAdd = Promise.resolve();
    await new Promise((resolve, reject) => {
      const onFrame = (_now, meta) => {
        if (stopped) return resolve();
        try {
          if (inFlight < 8) {
            effect.render(video, meta.mediaTime);
            inFlight++;
            lastAdd = canvasSource.add(meta.mediaTime, frameDuration).then(
              () => inFlight--,
              (err) => reject(err),
            );
            frames++;
            if (frames % 15 === 0) showPreview(effect.canvas);
          } else {
            skipped++;
          }
          $('progress').value = meta.mediaTime / exportedDuration(s);
          if (meta.mediaTime >= end) {
            video.pause();
            return resolve();
          }
          video.requestVideoFrameCallback(onFrame);
        } catch (err) {
          reject(err);
        }
      };
      video.onended = () => resolve();
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(reject);
    });
    await lastAdd;
    row('result', 'frames skipped (encoder lag)', skipped);

    canvasSource.close();
    await audioDone;
    await output.finalize();

    const elapsed = performance.now() - t0;
    resultBlob = new Blob([output.target.buffer], { type: 'video/mp4' });
    const expected = Math.round(exportedDuration(s) * (clip.fps || 30));
    report('B (<video> decode, ' + s.rate + 'x)', s, elapsed, frames, resultBlob, {
      'frames dropped (expected - got)': `${expected - frames} of ${expected}`,
      audio: s.mute ? 'muted' : audioTrack ? 'copied (passthrough)' : 'none in source',
    });
    $('share').disabled = false;
    log('mode B done');
  } catch (err) {
    log('mode B failed: ' + (err.stack || err.message));
    row('result', 'mode B error', err.message);
  } finally {
    video.pause();
    busy(false);
    cancelCurrent = null;
  }
});

// ---------- Preview test: how many effect frames per second at 1x playback (QA-3) ----------

$('runPreview').addEventListener('click', async () => {
  resetResult({ keepBlob: true });
  busy(true);
  const s = settings();
  const video = $('video');
  let frames = 0;
  let stopped = false;
  try {
    video.src = URL.createObjectURL(file);
    video.playbackRate = 1;
    await new Promise((res, rej) => {
      video.onloadedmetadata = res;
      video.onerror = () => rej(new Error('video element cannot load this file'));
    });
    const effect = createEffect(s.width, s.height);
    const visible = $('preview');
    const ctx = previewCtx;
    cancelCurrent = () => {
      stopped = true;
      video.pause();
    };
    const t0 = performance.now();
    const testSeconds = Math.min(10, clip.duration);
    await new Promise((resolve, reject) => {
      const onFrame = (_now, meta) => {
        if (stopped || meta.mediaTime >= testSeconds) {
          video.pause();
          return resolve();
        }
        try {
          effect.render(video, meta.mediaTime);
          ctx.drawImage(effect.canvas, 0, 0, visible.width, visible.height);
          frames++;
          video.requestVideoFrameCallback(onFrame);
        } catch (err) {
          reject(err);
        }
      };
      video.onended = () => resolve();
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(reject);
    });
    const elapsed = (performance.now() - t0) / 1000;
    const fps = frames / elapsed;
    row('result', 'mode', 'preview test (no encode)');
    row('result', 'effect resolution', `${s.width}x${s.height}`);
    row('result', 'preview fps', fps.toFixed(1) + ' (QA-3 target >= 15)');
    row('result', 'QA-3', fps >= 15 ? 'PASS' : 'FAIL');
    $('result').querySelector('tr[data-key="QA-3"] td').className = fps >= 15 ? 'pass' : 'fail';
  } catch (err) {
    log('preview test failed: ' + (err.stack || err.message));
    row('result', 'preview error', err.message);
  } finally {
    video.pause();
    busy(false);
    cancelCurrent = null;
  }
});

$('cancel').addEventListener('click', () => cancelCurrent?.());

$('share').addEventListener('click', async () => {
  if (!resultBlob) return;
  const outcome = await shareOrDownload(resultBlob, 'y2k-spike-export.mp4', $('download'));
  row('result', 'share', outcome);
});
