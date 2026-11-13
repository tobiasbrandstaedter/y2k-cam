// Seven segment digits for the Datumsstempel (BS-1). Date backs of film cameras and many
// digicams burned the date in with LED or LCD segments, slightly slanted, in orange or yellow.
// Drawn as shapes in Canvas 2D, so no extra font file and no license question.

// segments a..g as bits: a top, b top right, c bottom right, d bottom, e bottom left,
// f top left, g middle
const A = 1;
const B = 2;
const C = 4;
const D = 8;
const E = 16;
const F = 32;
const G = 64;

export const SEGMENTS: Record<string, number> = {
  '0': A | B | C | D | E | F,
  '1': B | C,
  '2': A | B | D | E | G,
  '3': A | B | C | D | G,
  '4': B | C | F | G,
  '5': A | C | D | F | G,
  '6': A | C | D | E | F | G,
  '7': A | B | C,
  '8': A | B | C | D | E | F | G,
  '9': A | B | C | D | F | G,
  '-': G,
  A: A | B | C | E | F | G,
  P: A | B | E | F | G,
  C: A | D | E | F,
  E: A | D | E | F | G,
  F: A | E | F | G,
  H: B | C | E | F | G,
  L: D | E | F,
  U: B | C | D | E | F,
  J: B | C | D | E,
  b: C | D | E | F | G,
  d: B | C | D | E | G,
  n: C | E | G,
  o: C | D | E | G,
  r: E | G,
  t: D | E | F | G,
  y: B | C | D | F | G,
};

// width of each character in units of the font size
function advance(ch: string): number | null {
  if (ch in SEGMENTS) return 0.68;
  if (ch === ':' || ch === '.' || ch === "'") return 0.26;
  if (ch === ' ') return 0.42;
  if (ch === '/') return 0.5;
  return null;
}

type Ctx = OffscreenCanvasRenderingContext2D;

// Letters a seven segment display cannot show (M, R, ...) fall back to the regular font.
export function segmentWidth(g: Ctx, text: string, fs: number): number {
  let w = 0;
  for (const ch of text) {
    const adv = advance(ch);
    w += adv === null ? g.measureText(ch).width : adv * fs;
  }
  return w;
}

export function drawSegments(g: Ctx, text: string, x: number, y: number, fs: number) {
  const h = fs * 0.82; // digit height
  const w = fs * 0.5; // digit width
  const th = fs * 0.105; // segment thickness
  const top = y - h / 2;
  // slanted like the real displays
  const sx = (px: number, py: number) => px + (y - py) * 0.1;
  g.strokeStyle = g.fillStyle;

  const hBar = (x0: number, x1: number, yy: number) => {
    const t = th / 2;
    g.beginPath();
    g.moveTo(sx(x0, yy), yy);
    g.lineTo(sx(x0 + t, yy - t), yy - t);
    g.lineTo(sx(x1 - t, yy - t), yy - t);
    g.lineTo(sx(x1, yy), yy);
    g.lineTo(sx(x1 - t, yy + t), yy + t);
    g.lineTo(sx(x0 + t, yy + t), yy + t);
    g.closePath();
    g.fill();
  };
  const vBar = (xx: number, y0: number, y1: number) => {
    const t = th / 2;
    g.beginPath();
    g.moveTo(sx(xx, y0), y0);
    g.lineTo(sx(xx + t, y0 + t), y0 + t);
    g.lineTo(sx(xx + t, y1 - t), y1 - t);
    g.lineTo(sx(xx, y1), y1);
    g.lineTo(sx(xx - t, y1 - t), y1 - t);
    g.lineTo(sx(xx - t, y0 + t), y0 + t);
    g.closePath();
    g.fill();
  };
  const dot = (xx: number, yy: number) => {
    g.beginPath();
    g.arc(sx(xx, yy), yy, th * 0.62, 0, Math.PI * 2);
    g.fill();
  };

  let cx = x;
  for (const ch of text) {
    const bits = SEGMENTS[ch];
    if (bits !== undefined) {
      // small gaps between the segments, as on the real thing
      const gap = th * 0.18;
      const l = cx + th / 2 + fs * 0.06;
      const r = l + w - th;
      const mid = top + h / 2;
      if (bits & A) hBar(l + gap, r - gap, top + th / 2);
      if (bits & G) hBar(l + gap, r - gap, mid);
      if (bits & D) hBar(l + gap, r - gap, top + h - th / 2);
      if (bits & F) vBar(l, top + th / 2 + gap, mid - gap);
      if (bits & B) vBar(r, top + th / 2 + gap, mid - gap);
      if (bits & E) vBar(l, mid + gap, top + h - th / 2 - gap);
      if (bits & C) vBar(r, mid + gap, top + h - th / 2 - gap);
      cx += fs * 0.68;
      continue;
    }
    const adv = advance(ch);
    if (ch === ':') {
      dot(cx + fs * 0.13, top + h * 0.3);
      dot(cx + fs * 0.13, top + h * 0.72);
    } else if (ch === '.') {
      dot(cx + fs * 0.13, top + h - th / 2);
    } else if (ch === "'") {
      vBar(cx + fs * 0.13, top, top + h * 0.3);
    } else if (ch === '/') {
      g.beginPath();
      g.lineWidth = th * 0.9;
      g.moveTo(sx(cx + fs * 0.1, top + h), top + h);
      g.lineTo(sx(cx + fs * 0.4, top), top);
      g.stroke();
    } else if (adv === null) {
      g.fillText(ch, cx, y);
      cx += g.measureText(ch).width;
      continue;
    }
    cx += (adv ?? 0) * fs;
  }
}
