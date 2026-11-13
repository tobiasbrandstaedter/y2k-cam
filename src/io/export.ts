// Export (spec 8): render once at the target size, encode once. Size optimization re-encodes the
// same pixels with different quality values, it never re-compresses an already compressed file.

import type { EditState } from '../editor/effects';
import { MAX_CANVAS_AREA, type Renderer } from '../render/renderer';
import { exifForExport, insertExif } from './exif';
import type { LoadedImage } from './load';

export type ExportFormat = 'jpeg' | 'png' | 'webp';

export type ExportOptions = {
  format: ExportFormat;
  quality: number; // 1..100
  size: 'original' | 'custom';
  longEdge: number;
  optimize: boolean;
  targetKB: number;
  keepMeta: boolean;
  compare: boolean;
};

export type ExportResult = {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  notes: string[];
};

export const MIME: Record<ExportFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT: Record<ExportFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

let webpSupport: Promise<boolean> | null = null;
// Safari before 18 silently writes PNG when asked for WebP
export function canEncodeWebp(): Promise<boolean> {
  webpSupport ??= new Promise((resolve) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    c.toBlob((b) => resolve(b?.type === 'image/webp'), 'image/webp');
  });
  return webpSupport;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(
              new Error(
                'Das Bild konnte nicht kodiert werden. Bitte eine kleinere Auflösung wählen.',
              ),
            ),
      type,
      quality,
    ),
  );
}

export function exportSize(
  image: { width: number; height: number },
  opts: ExportOptions,
  maxTexture: number,
): { width: number; height: number; capped: boolean } {
  let scale = 1;
  if (opts.size === 'custom' && opts.longEdge > 0) {
    scale = opts.longEdge / Math.max(image.width, image.height);
  }
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  let capped = false;
  const textureScale = maxTexture / Math.max(width, height);
  const areaScale = Math.sqrt(MAX_CANVAS_AREA / (width * height * (opts.compare ? 2 : 1)));
  const limit = Math.min(1, textureScale, areaScale);
  if (limit < 1) {
    width = Math.floor(width * limit);
    height = Math.floor(height * limit);
    capped = true;
  }
  return { width, height, capped };
}

export async function exportImage(
  renderer: Renderer,
  state: EditState,
  image: LoadedImage,
  opts: ExportOptions,
): Promise<ExportResult> {
  const notes: string[] = [];
  let format = opts.format;
  if (format === 'webp' && !(await canEncodeWebp())) {
    format = 'png';
    notes.push('Dieser Browser kann kein WebP schreiben, exportiert wurde PNG.');
  }

  const { width, height, capped } = exportSize(image, opts, renderer.maxTexture);
  if (capped) {
    notes.push(`Auf ${width} × ${height} verkleinert, größer kann der Browser nicht exportieren.`);
  }

  const pixels = renderer.renderPixels(state, width, height, { date: image.date });
  renderer.releaseTargets();

  const canvas = document.createElement('canvas');
  canvas.width = opts.compare ? width * 2 : width;
  canvas.height = height;
  const g = canvas.getContext('2d')!;
  const edited = new ImageData(pixels, width, height);
  if (opts.compare) {
    g.drawImage(image.bitmap, 0, 0, width, height);
    g.putImageData(edited, width, 0);
    g.fillStyle = '#fff';
    g.fillRect(width - 1, 0, 2, height);
  } else {
    g.putImageData(edited, 0, 0);
  }

  const lossy = format !== 'png';
  const type = MIME[format];
  const exif = opts.keepMeta && format === 'jpeg' && image.app1 ? exifForExport(image.app1) : null;
  // the EXIF block is added after encoding, so it has to fit into the size budget as well
  const budget = opts.targetKB * 1024 - (exif?.length ?? 0);
  let quality = opts.quality / 100;
  let blob = await toBlob(canvas, type, lossy ? quality : undefined);

  if (opts.optimize && lossy && blob.size > budget) {
    // binary search on quality, always from the same pixels
    let lo = 0.05;
    let hi = quality;
    let best: Blob | null = null;
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const b = await toBlob(canvas, type, q);
      if (b.size <= budget) {
        best = b;
        lo = q;
      } else {
        hi = q;
      }
    }
    if (best) {
      blob = best;
      quality = lo;
      notes.push(
        `Qualität auf ${Math.round(quality * 100)} gesenkt, um unter ${opts.targetKB} KB zu bleiben.`,
      );
    } else {
      notes.push(
        `${opts.targetKB} KB sind bei dieser Auflösung nicht erreichbar. Bitte die Auflösung verringern.`,
      );
    }
  } else if (opts.optimize && !lossy) {
    notes.push(
      'PNG ist verlustfrei, die Dateigröße lässt sich dort nicht über die Qualität steuern.',
    );
  }

  if (opts.keepMeta) {
    if (exif) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      blob = new Blob([insertExif(bytes, exif) as Uint8Array<ArrayBuffer>], {
        type,
      });
    } else if (format !== 'jpeg') {
      notes.push('Metadaten werden nur beim JPEG-Export übernommen.');
    } else {
      notes.push('Das Originalbild enthält keine EXIF-Metadaten.');
    }
  }

  const base = image.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${base}-y2k${opts.compare ? '-vergleich' : ''}.${EXT[format]}`,
    width: canvas.width,
    height,
    notes,
  };
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canShareFile(blob: Blob, name: string): boolean {
  const file = new File([blob], name, { type: blob.type });
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

export async function share(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type });
  await navigator.share({ files: [file] });
}
