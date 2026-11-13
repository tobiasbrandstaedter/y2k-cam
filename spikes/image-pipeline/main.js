// Spike: chained WebGL2 passes on a 12 MP photo, time per Look switch (QA-2).
// Four passes, ping-pong between two framebuffers, final pass draws to the visible canvas.
// Also a Canvas 2D getImageData baseline for comparison.

import { $, log, row, fmtMs, deviceInfo } from '../common/report.js';

deviceInfo('device');

const VERT = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() { uv = pos * 0.5 + 0.5; gl_Position = vec4(pos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision mediump float;
uniform sampler2D tex;
uniform vec2 size;
uniform float a;
uniform float b;
uniform float flipY;
uniform vec3 tint;
uniform float fade;
uniform sampler2D overlay;
uniform float useOverlay;
in vec2 uv;
out vec4 color;
vec2 p() { return vec2(uv.x, mix(uv.y, 1.0 - uv.y, flipY)); }
`;

// All sizes are relative to the image height, so preview and full resolution look the same.
// Target is docs/looks/references/user-reference-01: soft and analog, no visible blocks.

// Farbcharakter: cast, lifted blacks, rolled off highlights (a = cast strength, b = saturation)
const PASS_COLOR =
  HEAD +
  `
void main() {
  vec3 c = texture(tex, p()).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, b);
  // cast is stronger in the shadows, like cheap sensors and tape
  c = mix(c, c * tint, a * (1.0 - l * 0.5));
  // fade: worn tape, colors drift toward a warm milky gray
  c = mix(c, vec3(l) * 0.6 + vec3(0.32, 0.30, 0.27), fade * 0.35);
  // blacks never reach black, highlights never quite reach white
  c = (0.05 + fade * 0.1) + c * (0.92 - fade * 0.15);
  c = c * (1.0 - 0.12 * c * c);
  // overlays (Datumsstempel, REC) go in here, before the soft and grain passes,
  // so they end up blurred and grainy like everything else the camera recorded
  vec4 o = texture(overlay, p());
  c = mix(c, o.rgb, o.a * useOverlay);
  color = vec4(c, 1.0);
}`;

// Softness: disc blur plus a little horizontal smear (a = radius as fraction of height, b = smear)
const PASS_SOFT =
  HEAD +
  `
void main() {
  vec2 q = p();
  float r = a * size.y;
  vec2 d = vec2(r) / size;
  vec3 c = texture(tex, q).rgb * 0.2;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.785398;
    c += texture(tex, q + vec2(cos(ang), sin(ang)) * d).rgb * 0.1;
  }
  // analog video smears horizontally, red bleeds a bit further
  vec2 s = vec2(b * r * 3.0 / size.x, 0.0);
  vec3 smear = (texture(tex, q + s).rgb + texture(tex, q - s).rgb) * 0.5;
  c = mix(c, smear, b * 0.5);
  c.r = mix(c.r, texture(tex, q + s * 1.5).r, b * 0.4);
  color = vec4(c, 1.0);
}`;

// Grain: smooth value noise, mostly luminance, grain size relative to height (a = strength, b = seed)
const PASS_NOISE =
  HEAD +
  `
float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233)) + b) * 43758.5453); }
float vnoise(vec2 q) {
  vec2 i = floor(q);
  vec2 f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec3 c = texture(tex, p()).rgb;
  // about 900 grains across the height, independent of resolution
  vec2 g = p() * vec2(size.x / size.y, 1.0) * 900.0;
  float n = vnoise(g) - 0.5;
  float mid = 1.0 - abs(dot(c, vec3(0.333)) - 0.45) * 1.4;
  c += n * a * (0.6 + 0.4 * mid);
  color = vec4(c, 1.0);
}`;

// Vignette plus faint scanlines (a = vignette strength, b = scanline strength)
const PASS_VIGNETTE =
  HEAD +
  `
