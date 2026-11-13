// Preset audit harness. Renders every preset of the baseline (pipeline before the VHS rework) or
// of the current src/ on the same scenes, and measures how different they are.
//
//   ?view=grid&set=new&scenes=portrait,beach&h=200      grid: presets x scenes
//   ?view=compare&preset=vhsTape&old=vhsTape&h=220      original / baseline / current, per scene
//   window.audit.metrics('new')                         numbers for the audit report

import '@fontsource/vt323';
import { SCENES } from './scenes';

type Mod = {
  Renderer: new (c: HTMLCanvasElement) => {
    setImage(b: ImageBitmap): void;
    renderPixels(s: unknown, w: number, h: number, meta: { date: Date }): Uint8ClampedArray;
  };
  presets: { id: string; name: string; hint: string; category?: string; edit: unknown }[];
  state: (edit: unknown) => unknown;
};

async function load(set: string): Promise<Mod> {
  if (set === 'old') {
    const [r, p, e] = await Promise.all([
      import('./baseline/render/renderer'),
      import('./baseline/editor/presets'),
      import('./baseline/editor/effects'),
    ]);
    return {
      Renderer: r.Renderer as unknown as Mod['Renderer'],
      presets: p.PRESETS,
      state: (edit) => e.applyPartial(e.defaultState(), edit as never),
    };
  }
  const [r, p, e] = await Promise.all([
    import('../../src/render/renderer'),
    import('../../src/editor/presets'),
    import('../../src/editor/effects'),
  ]);
  return {
    Renderer: r.Renderer as unknown as Mod['Renderer'],
    presets: p.PRESETS as Mod['presets'],
    state: (edit) => e.applyPartial(e.defaultState(), edit as never),
  };
}

const DATE = new Date(1997, 6, 14, 15, 20);
const bitmaps = new Map<string, ImageBitmap>();
async function bitmap(id: string) {
  if (!bitmaps.has(id)) bitmaps.set(id, await SCENES.find((s) => s.id === id)!.load());
  return bitmaps.get(id)!;
}

function size(b: ImageBitmap, h: number) {
  return { w: Math.round((b.width / b.height) * h), h };
}

const renderers = new Map<string, InstanceType<Mod['Renderer']>>();
function rendererFor(mod: Mod, set: string) {
  if (!renderers.has(set)) renderers.set(set, new mod.Renderer(document.createElement('canvas')));
  return renderers.get(set)!;
}

async function pixels(mod: Mod, set: string, scene: string, edit: unknown | null, h: number) {
  const b = await bitmap(scene);
  const { w } = size(b, h);
  if (edit === null) {
    const c = new OffscreenCanvas(w, h);
    const g = c.getContext('2d')!;
    g.drawImage(b, 0, 0, w, h);
    return { w, h, px: g.getImageData(0, 0, w, h).data };
  }
  const r = rendererFor(mod, set);
  r.setImage(b);
  return { w, h, px: r.renderPixels(mod.state(edit), w, h, { date: DATE }) };
}

function toCanvas({ w, h, px }: { w: number; h: number; px: Uint8ClampedArray }) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
  return c;
}

const q = new URLSearchParams(location.search);
const H = Number(q.get('h') ?? 200);
const sceneIds = (q.get('scenes') ?? SCENES.map((s) => s.id).join(',')).split(',');
const status = document.getElementById('status')!;
const out = document.getElementById('out')!;

function cell(el: Node | string, cls = '') {
  const td = document.createElement('td');
  if (cls) td.className = cls;
  td.append(el);
  return td;
}

async function grid() {
  const set = q.get('set') ?? 'new';
  const mod = await load(set);
  const only = q.get('presets')?.split(',');
  const list = mod.presets.filter((p) => !only || only.includes(p.id));
  const table = document.createElement('table');
  const head = document.createElement('tr');
  head.append(cell(''));
  for (const s of sceneIds) head.append(cell(SCENES.find((x) => x.id === s)!.label));
  table.append(head);
  const rows: [string, string, unknown | null][] = [
    ['original', 'Original', null],
    ...list.map((p) => [p.id, p.name, p.edit] as [string, string, unknown]),
  ];
  if (q.get('original') === '0') rows.shift();
  out.append(table);
  for (const [id, name, edit] of rows) {
    const tr = document.createElement('tr');
    const label = document.createElement('div');
    const p = list.find((x) => x.id === id);
    label.innerHTML = `${name}<div class="hint">${p?.category ?? ''}</div>`;
    tr.append(cell(label, 'name'));
    for (const s of sceneIds) tr.append(cell(toCanvas(await pixels(mod, set, s, edit, H))));
    table.append(tr);
  }
}

