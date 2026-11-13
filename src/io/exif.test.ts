import { describe, expect, it } from 'vitest';
import { exifForExport, insertExif, readJpegMeta } from './exif';

// Builds a tiny JPEG skeleton: SOI, APP1 with a little-endian TIFF block, SOS, EOI.
// IFD0: Orientation = 6, ExifIFD pointer, next IFD = thumbnail at some offset.
// ExifIFD: DateTimeOriginal.
function fakeJpeg(): Uint8Array {
  const tiff: number[] = [];
  const u16 = (v: number) => tiff.push(v & 0xff, v >> 8);
  const u32 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24);
  const date = '2003:03:20 15:20:00\0';

  tiff.push(0x49, 0x49); // II
  u16(42);
  u32(8); // IFD0 at 8
  // IFD0 with 2 entries: 8 + 2 + 24 + 4 = 38
  u16(2);
  u16(0x0112); // orientation
  u16(3);
  u32(1);
  u16(6);
  u16(0);
  u16(0x8769); // exif pointer
  u16(4);
  u32(1);
  u32(38);
  u32(500); // next IFD (thumbnail), should be cut on export
  // ExifIFD at 38 with 1 entry: 38 + 2 + 12 + 4 = 56
  u16(1);
  u16(0x9003);
  u16(2);
  u32(date.length);
  u32(56);
  u32(0);
  for (const ch of date) tiff.push(ch.charCodeAt(0));

  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    len >> 8,
    len & 0xff,
    ...payload,
    0xff,
    0xda,
    0,
    2,
    0xff,
    0xd9,
  ]);
}

describe('exif', () => {
  it('reads DateTimeOriginal as local time', () => {
    const meta = readJpegMeta(fakeJpeg());
    expect(meta.date).toEqual(new Date(2003, 2, 20, 15, 20, 0));
    expect(meta.app1?.[0]).toBe(0xff);
    expect(meta.app1?.[1]).toBe(0xe1);
  });

  it('returns nothing for files without EXIF', () => {
    expect(readJpegMeta(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toEqual({});
    expect(readJpegMeta(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toEqual({});
  });

  it('sets orientation to 1 and drops the thumbnail link for export', () => {
    const app1 = readJpegMeta(fakeJpeg()).app1!;
    const out = exifForExport(app1);
    const view = new DataView(out.buffer, out.byteOffset);
    const tiff = 10;
    expect(view.getUint16(tiff + 8 + 2 + 8, true)).toBe(1);
    expect(view.getUint32(tiff + 8 + 2 + 24, true)).toBe(0);
    // the original block is untouched
    expect(new DataView(app1.buffer, app1.byteOffset).getUint16(tiff + 8 + 2 + 8, true)).toBe(6);
  });

  it('inserts the block after the JFIF segment', () => {
    const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
    const app1 = readJpegMeta(fakeJpeg()).app1!;
    const out = insertExif(jfif, app1);
    expect([...out.subarray(0, 8)]).toEqual([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2]);
    expect([...out.subarray(8, 10)]).toEqual([0xff, 0xe1]);
    expect(readJpegMeta(out).date).toEqual(new Date(2003, 2, 20, 15, 20, 0));
  });
});
