// Test scenes for the preset audit. Two real photos where we have them (portrait collage from the
// user, interior), synthetic stand ins for the rest. The synthetic ones are crude on purpose:
// they test tonal range, bright sources, dark noise and fine detail, not realism.

export type Scene = {
  id: string;
  label: string;
  synthetic: boolean;
  load: () => Promise<ImageBitmap>;
};

const W = 1200;
const H = 900;

function canvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return { c, g: c.getContext('2d')! };
}

// cheap deterministic noise so the scenes look the same on every run
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function texture(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  amp: number,
  seed: number,
) {
  const img = g.getImageData(x, y, w, h);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amp;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, x, y);
}

function grad(g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const l = g.createLinearGradient(0, y0, 0, y1);
  for (const [t, col] of stops) l.addColorStop(t, col);
  return l;
}

function person(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  skin: string,
  shirt: string,
) {
  g.fillStyle = shirt;
  g.beginPath();
  g.ellipse(x, y + s * 1.6, s * 0.95, s * 1.1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(x, y, s * 0.55, s * 0.68, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a2618';
  g.beginPath();
  g.ellipse(x, y - s * 0.45, s * 0.58, s * 0.3, 0, Math.PI, Math.PI * 2);
  g.fill();
}

function beach() {
  const { c, g } = canvas();
  g.fillStyle = grad(g, 0, 380, [
    [0, '#5d9fd8'],
    [1, '#cfe6f2'],
  ]);
  g.fillRect(0, 0, W, 380);
  g.fillStyle = grad(g, 380, 560, [
    [0, '#2b7fa6'],
    [1, '#4fb3b8'],
  ]);
  g.fillRect(0, 380, W, 180);
  const r = rng(3);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 260; i++) g.fillRect(r() * W, 385 + r() * 170, 8 + r() * 40, 2);
  g.fillStyle = grad(g, 560, H, [
    [0, '#e9d7a8'],
    [1, '#cfb27a'],
  ]);
  g.fillRect(0, 560, W, H - 560);
  // umbrella and towel
  g.fillStyle = '#d8322b';
  g.beginPath();
  g.moveTo(780, 520);
  g.quadraticCurveTo(900, 420, 1020, 520);
  g.fill();
  g.fillStyle = '#f2d23c';
  g.beginPath();
  g.moveTo(860, 520);
  g.quadraticCurveTo(900, 455, 940, 520);
  g.fill();
  g.fillStyle = '#ddd';
  g.fillRect(897, 520, 6, 200);
  g.fillStyle = '#2a6fd1';
  g.fillRect(760, 700, 260, 70);
  person(g, 380, 560, 70, '#e2a587', '#f4f4f0');
  person(g, 540, 600, 55, '#9c6646', '#1f8a4f');
  texture(g, 0, 0, W, H, 10, 1);
  return c;
}

function landscape() {
  const { c, g } = canvas();
  g.fillStyle = grad(g, 0, 420, [
    [0, '#7fb2e5'],
    [1, '#e3eef5'],
  ]);
  g.fillRect(0, 0, W, 420);
  const r = rng(5);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 18; i++) {
    g.beginPath();
    g.ellipse(100 + r() * 1000, 60 + r() * 180, 40 + r() * 80, 18 + r() * 25, 0, 0, Math.PI * 2);
    g.fill();
  }
  const hills: [number, string][] = [
    [380, '#6f9a6a'],
    [470, '#4f8a3e'],
    [580, '#3d7230'],
  ];
  for (const [y, col] of hills) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 20)
      g.lineTo(x, y + Math.sin(x * 0.006 + y) * 40 + Math.sin(x * 0.02) * 10);
    g.lineTo(W, H);
    g.fill();
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = 520 + r() * 340;
    g.fillStyle = r() > 0.5 ? '#24501f' : '#2f6326';
    g.beginPath();
    g.ellipse(x, y, 14 + r() * 20, 30 + r() * 30, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#e8e2d6';
  g.fillRect(820, 560, 120, 80);
  g.fillStyle = '#a8332a';
  g.beginPath();
  g.moveTo(805, 560);
  g.lineTo(880, 510);
  g.lineTo(955, 560);
  g.fill();
  texture(g, 0, 380, W, H - 380, 40, 2);
  texture(g, 0, 0, W, 380, 6, 3);
  return c;
}