async function compare(newId = q.get('preset')!, oldId = q.get('old')) {
  const [oldMod, newMod] = await Promise.all([load('old'), load('new')]);
  out.innerHTML = '';
  const np = newMod.presets.find((p) => p.id === newId)!;
  const op = oldId ? oldMod.presets.find((p) => p.id === oldId) : undefined;
  const table = document.createElement('table');
  const head = document.createElement('tr');
  head.append(
    cell(''),
    cell('Original'),
    cell(op ? `vorher: ${op.name}` : 'vorher: (neu)'),
    cell(`nachher: ${np.name}`),
  );
  table.append(head);
  out.append(table);
  for (const s of sceneIds) {
    const tr = document.createElement('tr');
    tr.append(cell(SCENES.find((x) => x.id === s)!.label, 'name'));
    tr.append(cell(toCanvas(await pixels(newMod, 'new', s, null, H))));
    tr.append(cell(op ? toCanvas(await pixels(oldMod, 'old', s, op.edit, H)) : ''));
    tr.append(cell(toCanvas(await pixels(newMod, 'new', s, np.edit, H))));
    table.append(tr);
  }
}

// --- metrics -------------------------------------------------------------------------------

type Stats = {
  luma: number;
  contrast: number;
  sat: number;
  r: number;
  g: number;
  b: number;
  detail: number;
};

function stats({ w, h, px }: { w: number; h: number; px: Uint8ClampedArray }): Stats {
  let luma = 0,
    luma2 = 0,
    sat = 0,
    r = 0,
    g = 0,
    b = 0,
    detail = 0;
  const n = w * h;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const R = px[i * 4]!,
      G = px[i * 4 + 1]!,
      B = px[i * 4 + 2]!;
    const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    L[i] = l;
    luma += l;
    luma2 += l * l;
    sat += Math.max(R, G, B) - Math.min(R, G, B);
    r += R;
    g += G;
    b += B;
  }
  // fine detail: mean absolute difference to the 4 neighbours, on luma
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      detail += Math.abs(4 * L[i]! - L[i - 1]! - L[i + 1]! - L[i - w]! - L[i + w]!);
    }
  }
  luma /= n;
  return {
    luma,
    contrast: Math.sqrt(luma2 / n - luma * luma),
    sat: sat / n,
    r: r / n,
    g: g / n,
    b: b / n,
    detail: detail / ((w - 2) * (h - 2)),
  };
}

// mean absolute difference after a 4x4 box downsample, so per pixel noise counts less than
// color and tone. The full res difference is reported separately.
function distance(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number, block: number) {
  let sum = 0,
    count = 0;
  for (let by = 0; by + block <= h; by += block) {
    for (let bx = 0; bx + block <= w; bx += block) {
      for (let ch = 0; ch < 3; ch++) {
        let sa = 0,
          sb = 0;
        for (let y = by; y < by + block; y++) {
          for (let x = bx; x < bx + block; x++) {
            sa += a[(y * w + x) * 4 + ch]!;
            sb += b[(y * w + x) * 4 + ch]!;
          }
        }
        sum += Math.abs(sa - sb) / (block * block);
        count++;
      }
    }
  }
  return sum / count;
}

// local detail energy: mean absolute luma laplacian per 8 x 8 block. Two presets with the same
// grade but different blur, noise or line damage differ here, not in distance().
function textureMap({ w, h, px }: { w: number; h: number; px: Uint8ClampedArray }) {
  const L = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!;
  };
  const out: number[] = [];
  for (let by = 1; by + 8 < h; by += 8) {
    for (let bx = 1; bx + 8 < w; bx += 8) {
      let e = 0;
      for (let y = by; y < by + 8; y++)
        for (let x = bx; x < bx + 8; x++)
          e += Math.abs(4 * L(x, y) - L(x - 1, y) - L(x + 1, y) - L(x, y - 1) - L(x, y + 1));
      out.push(e / 64);
    }
  }
  return out;
}

