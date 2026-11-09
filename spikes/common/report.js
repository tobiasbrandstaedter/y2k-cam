// Shared helpers for the spike pages. Throwaway quality, keep it readable.

export function $(id) {
  return document.getElementById(id);
}

export function log(line) {
  const pre = $('log');
  pre.textContent += line + '\n';
  pre.scrollTop = pre.scrollHeight;
  console.log(line);
}

// Writes key/value rows into a <table id=...>. Replaces the row if the key exists.
export function row(tableId, key, value) {
  const table = $(tableId);
  let tr = table.querySelector(`tr[data-key="${CSS.escape(key)}"]`);
  if (!tr) {
    tr = document.createElement('tr');
    tr.dataset.key = key;
    tr.innerHTML = '<th></th><td></td>';
    table.appendChild(tr);
  }
  tr.children[0].textContent = key;
  tr.children[1].textContent = String(value);
}

export function fmtBytes(n) {
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function fmtMs(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms.toFixed(0) + ' ms';
}

export function deviceInfo(tableId) {
  row(tableId, 'userAgent', navigator.userAgent);
  row(tableId, 'standalone (home screen)', navigator.standalone === true ? 'yes' : 'no');
  row(
    tableId,
    'secure context',
    window.isSecureContext ? 'yes' : 'no (WebCodecs and share will fail)',
  );
  row(tableId, 'screen', `${screen.width}x${screen.height} @${devicePixelRatio}`);
  row(tableId, 'hardwareConcurrency', navigator.hardwareConcurrency ?? 'n/a');
}

// Checks every API the ADR relies on and writes yes/no into the table.
export async function capabilities(tableId) {
  const has = (cond) => (cond ? 'yes' : 'no');
  row(tableId, 'VideoDecoder', has('VideoDecoder' in window));
  row(tableId, 'VideoEncoder', has('VideoEncoder' in window));
  row(tableId, 'AudioDecoder', has('AudioDecoder' in window));
  row(tableId, 'AudioEncoder', has('AudioEncoder' in window));
  row(tableId, 'OffscreenCanvas', has('OffscreenCanvas' in window));
  row(tableId, 'WebGL2', has(!!document.createElement('canvas').getContext('webgl2')));
  row(tableId, 'WebGPU (navigator.gpu)', has('gpu' in navigator));
  row(
    tableId,
    'MediaRecorder video/mp4',
    has(window.MediaRecorder && MediaRecorder.isTypeSupported('video/mp4')),
  );
  row(
    tableId,
    'MediaRecorder video/webm',
    has(window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm')),
  );
  row(tableId, 'navigator.share', has('share' in navigator));
  const probeFile = new File(['x'], 'x.mp4', { type: 'video/mp4' });
  row(
    tableId,
    'navigator.canShare({files})',
    has(navigator.canShare && navigator.canShare({ files: [probeFile] })),
  );
  row(tableId, 'getUserMedia', has(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  row(tableId, 'indexedDB', has('indexedDB' in window));
  row(tableId, 'OPFS getDirectory', has(navigator.storage && navigator.storage.getDirectory));
  row(
    tableId,
    'requestVideoFrameCallback',
    has('requestVideoFrameCallback' in HTMLVideoElement.prototype),
  );

  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    row(tableId, 'storage quota', fmtBytes(est.quota) + ' (used ' + fmtBytes(est.usage) + ')');
  }
  if (navigator.storage?.persisted) {
    row(tableId, 'storage persisted()', await navigator.storage.persisted());
  }

  if ('VideoEncoder' in window) {
    for (const codec of ['avc1.42001f', 'avc1.4d002a', 'avc1.640028', 'hvc1.1.6.L120.B0']) {
      try {
        const r = await VideoEncoder.isConfigSupported({
          codec,
          width: 1920,
          height: 1080,
          bitrate: 8e6,
          framerate: 30,
        });
        row(tableId, `VideoEncoder 1080p ${codec}`, has(r.supported));
      } catch (e) {
        row(tableId, `VideoEncoder 1080p ${codec}`, 'error: ' + e.message);
      }
    }
  }
  if ('VideoDecoder' in window) {
    for (const codec of ['avc1.640028', 'hvc1.1.6.L120.B0', 'hvc1.2.4.L120.B0']) {
      try {
        const r = await VideoDecoder.isConfigSupported({
          codec,
          codedWidth: 1920,
          codedHeight: 1080,
        });
        row(tableId, `VideoDecoder ${codec}`, has(r.supported));
      } catch (e) {
        row(tableId, `VideoDecoder ${codec}`, 'error: ' + e.message);
      }
    }
  }
  if ('AudioEncoder' in window) {
    try {
      const r = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 128000,
      });
      row(tableId, 'AudioEncoder aac', has(r.supported));
    } catch (e) {
      row(tableId, 'AudioEncoder aac', 'error: ' + e.message);
    }
  }
}

// Reads the first bytes and names the real container, independent of file.type.
export async function sniffContainer(file) {
  const buf = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (from, len) => String.fromCharCode(...buf.slice(from, from + len));
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'JPEG';
  if (buf[0] === 0x89 && ascii(1, 3) === 'PNG') return 'PNG';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'WebP';
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heif'].includes(brand)) {
      return `HEIF (ftyp ${brand})`;
    }
    if (brand === 'qt  ') return 'QuickTime MOV (ftyp qt)';
    return `ISOBMFF MP4 (ftyp ${brand})`;
  }
  const hex = Array.from(buf.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join(' ');
  return 'unknown (' + hex + ')';
}

// Shares a Blob through the OS share sheet, falls back to a download link.
export async function shareOrDownload(blob, filename, linkEl) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared via share sheet';
    } catch (e) {
      if (e.name === 'AbortError') return 'share cancelled';
      log('share failed: ' + e.message);
    }
  }
  linkEl.href = URL.createObjectURL(blob);
  linkEl.download = filename;
  linkEl.textContent = 'Download ' + filename;
  linkEl.hidden = false;
  return 'share not available, download link shown';
}
