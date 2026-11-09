// Cheap WebGL2 "Camcorder" stand-in used by the video spike: scanlines, noise,
// slight desaturation, horizontal tracking jitter near the bottom edge.
// Not a real Look. It exists to put a realistic per-frame GPU cost on the pipeline.

const VERT = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() {
  uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D tex;
uniform float time;
uniform vec2 size;
in vec2 uv;
out vec4 color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453);
}

void main() {
  vec2 p = vec2(uv.x, 1.0 - uv.y);
  // tracking jitter in the lowest 8 percent of the picture
  float band = smoothstep(0.92, 1.0, p.y);
  p.x += band * (hash(vec2(floor(p.y * size.y), 1.0)) - 0.5) * 0.04;
  vec3 c = texture(tex, p).rgb;
  // color bleed: sample red a bit to the right
  c.r = texture(tex, p + vec2(1.5 / size.x, 0.0)).r;
  // desaturate slightly
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.8);
  // scanlines
  float line = mod(floor(p.y * size.y), 2.0);
  c *= 1.0 - 0.18 * line;
  // snow
  c += (hash(p * size) - 0.5) * 0.12;
  color = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export function createEffect(width, height) {
  const canvas = new OffscreenCanvas(width, height);
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('WebGL2 not available');

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uTime = gl.getUniformLocation(prog, 'time');
  const uSize = gl.getUniformLocation(prog, 'size');
  gl.uniform2f(uSize, width, height);
  gl.viewport(0, 0, width, height);

  // source: anything texImage2D accepts (VideoFrame, canvas, video element, ImageBitmap)
  function render(source, timeSeconds) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1f(uTime, timeSeconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return canvas;
  }

  return { canvas, gl, render };
}
