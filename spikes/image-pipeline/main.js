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
in vec2 uv;
out vec4 color;
vec2 p() { return vec2(uv.x, mix(uv.y, 1.0 - uv.y, flipY)); }
`;

// Farbcharakter: color cast (a = cast strength, b = saturation)
const PASS_COLOR =
  HEAD +
  `
void main() {
  vec3 c = texture(tex, p()).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, b);
  c = mix(c, c * vec3(0.9, 1.0, 1.08), a);        // cyan shadows
  c = pow(c, vec3(0.95));                          // slight lift
  color = vec4(c, 1.0);
}`;

// Kompressionsartefakte stand-in: block average plus quantization (a = block px, b = levels)
const PASS_BLOCK =
  HEAD +
  `
void main() {
  vec2 px = p() * size;
  vec2 cell = floor(px / a) * a + a * 0.5;
  vec3 c = texture(tex, cell / size).rgb;
  c = floor(c * b + 0.5) / b;
  color = vec4(mix(texture(tex, p()).rgb, c, 0.6), 1.0);
}`;

// Rauschen (a = strength, b = seed)
const PASS_NOISE =
  HEAD +
  `
float hash(vec2 q) { return fract(sin(dot(q, vec2(12.9898, 78.233)) + b) * 43758.5453); }
void main() {
  vec3 c = texture(tex, p()).rgb;
  float n = hash(floor(p() * size)) - 0.5;
  float dark = 1.0 - dot(c, vec3(0.333));
  c += n * a * (0.5 + dark);
  color = vec4(c, 1.0);
}`;

// Vignette plus 3x3 blur (a = vignette strength, b = blur mix)
const PASS_VIGNETTE =
  HEAD +
  `
void main() {
  vec2 q = p();
  vec2 d = 1.0 / size;
  vec3 c = texture(tex, q).rgb * 0.2;
  c += texture(tex, q + vec2(d.x, 0.0)).rgb * 0.2;
  c += texture(tex, q - vec2(d.x, 0.0)).rgb * 0.2;
  c += texture(tex, q + vec2(0.0, d.y)).rgb * 0.2;
  c += texture(tex, q - vec2(0.0, d.y)).rgb * 0.2;
  c = mix(texture(tex, q).rgb, c, b);
  float r = distance(q, vec2(0.5)) * 1.4;
  c *= 1.0 - a * smoothstep(0.4, 1.0, r);
  color = vec4(c, 1.0);
}`;

// A Look is just parameters for the fixed chain. Real Looks are the filters agent's job.
const LOOKS = {
  digicam: { color: [0.6, 1.25], block: [8, 24], noise: [0.08, 1], vignette: [0.25, 0.3] },
  handy: { color: [0.3, 0.75], block: [16, 12], noise: [0.18, 7], vignette: [0.6, 0.8] },
  einweg: { color: [0.8, 1.1], block: [4, 40], noise: [0.12, 3], vignette: [0.7, 0.4] },
};

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
  };
}

const passes = {
  color: program(PASS_COLOR),
  block: program(PASS_BLOCK),
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
let state = null; // { w, h, src, ping, pong, fbo }

function setup(width, height) {
  if (state) {
    gl.deleteTexture(state.src);
    gl.deleteTexture(state.ping);
    gl.deleteTexture(state.pong);
    gl.deleteFramebuffer(state.fbo);
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

function runPass(pass, [a, b], inputTex, targetTex, flipY) {
  gl.useProgram(pass.prog);
  gl.uniform2f(pass.size, state.w, state.h);
  gl.uniform1f(pass.a, a);
  gl.uniform1f(pass.b, b);
  gl.uniform1f(pass.flipY, flipY);
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
    // just blit the source
    runPass(passes.color, [0, 1], state.src, null, 1);
  } else {
    const look = LOOKS[name];
    runPass(passes.color, look.color, state.src, state.ping, 0);
    runPass(passes.block, look.block, state.ping, state.pong, 0);
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
