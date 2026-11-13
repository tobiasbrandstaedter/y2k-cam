// Just enough JPEG/EXIF handling for two jobs: read the capture date for the overlay, and copy
// the EXIF block into a JPEG export ("Metadaten erhalten", spec 8).

export type JpegMeta = { date?: Date; app1?: Uint8Array };

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0, 0]; // "Exif\0\0"

type Tiff = { view: DataView; start: number; little: boolean };

function findApp1(bytes: Uint8Array): { start: number; end: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    // start of scan: no more metadata after this
    if (marker === 0xda) return null;
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (marker === 0xe1 && EXIF_HEADER.every((b, k) => bytes[i + 4 + k] === b)) {
      return { start: i, end: i + 2 + len };
    }
    i += 2 + len;
  }
  return null;
}

function tiffOf(app1: Uint8Array): Tiff | null {
  const start = 10; // marker (2) + length (2) + "Exif\0\0" (6)
  const view = new DataView(app1.buffer, app1.byteOffset, app1.byteLength);
  if (view.byteLength < start + 8) return null;
  const order = view.getUint16(start);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  return { view, start, little: order === 0x4949 };
}

function ifdEntries(t: Tiff, offset: number): { tag: number; at: number }[] {
  const base = t.start + offset;
  if (base + 2 > t.view.byteLength) return [];
  const count = t.view.getUint16(base, t.little);
  const out = [];
  for (let i = 0; i < count; i++) {
    const at = base + 2 + i * 12;
    if (at + 12 > t.view.byteLength) break;
    out.push({ tag: t.view.getUint16(at, t.little), at });
  }
  return out;
}

function readAscii(t: Tiff, entryAt: number): string {
  const count = t.view.getUint32(entryAt + 4, t.little);
  const offset = count > 4 ? t.start + t.view.getUint32(entryAt + 8, t.little) : entryAt + 8;
  let s = '';
  for (let i = 0; i < count - 1 && offset + i < t.view.byteLength; i++) {
    s += String.fromCharCode(t.view.getUint8(offset + i));
  }
  return s;
}

// "2003:03:20 15:20:00" in local time, the way cameras store it
function parseExifDate(s: string): Date | undefined {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return undefined;
  const d = new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!);
  return isNaN(d.getTime()) || d.getFullYear() < 1980 ? undefined : d;
}

export function readJpegMeta(bytes: Uint8Array): JpegMeta {
  const loc = findApp1(bytes);
  if (!loc) return {};
  const app1 = bytes.slice(loc.start, loc.end);
  const t = tiffOf(app1);
  if (!t) return { app1 };

  const ifd0 = ifdEntries(t, t.view.getUint32(t.start + 4, t.little));
  let date: Date | undefined;
  const exifPtr = ifd0.find((e) => e.tag === 0x8769);
  if (exifPtr) {
    const sub = ifdEntries(t, t.view.getUint32(exifPtr.at + 8, t.little));
    const original = sub.find((e) => e.tag === 0x9003);
    if (original) date = parseExifDate(readAscii(t, original.at));
  }
  if (!date) {
    const plain = ifd0.find((e) => e.tag === 0x0132);
    if (plain) date = parseExifDate(readAscii(t, plain.at));
  }
  return { date, app1 };
}

// Copy of the EXIF block that fits the exported pixels: orientation 1 (we already rotated), and no
// embedded thumbnail, which would still show the unedited photo in some viewers.
export function exifForExport(app1: Uint8Array): Uint8Array {
  const copy = app1.slice();
  const t = tiffOf(copy);
  if (!t) return copy;
  const ifd0Offset = t.view.getUint32(t.start + 4, t.little);
  const entries = ifdEntries(t, ifd0Offset);
  for (const e of entries) {
    if (e.tag === 0x0112) t.view.setUint16(e.at + 8, 1, t.little);
  }
  const nextIfdAt = t.start + ifd0Offset + 2 + entries.length * 12;
  if (nextIfdAt + 4 <= t.view.byteLength) t.view.setUint32(nextIfdAt, 0, t.little);
  return copy;
}

// Puts the APP1 block right after SOI and the JFIF APP0 segment of an encoded JPEG.
export function insertExif(jpeg: Uint8Array, app1: Uint8Array): Uint8Array {
  let at = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) at = 4 + ((jpeg[4]! << 8) | jpeg[5]!);
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, at), 0);
  out.set(app1, at);
  out.set(jpeg.subarray(at), at + app1.length);
  return out;
}