function sunset() {
  const { c, g } = canvas();
  g.fillStyle = grad(g, 0, 560, [
    [0, '#1c2350'],
    [0.45, '#7a3a6a'],
    [0.8, '#f0743a'],
    [1, '#ffcf6a'],
  ]);
  g.fillRect(0, 0, W, 560);
  const glow = g.createRadialGradient(600, 520, 10, 600, 520, 320);
  glow.addColorStop(0, 'rgba(255,250,220,1)');
  glow.addColorStop(0.12, 'rgba(255,220,140,0.9)');
  glow.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = glow;
  g.fillRect(0, 200, W, 400);
  g.fillStyle = grad(g, 560, H, [
    [0, '#5a2f3e'],
    [1, '#120c1c'],
  ]);
  g.fillRect(0, 560, W, H - 560);
  const r = rng(9);
  for (let i = 0; i < 120; i++) {
    const y = 565 + r() * 200;
    const w = (1 - (y - 560) / 260) * 180 * r();
    g.fillStyle = `rgba(255,${180 + r() * 60},110,${0.5 + r() * 0.4})`;
    g.fillRect(600 - w / 2 + (r() - 0.5) * 30, y, w, 2);
  }
  // palm silhouette
  g.fillStyle = '#0a0710';
  g.beginPath();
  g.moveTo(170, H);
  g.quadraticCurveTo(200, 600, 260, 330);
  g.lineTo(272, 334);
  g.quadraticCurveTo(220, 600, 205, H);
  g.fill();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + i * 0.32;
    g.beginPath();
    g.moveTo(266, 330);
    g.quadraticCurveTo(
      266 + Math.cos(a) * 120,
      300 + Math.sin(a) * 60,
      266 + Math.cos(a) * 220,
      360 + Math.sin(a) * 40 + 40,
    );
    g.lineWidth = 14;
    g.strokeStyle = '#0a0710';
    g.stroke();
  }
  texture(g, 0, 0, W, H, 6, 4);
  return c;
}

function night() {
  const { c, g } = canvas();
  g.fillStyle = grad(g, 0, H, [
    [0, '#05070f'],
    [0.6, '#0d1426'],
    [1, '#141414'],
  ]);
  g.fillRect(0, 0, W, H);
  const r = rng(11);
  const buildings = [
    [40, 260, 220],
    [280, 180, 200],
    [500, 300, 180],
    [700, 140, 240],
    [960, 240, 220],
  ];
  for (const [x, top, w] of buildings) {
    g.fillStyle = '#10131c';
    g.fillRect(x!, top!, w!, 640 - top!);
    for (let wy = top! + 20; wy < 620; wy += 34) {
      for (let wx = x! + 14; wx < x! + w! - 20; wx += 30) {
        if (r() > 0.55) continue;
        g.fillStyle = r() > 0.3 ? '#f2c060' : '#9fc4ff';
        g.fillRect(wx, wy, 16, 20);
      }
    }
  }
  g.fillStyle = '#1b1b1d';
  g.fillRect(0, 640, W, H - 640);
  for (const x of [200, 600, 1000]) {
    const lamp = g.createRadialGradient(x, 600, 2, x, 600, 140);
    lamp.addColorStop(0, 'rgba(255,240,200,1)');
    lamp.addColorStop(0.08, 'rgba(255,200,120,0.85)');
    lamp.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = lamp;
    g.fillRect(x - 160, 440, 320, 320);
    g.fillStyle = '#2a2a2a';
    g.fillRect(x - 3, 600, 6, 140);
  }
  g.fillStyle = '#ff2f5a';
  g.font = 'bold 54px sans-serif';
  g.fillText('BAR', 735, 220);
  person(g, 420, 700, 40, '#b07a5c', '#3b3f7a');
  texture(g, 0, 0, W, H, 8, 5);
  return c;
}

