import type { CurvePoint, Curves } from './effects';

// Monotone cubic interpolation (Fritsch and Carlson). Plain cubic splines overshoot between
// close points and produce curves that dip below 0 or bend backwards, which looks broken.
export function curveFn(points: CurvePoint[]): (x: number) => number {
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  if (n === 0) return (x) => x;
  if (n === 1) return () => pts[0]![1];

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = xs[i + 1]! - xs[i]!;
    slopes.push(dx === 0 ? 0 : (ys[i + 1]! - ys[i]!) / dx);
  }

  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]!;
    const b = slopes[i]!;
    tangents.push(a * b <= 0 ? 0 : (a + b) / 2);
  }
  tangents.push(slopes[n - 2]!);

  for (let i = 0; i < n - 1; i++) {
    const s = slopes[i]!;
    if (s === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i]! / s;
    const b = tangents[i + 1]! / s;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangents[i] = t * a * s;
      tangents[i + 1] = t * b * s;
    }
  }

  return (x) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (x - xs[i]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! +
      (t3 - 2 * t2 + t) * h * tangents[i]! +
      (-2 * t3 + 3 * t2) * ys[i + 1]! +
      (t3 - t2) * h * tangents[i + 1]!
    );
  };
}

// 256 entries per channel, master curve applied first, then the channel curve.
export function buildLut(curves: Curves): Uint8Array {
  const master = curveFn(curves.master);
  const channels = [curveFn(curves.r), curveFn(curves.g), curveFn(curves.b)];
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const m = clamp01(master(i / 255));
    for (let c = 0; c < 3; c++) {
      lut[i * 4 + c] = Math.round(clamp01(channels[c]!(m)) * 255);
    }
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

export function isIdentity(points: CurvePoint[]): boolean {
  return points.every(([x, y]) => Math.abs(x - y) < 1e-4);
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