void main() {
  vec2 q = p();
  vec3 c = texture(tex, q).rgb;
  // roughly 480 soft lines over the height, like PAL/NTSC, never a hard stripe
  float line = 0.5 + 0.5 * sin(q.y * 480.0 * 3.14159);
  c *= 1.0 - b * line;
  float r = distance(q, vec2(0.5)) * 1.4;
  c *= 1.0 - a * smoothstep(0.35, 1.0, r);
  color = vec4(c, 1.0);
}`;

// A Look is just parameters for the fixed chain. Real Looks are the filters agent's job.
const LOOKS = {
  digicam: {
    tint: [0.88, 1.02, 1.1],
    color: [0.5, 1.1],
    soft: [0.0012, 0.0],
    noise: [0.05, 1],
    vignette: [0.2, 0.0],
  },
  handy: {
    tint: [0.95, 1.06, 0.9],
    color: [0.6, 0.8],
    soft: [0.0025, 0.2],
    noise: [0.09, 7],
    vignette: [0.45, 0.0],
  },
  einweg: {
    tint: [1.12, 1.0, 0.82],
    color: [0.7, 0.95],
    soft: [0.0015, 0.0],
    noise: [0.08, 3],
    vignette: [0.5, 0.0],
  },
  camcorder: {
    tint: [1.1, 1.0, 0.85],
    color: [0.6, 0.6],
    fade: 0.7,
    overlay: 'camcorder',
    soft: [0.0022, 0.6],
    noise: [0.06, 5],
    vignette: [0.25, 0.06],
  },
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Camcorder on screen display: REC, tape counter, viewfinder corners, date and time.
// Font is a system monospace for the spike; the real Datumsstempel needs a free pixel font (offene Frage 3).
function drawCamcorderOverlay(w, h, date) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext('2d');
  const fs = Math.round(h * 0.05);
  const pad = Math.round(h * 0.06);
  g.font = `bold ${fs}px "Courier New", Consolas, monospace`;
  g.textBaseline = 'top';
  // old OSDs had a dark outline so the text stayed readable on bright scenes
  g.shadowColor = 'rgba(0, 0, 0, 0.6)';
  g.shadowBlur = fs * 0.15;
  g.shadowOffsetX = fs * 0.06;
  g.shadowOffsetY = fs * 0.06;

  const text = (s, x, y, fill, align = 'left') => {
    g.textAlign = align;
    g.fillStyle = fill;
    g.fillText(s, x, y);
  };

  // REC with red dot, top left
  g.fillStyle = '#ff2a1f';
  g.beginPath();
  g.arc(pad + fs * 0.4, pad + fs * 0.45, fs * 0.32, 0, Math.PI * 2);
  g.fill();
  text('REC', pad + fs * 1.0, pad, '#f4f4f0');

  // tape mode and counter, top right
  text('SP  0:07:20', w - pad, pad, '#f4f4f0', 'right');

  // viewfinder corner brackets
  g.strokeStyle = 'rgba(244, 244, 240, 0.8)';
  g.lineWidth = Math.max(2, h * 0.004);
  const len = h * 0.06;
  const m = pad * 0.55;
  for (const [x, y, dx, dy] of [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ]) {
    g.beginPath();
    g.moveTo(x, y + dy * len);
    g.lineTo(x, y);
    g.lineTo(x + dx * len, y);
    g.stroke();
  }

  // date and time, bottom left, in the orange-yellow of the era
  const hours = date.getHours();
  const time = `${hours < 12 ? 'AM' : 'PM'} ${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}`;
  const day = `${MONTHS[date.getMonth()]}. ${date.getDate()} ${date.getFullYear()}`;
  text(time, pad, h - pad - fs * 2.2, '#ffc93c');
  text(day, pad, h - pad - fs, '#ffc93c');
  return c;
}

const out = $('out');
const gl = out.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
if (!gl) {
  row('result', 'WebGL2', 'NOT AVAILABLE');
  throw new Error('no webgl2');
}
row('result', 'MAX_TEXTURE_SIZE', gl.getParameter(gl.MAX_TEXTURE_SIZE));

function program(fragSrc) {
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return {
    prog,
    size: gl.getUniformLocation(prog, 'size'),
    a: gl.getUniformLocation(prog, 'a'),
    b: gl.getUniformLocation(prog, 'b'),
    flipY: gl.getUniformLocation(prog, 'flipY'),
    tint: gl.getUniformLocation(prog, 'tint'),
    fade: gl.getUniformLocation(prog, 'fade'),
    overlay: gl.getUniformLocation(prog, 'overlay'),
    useOverlay: gl.getUniformLocation(prog, 'useOverlay'),
  };
}

const passes = {
  copy: program(HEAD + 'void main() { color = vec4(texture(tex, p()).rgb, 1.0); }'),
  color: program(PASS_COLOR),
  soft: program(PASS_SOFT),
  noise: program(PASS_NOISE),
  vignette: program(PASS_VIGNETTE),
};

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

function makeTexture(w, h, source) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (source) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  return tex;
}

let bitmap = null; // full res ImageBitmap
let fileDate = new Date(); // stands in for the capture date (BS-1 default)
let state = null; // { w, h, src, ping, pong, fbo, overlay }

// texture unit 1 must always hold something, even when no overlay is drawn
const emptyOverlay = makeTexture(1, 1);

function setup(width, height) {
  if (state) {
    gl.deleteTexture(state.src);
    gl.deleteTexture(state.ping);
    gl.deleteTexture(state.pong);
    gl.deleteFramebuffer(state.fbo);
    if (state.overlay) gl.deleteTexture(state.overlay);
  }
  const t0 = performance.now();
  // downscale through a 2D canvas when preview resolution is requested
  let source = bitmap;
  if (width !== bitmap.width) {
    const c = new OffscreenCanvas(width, height);
    c.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    source = c;
  }
  const src = makeTexture(width, height, source);
  const uploadMs = performance.now() - t0;
  state = {
    w: width,
    h: height,
    src,
    ping: makeTexture(width, height),
    pong: makeTexture(width, height),
    fbo: gl.createFramebuffer(),
  };
  row('result', `texture upload ${width}x${height}`, fmtMs(uploadMs));
}

function runPass(pass, [a, b], inputTex, targetTex, flipY, look = {}) {
  const tint = look.tint ?? [1, 1, 1];
  gl.useProgram(pass.prog);
  gl.uniform2f(pass.size, state.w, state.h);
  gl.uniform1f(pass.a, a);
  gl.uniform1f(pass.b, b);
  gl.uniform1f(pass.flipY, flipY);
  gl.uniform3f(pass.tint, tint[0], tint[1], tint[2]);
  gl.uniform1f(pass.fade, look.fade ?? 0);
  gl.uniform1i(pass.overlay, 1);
  gl.uniform1f(pass.useOverlay, look.overlay ? 1 : 0);
  gl.bindTexture(gl.TEXTURE_2D, inputTex);
  if (targetTex) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, state.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTex, 0);
    gl.viewport(0, 0, state.w, state.h);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, out.width, out.height);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function applyLook(name) {
  const t0 = performance.now();
  if (name === 'none') {
    runPass(passes.copy, [0, 0], state.src, null, 1);
  } else {
    const look = LOOKS[name];
    if (look.overlay && !state.overlay) {
      state.overlay = makeTexture(state.w, state.h, drawCamcorderOverlay(state.w, state.h, fileDate));
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, look.overlay ? state.overlay : emptyOverlay);
    gl.activeTexture(gl.TEXTURE0);
    runPass(passes.color, look.color, state.src, state.ping, 0, look);
    runPass(passes.soft, look.soft, state.ping, state.pong, 0);
    runPass(passes.noise, look.noise, state.pong, state.ping, 0);
    // last pass goes to the screen canvas (smaller), flip because FBO textures are upside down
    runPass(passes.vignette, look.vignette, state.ping, null, 1);
  }
  // force the GPU to finish so the time means something
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  const ms = performance.now() - t0;
  row(
    'result',
    `Look "${name}" at ${state.w}x${state.h}`,
    fmtMs(ms) + (ms < 500 ? '  PASS' : '  FAIL') + ' (QA-2 < 500 ms)',
  );
  log(`look ${name} ${state.w}x${state.h}: ${ms.toFixed(1)} ms`);
}

$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  $('result').innerHTML = '';
  const t0 = performance.now();
  try {
    bitmap?.close();
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    // no EXIF parsing in the spike, file date is close enough
    fileDate = new Date(file.lastModified);
  } catch (err) {
    row('photo', 'decode', 'FAILED: ' + err.message);
    return;
  }
  row('photo', 'file', `${file.name} ${file.type} ${(file.size / 1024 / 1024).toFixed(1)} MB`);
  row(
    'photo',
    'decoded',
    `${bitmap.width}x${bitmap.height} (${((bitmap.width * bitmap.height) / 1e6).toFixed(1)} MP) in ${fmtMs(performance.now() - t0)}`,
  );

  // visible canvas: fit the screen width, keep aspect
  const cssW = Math.min(window.innerWidth - 24, 800);
  out.width = Math.round(cssW * devicePixelRatio);
  out.height = Math.round((out.width * bitmap.height) / bitmap.width);
  out.style.width = cssW + 'px';

  prepare();
  for (const b of document.querySelectorAll('button')) b.disabled = false;
});

function prepare() {
  const preview = $('previewRes').checked;
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = preview ? Math.min(1, 1600 / longEdge) : 1;
  setup(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
}

$('previewRes').addEventListener('change', () => bitmap && prepare());

for (const b of document.querySelectorAll('button.look')) {
  b.addEventListener('click', () => {
    try {
      applyLook(b.dataset.look);
    } catch (err) {
      log('look failed: ' + err.message);
      row('result', 'error', err.message);
    }
  });
}

// Canvas 2D baseline: one saturation pass over all pixels at full resolution
$('baseline').addEventListener('click', () => {
  const t0 = performance.now();
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = l + (d[i] - l) * 1.3;
    d[i + 1] = l + (d[i + 1] - l) * 1.3;
    d[i + 2] = l + (d[i + 2] - l) * 1.3;
  }
  ctx.putImageData(img, 0, 0);
  const ms = performance.now() - t0;
  row('result', `Canvas 2D baseline, 1 pass at ${c.width}x${c.height}`, fmtMs(ms));
  log(`canvas2d baseline: ${ms.toFixed(1)} ms`);
});
