// Spike: what does iOS Safari hand over for HEIC photos and HEVC/HDR MOV clips (IM-3, offene Frage 4)?

import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
} from 'https://cdn.jsdelivr.net/npm/mediabunny@1.65.2/+esm';
import { $, log, row, fmtBytes, fmtMs, deviceInfo, sniffContainer } from '../common/report.js';

deviceInfo('device');

for (const picker of document.querySelectorAll('input[type=file]')) {
  picker.addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      $('result').innerHTML = '';
      log(`--- picker ${picker.dataset.picker}: ${file.name}`);
      try {
        await inspect(file, picker.dataset.picker);
      } catch (err) {
        log('inspect failed: ' + (err.stack || err.message));
        row('result', 'error', err.message);
      }
    }
  });
}

async function inspect(file, pickerId) {
  const t0 = performance.now();
  row('result', 'picker', pickerId);
  row('result', 'file.name', file.name);
  row('result', 'file.type', file.type || '(empty)');
  row('result', 'file.size', fmtBytes(file.size));
  row('result', 'lastModified', new Date(file.lastModified).toISOString());
  const container = await sniffContainer(file);
  row('result', 'real container (magic bytes)', container);
  row('result', 'time until file readable', fmtMs(performance.now() - t0));

  const isVideo =
    file.type.startsWith('video/') || container.includes('MOV') || container.includes('MP4');
  if (isVideo) {
    await inspectVideo(file);
  } else {
    await inspectImage(file);
  }
  log(`done in ${fmtMs(performance.now() - t0)}`);
}

async function inspectImage(file) {
  $('video').hidden = true;
  const url = URL.createObjectURL(file);

  // <img> decode
  const img = $('img');
  const t0 = performance.now();
  const imgResult = await new Promise((resolve) => {
    img.onload = () =>
      resolve(`ok ${img.naturalWidth}x${img.naturalHeight} in ${fmtMs(performance.now() - t0)}`);
    img.onerror = () => resolve('FAILED (img.onerror)');
    img.src = url;
  });
  img.hidden = false;
  row('result', '<img> decode', imgResult);

  // createImageBitmap decode, this is what the pipeline will use
  const t1 = performance.now();
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    row(
      'result',
      'createImageBitmap',
      `ok ${bmp.width}x${bmp.height} in ${fmtMs(performance.now() - t1)}`,
    );
    row('result', 'megapixels', ((bmp.width * bmp.height) / 1e6).toFixed(1) + ' MP');
    bmp.close();
  } catch (err) {
    row('result', 'createImageBitmap', 'FAILED: ' + err.message);
  }

  // Did iOS transcode? The Photos app shows the real format of the original (swipe up on the photo).
  row(
    'result',
    'hint',
    'Compare "real container" with the format Photos shows for this file. JPEG here but HEIC in Photos means iOS transcoded on the way in.',
  );
}

async function inspectVideo(file) {
  $('img').hidden = true;
  const url = URL.createObjectURL(file);

  // <video> element
  const video = $('video');
  const t0 = performance.now();
  const videoResult = await new Promise((resolve) => {
    video.onloadedmetadata = () =>
      resolve(
        `ok ${video.videoWidth}x${video.videoHeight}, ${video.duration.toFixed(2)} s, in ${fmtMs(performance.now() - t0)}`,
      );
    video.onerror = () => resolve('FAILED (video.onerror ' + (video.error?.code ?? '') + ')');
    video.src = url;
  });
  video.hidden = false;
  row('result', '<video> loadedmetadata', videoResult);

  // mediabunny demux + WebCodecs decode
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  row('result', 'mediabunny format', (await input.getFormat()).name);
  row('result', 'mediabunny mime', await input.getMimeType());

  const vt = await input.getPrimaryVideoTrack();
  if (!vt) {
    row('result', 'video track', 'none found');
    return;
  }
  const cfg = await vt.getDecoderConfig();
  row('result', 'video codec', `${await vt.getCodec()} / ${cfg?.codec ?? '?'}`);
  row('result', 'coded size', `${cfg?.codedWidth ?? '?'}x${cfg?.codedHeight ?? '?'}`);
  row(
    'result',
    'display size, rotation',
    `${await vt.getDisplayWidth()}x${await vt.getDisplayHeight()}, ${await vt.getRotation()} deg`,
  );
  const cs = cfg?.colorSpace;
  row(
    'result',
    'color space (HDR if transfer is hlg or pq)',
    cs
      ? `primaries=${cs.primaries} transfer=${cs.transfer} matrix=${cs.matrix} fullRange=${cs.fullRange}`
      : 'n/a',
  );
  const stats = await vt.computePacketStats(200);
  row('result', 'fps (avg of first 200 packets)', stats.averagePacketRate.toFixed(2));
  row('result', 'bitrate (avg)', (stats.averageBitrate / 1e6).toFixed(1) + ' Mbit/s');
  row('result', 'duration', (await vt.computeDuration()).toFixed(2) + ' s');

  let canDecode = false;
  try {
    canDecode = await vt.canDecode();
  } catch (err) {
    row('result', 'canDecode() error', err.message);
  }
  row('result', 'WebCodecs canDecode()', canDecode);
  if (cfg && 'VideoDecoder' in window) {
    try {
      const r = await VideoDecoder.isConfigSupported(cfg);
      row('result', 'VideoDecoder.isConfigSupported(track config)', r.supported);
    } catch (err) {
      row('result', 'VideoDecoder.isConfigSupported(track config)', 'error: ' + err.message);
    }
  }

  // decode one real frame near the start
  if (canDecode) {
    const t1 = performance.now();
    try {
      const sink = new VideoSampleSink(vt);
      const sample = await sink.getSample(await vt.getFirstTimestamp());
      if (sample) {
        row(
          'result',
          'first frame decoded',
          `ok ${sample.displayWidth}x${sample.displayHeight} format=${sample.format} in ${fmtMs(performance.now() - t1)}`,
        );
        sample.close();
      } else {
        row('result', 'first frame decoded', 'null sample');
      }
    } catch (err) {
      row('result', 'first frame decoded', 'FAILED: ' + err.message);
    }
  }

  const at = await input.getPrimaryAudioTrack();
  if (at) {
    const acfg = await at.getDecoderConfig();
    row(
      'result',
      'audio codec',
      `${await at.getCodec()} / ${acfg?.codec ?? '?'} ${acfg?.sampleRate ?? ''} Hz ${acfg?.numberOfChannels ?? ''} ch`,
    );
  } else {
    row('result', 'audio codec', 'none');
  }
}