function detail() {
  const { c, g } = canvas();
  g.fillStyle = '#808080';
  g.fillRect(0, 0, W, H);
  // zone plate
  const zp = g.createImageData(420, 420);
  for (let y = 0; y < 420; y++) {
    for (let x = 0; x < 420; x++) {
      const dx = x - 210;
      const dy = y - 210;
      const v = 128 + 127 * Math.cos((dx * dx + dy * dy) * 0.0045);
      const i = (y * 420 + x) * 4;
      zp.data[i] = zp.data[i + 1] = zp.data[i + 2] = v;
      zp.data[i + 3] = 255;
    }
  }
  g.putImageData(zp, 30, 30);
  // line pairs, getting finer
  let x = 480;
  for (const w of [12, 8, 6, 4, 3, 2, 1]) {
    for (let i = 0; i < 6; i++) {
      g.fillStyle = i % 2 ? '#f0f0f0' : '#101010';
      g.fillRect(x + i * w, 30, w, 200);
      g.fillRect(480, 250 + (x - 480) / 4 + i * w * 0.5, 0, 0);
    }
    x += 6 * w + 18;
  }
  // horizontal line pairs, interlacing and scanline victims
  let y = 250;
  for (const h of [8, 4, 2, 1]) {
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? '#f0f0f0' : '#101010';
      g.fillRect(480, y + i * h, 300, h);
    }
    y += 10 * h + 12;
  }
  // text at shrinking sizes
  g.fillStyle = '#111';
  let ty = 40;
  for (const s of [32, 22, 16, 12, 9]) {
    g.font = `${s}px sans-serif`;
    g.fillText('Sommer 1997 Ferien', 830, ty + s);
    ty += s + 16;
  }
  // color patches: primaries, skin tones, sky, foliage
  const patches = [
    '#735244',
    '#c29682',
    '#627a9d',
    '#576c43',
    '#8580b1',
    '#67bdaa',
    '#d67e2c',
    '#505ba6',
    '#c15a63',
    '#5e3c6c',
    '#9dbc40',
    '#e0a32e',
    '#383d96',
    '#469449',
    '#af363c',
    '#e7c71f',
    '#bb5695',
    '#0885a1',
    '#f3f3f2',
    '#c8c8c8',
    '#a0a0a0',
    '#7a7a7a',
    '#555555',
    '#343434',
  ];
  patches.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(30 + (i % 6) * 75, 480 + Math.floor(i / 6) * 75, 70, 70);
  });
  // gray ramp
  for (let i = 0; i < 64; i++) {
    const v = Math.round((i / 63) * 255);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(500 + i * 10.5, 800, 11, 70);
  }
  // red on blue edge, where chroma bleed shows first
  g.fillStyle = '#1e3caa';
  g.fillRect(830, 480, 340, 280);
  g.fillStyle = '#d42020';
  g.fillRect(900, 540, 200, 160);
  g.fillStyle = '#f5f5f5';
  g.fillRect(960, 590, 80, 60);
  return c;
}

async function fromCanvas(c: HTMLCanvasElement) {
  return createImageBitmap(c);
}

async function fromUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
  return createImageBitmap(await res.blob(), { imageOrientation: 'from-image' });
}

export const SCENES: Scene[] = [
  {
    id: 'portrait',
    label: 'Porträt (Referenz 01)',
    synthetic: false,
    load: () =>
      fromUrl(
        new URL(
          '../../docs/looks/references/user-reference-01-camcorder-digicam.png',
          import.meta.url,
        ).href,
      ),
  },
  { id: 'beach', label: 'Strand', synthetic: true, load: () => fromCanvas(beach()) },
  { id: 'landscape', label: 'Landschaft', synthetic: true, load: () => fromCanvas(landscape()) },
  { id: 'sunset', label: 'Sonnenuntergang', synthetic: true, load: () => fromCanvas(sunset()) },
  {
    id: 'interior',
    label: 'Innenaufnahme',
    synthetic: false,
    load: () => fromUrl('/testmedia/Image.jpg'),
  },
  { id: 'night', label: 'Nacht', synthetic: true, load: () => fromCanvas(night()) },
  { id: 'group', label: 'Gruppe (synthetisch)', synthetic: true, load: () => fromCanvas(group()) },
  { id: 'detail', label: 'Feine Details', synthetic: true, load: () => fromCanvas(detail()) },
];

function group() {
  const { c, g } = canvas();
  g.fillStyle = grad(g, 0, H, [
    [0, '#9cc0d8'],
    [0.55, '#d8d0b8'],
    [1, '#6f8a52'],
  ]);
  g.fillRect(0, 0, W, H);
  const tones = ['#f1c7a9', '#e2a587', '#c68863', '#9c6646', '#6b4430', '#f0b998'];
  const shirts = ['#c8312c', '#2a5fb8', '#f2f2ee', '#e8b42a', '#1f8a4f', '#7a3c8c'];
  tones.forEach((t, i) => person(g, 150 + i * 180, 420 + (i % 2) * 50, 62, t, shirts[i]!));
  texture(g, 0, 0, W, H, 12, 6);
  return c;
}