async function metrics(set: string, h = 240) {
  const mod = await load(set);
  const renders: Record<
    string,
    Record<string, { w: number; h: number; px: Uint8ClampedArray }>
  > = {};
  const perPreset: Record<string, Record<string, unknown>> = {};
  const scenes = sceneIds;
  for (const s of scenes) {
    const orig = await pixels(mod, set, s, null, h);
    renders.original ??= {};
    renders.original[s] = orig;
  }
  for (const p of mod.presets) {
    renders[p.id] = {};
    const acc = {
      toOrig: 0,
      toOrigFine: 0,
      dLuma: 0,
      dContrast: 0,
      dSat: 0,
      castR: 0,
      castB: 0,
      detailKept: 0,
    };
    for (const s of scenes) {
      const r = await pixels(mod, set, s, p.edit, h);
      renders[p.id]![s] = r;
      const o = renders.original![s]!;
      const so = stats(o),
        sr = stats(r);
      acc.toOrig += distance(r.px, o.px, r.w, r.h, 4);
      acc.toOrigFine += distance(r.px, o.px, r.w, r.h, 1);
      acc.dLuma += sr.luma - so.luma;
      acc.dContrast += sr.contrast / so.contrast;
      acc.dSat += sr.sat / Math.max(so.sat, 1);
      // warm/cool: red minus blue shift, relative to the original
      acc.castR += sr.r - so.r - (sr.g - so.g);
      acc.castB += sr.b - so.b - (sr.g - so.g);
      acc.detailKept += sr.detail / Math.max(so.detail, 0.01);
    }
    const k = 1 / scenes.length;
    perPreset[p.id] = Object.fromEntries(
      Object.entries(acc).map(([key, v]) => [key, Math.round(v * k * 100) / 100]),
    );
  }
  // pairwise distance between presets, averaged over the scenes
  const ids = mod.presets.map((p) => p.id);
  const pairs: { a: string; b: string; d: number; t: number; sum: number }[] = [];
  const tex: Record<string, Record<string, number[]>> = {};
  for (const id of ids) {
    tex[id] = {};
    for (const s of scenes) tex[id]![s] = textureMap(renders[id]![s]!);
  }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      let d = 0;
      let t = 0;
      for (const s of scenes) {
        const A = renders[ids[i]!]![s]!,
          B = renders[ids[j]!]![s]!;
        d += distance(A.px, B.px, A.w, A.h, 4);
        const ta = tex[ids[i]!]![s]!,
          tb = tex[ids[j]!]![s]!;
        t += ta.reduce((acc, v, k) => acc + Math.abs(v - tb[k]!), 0) / ta.length;
      }
      d = Math.round((d / scenes.length) * 10) / 10;
      t = Math.round((t / scenes.length) * 10) / 10;
      pairs.push({ a: ids[i]!, b: ids[j]!, d, t, sum: Math.round((d + t) * 10) / 10 });
    }
  }
  pairs.sort((x, y) => x.sum - y.sum);
  const nearest = Object.fromEntries(
    ids.map((id) => {
      const mine = pairs.filter((p) => p.a === id || p.b === id)[0]!;
      return [id, { to: mine.a === id ? mine.b : mine.a, d: mine.d, t: mine.t, sum: mine.sum }];
    }),
  );
  return { perPreset, nearest, closestPairs: pairs.slice(0, 15) };
}

async function timing(set: string, w = 1600, h = 1200, runs = 7) {
  const mod = await load(set);
  const c = document.createElement('canvas');
  const r = new mod.Renderer(c) as unknown as {
    setImage(b: ImageBitmap): void;
    render(s: unknown, w: number, h: number, m: { date: Date }): void;
    gl: WebGL2RenderingContext;
  };
  r.setImage(await bitmap('interior'));
  const res: Record<string, number> = {};
  const px = new Uint8Array(4);
  for (const p of mod.presets) {
    const st = mod.state(p.edit);
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
      const t = performance.now();
      r.render(st, w, h, { date: DATE });
      r.gl.readPixels(0, 0, 1, 1, r.gl.RGBA, r.gl.UNSIGNED_BYTE, px);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    res[p.id] = Math.round(times[Math.floor(runs / 2)]! * 10) / 10;
  }
  return res;
}

// flattens the table into one image and posts it to the audit dev server (vite.config.ts here)
async function save(name: string, target = '/__save') {
  const table = out.querySelector('table')!;
  const rows = [...table.rows];
  const labelW = 120;
  const pad = 4;
  const heights = rows.map((r) =>
    Math.max(18, ...[...r.cells].map((c) => c.querySelector('canvas')?.height ?? 0)),
  );
  const widths = [...rows[rows.length - 1]!.cells].map((c, i) =>
    i === 0
      ? labelW
      : Math.max(...rows.map((r) => r.cells[i]?.querySelector('canvas')?.width ?? 0)),
  );
  const W = widths.reduce((a, b) => a + b + pad, pad);
  const Ht = heights.reduce((a, b) => a + b + pad, pad);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Ht;
  const g = c.getContext('2d')!;
  g.fillStyle = '#161616';
  g.fillRect(0, 0, W, Ht);
  g.fillStyle = '#ddd';
  g.font = '12px system-ui';
  let y = pad;
  rows.forEach((r, ri) => {
    let x = pad;
    [...r.cells].forEach((cellEl, i) => {
      const cv = cellEl.querySelector('canvas');
      if (cv) g.drawImage(cv, x, y);
      else {
        const lines = (cellEl as HTMLElement).innerText.split('\n');
        lines.forEach((l, li) => g.fillText(l, x, y + 13 + li * 14, widths[i]!));
      }
      x += widths[i]! + pad;
    });
    y += heights[ri]! + pad;
  });
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.9));
  const r = await fetch(`${target}/${name}`, { method: 'POST', body: blob });
  return r.text();
}

(window as unknown as { audit: unknown }).audit = { metrics, timing, save, compare };

const view = q.get('view') ?? 'none';
(view === 'grid' ? grid() : view === 'compare' ? compare() : Promise.resolve())
  .then(() => (status.textContent = 'done'))
  .catch((e) => {
    status.textContent = String(e?.stack ?? e);
    status.style.color = '#f66';
  });
