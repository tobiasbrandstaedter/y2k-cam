import { readJpegMeta } from './exif';

export type LoadedImage = {
  bitmap: ImageBitmap;
  name: string;
  width: number;
  height: number;
  isJpeg: boolean;
  // capture date from EXIF, else the file date; drives the automatic Datumsstempel
  date: Date;
  app1?: Uint8Array;
};

const ACCEPTED = /\.(jpe?g|png|webp|heic|heif)$/i;
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif';

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/') && !ACCEPTED.test(file.name)) {
    throw new Error(`"${file.name}" ist kein Bild. Unterstützt werden JPG, JPEG, PNG und WebP.`);
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(
      `"${file.name}" konnte nicht gelesen werden. Unterstützt werden JPG, JPEG, PNG und WebP; HEIC nur in Safari.`,
    );
  }
  const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
  const meta = isJpeg ? readJpegMeta(new Uint8Array(await file.arrayBuffer())) : {};
  return {
    bitmap,
    name: file.name,
    width: bitmap.width,
    height: bitmap.height,
    isJpeg,
    date: meta.date ?? new Date(file.lastModified || Date.now()),
    app1: meta.app1,
  };
}
