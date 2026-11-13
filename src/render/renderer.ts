// Runs the pass chain from ADR-002 on one WebGL2 context. The source is uploaded once; every
// edit re-runs the passes but never re-uploads the photo.

import { buildLut } from '../editor/curves';
import { withIntensity, type Curves, type EditState } from '../editor/effects';
import { drawOverlay } from './overlay';
import { BLUR, COLOR, COMPOSITE, DOWN, SIGNAL, VERT } from './shaders';
import { planPasses } from './uniforms';

type Program = {
  prog: WebGLProgram;
  uniforms: Map<string, { loc: WebGLUniformLocation; type: number }>;
};
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

export type RenderMeta = { date: Date };

// Safari refuses 2D canvases above this many pixels (16.7 MP), export has to stay below it
export const MAX_CANVAS_AREA = 16_777_216;

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly maxTexture: number;
  private programs: Record<'color' | 'signal' | 'blur' | 'down' | 'composite', Program>;
  private targets = new Map<string, Target>();
  private source: WebGLTexture | null = null;
  private lut: WebGLTexture;
  private lutKey = '';
  private overlayTex: WebGLTexture;
  private overlayKey = '';
  private empty: WebGLTexture;
  sourceWidth = 0;
  sourceHeight = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error(
        'WebGL2 ist nicht verfügbar. Bitte einen aktuellen Browser verwenden (Safari ab iOS 17, Chrome, Firefox).',
      );
    }
    this.gl = gl;
    this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.programs = {
      color: this.compile(COLOR),
      signal: this.compile(SIGNAL),
      blur: this.compile(BLUR),
      down: this.compile(DOWN),
      composite: this.compile(COMPOSITE),
    };
    this.lut = this.texture(256, 1);
    this.overlayTex = this.texture(1, 1);
    this.empty = this.texture(1, 1);
  }

  private compile(frag: string): Program {
    const gl = this.gl;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'pos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link failed: ' + gl.getProgramInfoLog(prog));
    }
    const uniforms = new Map<string, { loc: WebGLUniformLocation; type: number }>();
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i)!;
      uniforms.set(info.name, { loc: gl.getUniformLocation(prog, info.name)!, type: info.type });
    }
    return { prog, uniforms };
  }

  private texture(w: number, h: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  private target(name: string, w: number, h: number): Target {
    const existing = this.targets.get(name);
    if (existing && existing.w === w && existing.h === h) return existing;
    const gl = this.gl;
    if (existing) {
      gl.deleteTexture(existing.tex);
      gl.deleteFramebuffer(existing.fbo);
    }
    const tex = this.texture(w, h);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const t = { tex, fbo, w, h };
    this.targets.set(name, t);
    return t;
  }

  // drops the big framebuffers, used after an export so they do not stay in GPU memory
  releaseTargets() {
    for (const t of this.targets.values()) {
      this.gl.deleteTexture(t.tex);
      this.gl.deleteFramebuffer(t.fbo);
    }
    this.targets.clear();
  }

  setImage(bitmap: ImageBitmap) {
    const gl = this.gl;
    let src: TexImageSource = bitmap;
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, this.maxTexture / Math.max(w, h));
    if (scale < 1) {
      w = Math.floor(w * scale);
      h = Math.floor(h * scale);
      const c = new OffscreenCanvas(w, h);
      c.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
      src = c;
    }
    if (this.source) gl.deleteTexture(this.source);
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    // mipmaps so the preview reads a properly averaged smaller image instead of aliasing
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.source = tex;
    this.sourceWidth = w;
    this.sourceHeight = h;
    this.overlayKey = '';
  }

  private updateLut(curves: Curves) {
    const key = JSON.stringify(curves);
    if (key === this.lutKey) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lut);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buildLut(curves),
    );
    this.lutKey = key;
  }

  private updateOverlay(state: EditState, w: number, h: number, meta: RenderMeta) {
    const v = state.effects.overlay!.v;
    const key = `${w}x${h}|${meta.date.getTime()}|${JSON.stringify(v)}`;
    if (key === this.overlayKey) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      drawOverlay(v, w, h, meta.date),
    );
    this.overlayKey = key;
  }

  private draw(
    p: Program,
    out: Target | null,
    width: number,
    height: number,
    uniforms: Record<string, number | boolean | number[]>,
    textures: Record<string, WebGLTexture>,
  ) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fbo : null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(p.prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let unit = 0;
    for (const [name, tex] of Object.entries(textures)) {
      const u = p.uniforms.get(name);
      if (!u) continue;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.loc, unit);
      unit++;
    }
    gl.activeTexture(gl.TEXTURE0);

    for (const [name, value] of Object.entries({ ...uniforms, uSize: [width, height] })) {
      const u = p.uniforms.get(name);
      if (!u) continue;
      const v = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      switch (u.type) {
        case gl.FLOAT:
          gl.uniform1f(u.loc, v as number);
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(u.loc, v as number[]);
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(u.loc, v as number[]);
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(u.loc, v as number[]);
          break;
        case gl.BOOL:
        case gl.INT:
          gl.uniform1i(u.loc, v as number);
          break;
        default:
          throw new Error(`Uniform ${name} has a type the renderer does not handle (${u.type})`);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blur(input: Target, temp: Target, out: Target, radius: number) {
    const texel = [1 / input.w, 1 / input.h];
    const p = this.programs.blur;
    this.draw(
      p,
      temp,
      temp.w,
      temp.h,
      { uDir: [1, 0], uTexel: texel, uRadius: radius },
      { uTex: input.tex },
    );
    this.draw(
      p,
      out,
      out.w,
      out.h,
      { uDir: [0, 1], uTexel: texel, uRadius: radius },
      { uTex: temp.tex },
    );
  }

  // Runs the whole chain at w x h. out = null draws to the canvas (flipped for display).
  private run(
    state: EditState,
    w: number,
    h: number,
    meta: RenderMeta,
    out: Target | null,
    split: number,
  ) {
    if (!this.source) throw new Error('No image loaded');
    state = withIntensity(state);
    const plan = planPasses(state, h);
    this.updateLut(state.curves);

    const a = this.target('a', w, h);
    const b = this.target('b', w, h);
    // mip level of the source that averages about 3 % of the image height, read by the
    // local Highlights and Shadows; it depends on the source only, so preview and export match
    const localLod = Math.max(0, Math.log2(this.sourceHeight * 0.03));
    this.draw(
      this.programs.color,
      a,
      w,
      h,
      { ...plan.color, uLocalLod: localLod },
      { uTex: this.source, uLut: this.lut },
    );
    this.draw(this.programs.signal, b, w, h, plan.signal, { uTex: a.tex });

    let base = b;
    if (plan.gaussianRadius > 0.5) {
      this.blur(b, this.target('t', w, h), a, plan.gaussianRadius);
      base = a;
    }

    let soft = this.empty;
    if (plan.softRadius > 0) {
      const s = this.target('s', w, h);
      this.blur(base, this.target('t', w, h), s, plan.softRadius);
      soft = s.tex;
    }

    let lens = this.empty;
    if (plan.lensRadius > 0) {
      const hw = Math.max(1, Math.round(w / 2));
      const hh = Math.max(1, Math.round(h / 2));
      const l1 = this.target('l1', hw, hh);
      const l2 = this.target('l2', hw, hh);
      // the blur reads the full size image with linear filtering, which halves it on the way
      this.blur(base, l2, l1, plan.lensRadius * 2);
      lens = l1.tex;
    }

    const qw = Math.max(1, Math.round(w / 4));
    const qh = Math.max(1, Math.round(h / 4));
    let glow = this.empty;
    if (plan.glowRadius > 0) {
      const g1 = this.target('g1', qw, qh);
      const g2 = this.target('g2', qw, qh);
      this.draw(this.programs.down, g1, qw, qh, { uTexel: [1 / w, 1 / h] }, { uTex: base.tex });
      this.blur(g1, g2, g1, plan.glowRadius);
      glow = g1.tex;
    }

    let bright = this.empty;
    if (plan.brightRadius > 0) {
      const b1 = this.target('b1', qw, qh);
      const b2 = this.target('b2', qw, qh);
      this.draw(
        this.programs.down,
        b1,
        qw,
        qh,
        { ...plan.bright, uBright: true, uTexel: [1 / w, 1 / h] },
        { uTex: base.tex },
      );
      this.blur(b1, b2, b1, plan.brightRadius);
      bright = b1.tex;
    }

    if (plan.overlay) this.updateOverlay(state, w, h, meta);

    this.draw(
      this.programs.composite,
      out,
      w,
      h,
      { ...plan.composite, uFlip: out ? 0 : 1, uSplit: split },
      {
        uBase: base.tex,
        uSoft: soft,
        uGlow: glow,
        uLens: lens,
        uBright: bright,
        uOverlay: plan.overlay ? this.overlayTex : this.empty,
        uOrig: this.source,
      },
    );
  }

  // Preview. split in 0..1 shows the original left of that x, -1 turns the comparison off.
  render(state: EditState, w: number, h: number, meta: RenderMeta, split = -1) {
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.run(state, w, h, meta, null, split);
  }

  // Export or thumbnails: RGBA rows, top row first.
  renderPixels(
    state: EditState,
    w: number,
    h: number,
    meta: RenderMeta,
  ): Uint8ClampedArray<ArrayBuffer> {
    const out = this.target('out', w, h);
    this.run(state, w, h, meta, out, -1);
    const gl = this.gl;
    const pixels = new Uint8ClampedArray(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels;
  }
}
