// Small color helpers for values the shaders get precomputed from the CPU side.

export type RGB = [number, number, number];

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(hue + 1 / 3), f(hue), f(hue - 1 / 3)];
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function rotateHue(c: RGB, degrees: number): RGB {
  if (degrees === 0) return c;
  const [h, s, l] = rgbToHsl(c);
  return hslToRgb(h + degrees, s, l);
}

// t in -1..1, positive is warmer. Applied to cast colors, not to the photo itself.
export function warm(c: RGB, t: number): RGB {
  return [clamp(c[0] * (1 + 0.18 * t)), clamp(c[1] * (1 + 0.03 * t)), clamp(c[2] * (1 - 0.22 * t))];
}

// White balance multiplier in linear light, normalized so luminance stays the same.
export function whiteBalance(temperature: number, tint: number): RGB {
  const t = temperature / 100;
  const g = tint / 100;
  const m: RGB = [(1 + 0.22 * t) * (1 + 0.06 * g), 1 - 0.14 * g, (1 - 0.26 * t) * (1 + 0.06 * g)];
  const lum = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  return [m[0] / lum, m[1] / lum, m[2] / lum];
}

const clamp = (x: number) => Math.min(1, Math.max(0, x));

// Shadow and highlight color for each Vintage Color Cast (spec 3.B).
export const CASTS: Record<string, { shadow: RGB; highlight: RGB }> = {
  warmYellow: { shadow: [0.5, 0.38, 0.2], highlight: [1.0, 0.88, 0.55] },
  fadedGreen: { shadow: [0.24, 0.42, 0.34], highlight: [0.84, 0.95, 0.78] },
  mutedBrown: { shadow: [0.4, 0.28, 0.2], highlight: [0.88, 0.74, 0.58] },
  warmPink: { shadow: [0.48, 0.28, 0.34], highlight: [1.0, 0.8, 0.84] },
  coolBlue: { shadow: [0.16, 0.28, 0.48], highlight: [0.8, 0.9, 1.0] },
  oliveFilm: { shadow: [0.32, 0.36, 0.16], highlight: [0.9, 0.92, 0.68] },
  sepiaLight: { shadow: [0.42, 0.3, 0.18], highlight: [0.98, 0.88, 0.7] },
};

export const LEAK_COLORS: Record<string, RGB> = {
  orange: [1.0, 0.46, 0.12],
  red: [1.0, 0.18, 0.1],
  yellow: [1.0, 0.82, 0.3],
  pink: [1.0, 0.55, 0.7],
};

export const BLEND_MODES = ['softLight', 'overlay', 'multiply', 'screen', 'color'];
