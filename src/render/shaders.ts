// GLSL for the photo pipeline, pass order in docs/decisions/ADR-002-photo-pipeline.md.
// Coordinates: every framebuffer texture stores the image top row at v = 0. Only the composite
// pass, when it draws to the visible canvas, flips (uFlip). So `p` below is always image space,
// y = 0 at the top, and export via readPixels needs no flip.
// Sizes are fractions of the image height so preview and export look the same.

export const VERT = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() {
  uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp int;
in vec2 uv;
out vec4 outColor;
uniform vec2 uSize;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// PCG hash: integer based, so the same seed gives the same grain on every GPU
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash2(vec2 p, float seed) {
  uvec2 q = uvec2(ivec2(floor(p)) + 65536);
  return float(pcg(q.x + pcg(q.y + pcg(uint(seed))))) / 4294967295.0;
}
float vnoise(vec2 p, float seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i, seed);
  float b = hash2(i + vec2(1.0, 0.0), seed);
  float c = hash2(i + vec2(0.0, 1.0), seed);
  float d = hash2(i + vec2(1.0, 1.0), seed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float noise1(float x, float seed) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash2(vec2(i, 0.0), seed), hash2(vec2(i + 1.0, 0.0), seed), f);
}
vec3 softLight(vec3 a, vec3 b) {
  vec3 lo = 2.0 * a * b + a * a * (1.0 - 2.0 * b);
  vec3 hi = sqrt(max(a, 0.0)) * (2.0 * b - 1.0) + 2.0 * a * (1.0 - b);
  return mix(lo, hi, step(0.5, b));
}
vec3 screen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }
// move luminance to nl, scaling toward black or toward white so the hue stays put
vec3 setLuma(vec3 c, float nl) {
  float l = luma(c);
  if (nl < l) return c * (nl / max(l, 1e-4));
  return 1.0 - (1.0 - c) * ((1.0 - nl) / max(1.0 - l, 1e-4));
}
vec3 rgb2ycc(vec3 c) {
  return vec3(luma(c), (c.b - luma(c)) * 0.5389, (c.r - luma(c)) * 0.635);
}
vec3 ycc2rgb(vec3 y) {
  float r = y.x + y.z / 0.635;
  float b = y.x + y.y / 0.5389;
  float g = (y.x - 0.2126 * r - 0.0722 * b) / 0.7152;
  return vec3(r, g, b);
}
float skinMask(vec3 c) {
  float cb = -0.1687 * c.r - 0.3313 * c.g + 0.5 * c.b + 0.5;
  float cr = 0.5 * c.r - 0.4187 * c.g - 0.0813 * c.b + 0.5;
  float m = smoothstep(0.29, 0.35, cb) * (1.0 - smoothstep(0.48, 0.54, cb));
  m *= smoothstep(0.51, 0.55, cr) * (1.0 - smoothstep(0.67, 0.71, cr));
  return m * smoothstep(0.1, 0.28, luma(c));
}
`;

// Pass 1: everything that maps one color to another.
export const COLOR = `${HEAD}
uniform sampler2D uTex;
uniform sampler2D uLut;

uniform bool uLevelsOn;
uniform vec4 uLevels; // in black, in white, out black, out white
uniform float uGamma;

uniform bool uGradingOn;
uniform float uExposure;
uniform vec3 uWB;
uniform float uBrightness;
uniform float uContrast;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhites;
uniform float uBlacks;
uniform float uSaturation;
uniform float uVibrance;
uniform float uFade;
uniform float uMatte;
uniform float uRolloff;

uniform bool uCurvesOn;

uniform bool uSplitOn;
uniform vec3 uSplitShadow;
uniform vec3 uSplitHigh;
uniform vec2 uSplitAmt;
uniform float uSplitBalance;

uniform bool uCastOn;
uniform vec3 uCastShadow;
uniform vec3 uCastHigh;
uniform vec3 uCastAmt; // overall, shadows, highlights
uniform float uCastSkin;
uniform int uCastBlend;

uniform bool uLocalOn;
uniform float uLocalLod; // mip level of the source that averages about 3 % of the height
uniform float uClip; // digicam highlight clipping, 0 = off

vec3 shoulder(vec3 x, float s) {
  vec3 k = s + (1.0 - s) * (1.0 - exp(-(x - s) / (1.0 - s)));
  return mix(x, k, step(s, x));
}

float lut(float x, int ch) {
  vec4 t = texture(uLut, vec2(x * (255.0 / 256.0) + 0.5 / 256.0, 0.5));
  return ch == 0 ? t.r : ch == 1 ? t.g : t.b;
}

// levels, exposure, white balance, sensor clipping and roll-off: the part that the local
// average has to go through as well, so both are on the same scale
vec3 develop(vec3 c) {
  if (uLevelsOn) {
    c = clamp((c - uLevels.x) / max(uLevels.y - uLevels.x, 0.01), 0.0, 1.0);
    c = pow(c, vec3(uGamma));
    c = mix(vec3(uLevels.z), vec3(uLevels.w), c);
  }
  if (uGradingOn) {
    // exposure and white balance belong in linear light
    vec3 lin = pow(c, vec3(2.2)) * exp2(uExposure) * uWB;
    c = pow(max(lin, 0.0), vec3(1.0 / 2.2));
  }
  if (uClip > 0.0) {
    // a small CCD runs out of headroom per channel, so bright areas clip and shift hue
    // (skin goes yellow, sky goes cyan) before any later processing sees them
    c *= 1.0 + uClip * 0.35;
    c = shoulder(c, 0.94 + 0.05 * uClip);
  }
  if (uGradingOn) c = uRolloff > 0.0 ? shoulder(c, 1.0 - 0.45 * uRolloff) : min(c, 1.0);
  return c;
}

float localLuma() {
  vec2 o = exp2(uLocalLod) * 0.6 / vec2(textureSize(uTex, 0));
  vec3 s = textureLod(uTex, uv + vec2(-o.x, -o.y), uLocalLod).rgb;
  s += textureLod(uTex, uv + vec2(o.x, -o.y), uLocalLod).rgb;
  s += textureLod(uTex, uv + vec2(-o.x, o.y), uLocalLod).rgb;
  s += textureLod(uTex, uv + vec2(o.x, o.y), uLocalLod).rgb;
  return luma(clamp(develop(s * 0.25), 0.0, 1.0));
}

void main() {
  vec3 c = develop(texture(uTex, uv).rgb);

  if (uGradingOn) {
    float l = luma(c);
    float nl = l;
    // Highlights and Shadows pick their region from the neighborhood, not the pixel. The
    // correction is then smooth across fine detail, so strong values keep local contrast.
    float b = uLocalOn ? mix(l, localLuma(), 0.75) : l;
    nl += uHighlights * smoothstep(0.4, 0.95, b) * (uHighlights > 0.0 ? 1.0 - b : b) * 0.6;
    nl += uShadows * (1.0 - smoothstep(0.05, 0.6, b)) * (uShadows > 0.0 ? 1.0 - b : b) * 0.7;
    nl += uWhites * smoothstep(0.6, 1.0, l) * 0.22;
    nl += uBlacks * (1.0 - smoothstep(0.0, 0.35, l)) * 0.18;
    c = setLuma(clamp(c, 0.0, 1.0), clamp(nl, 0.0, 1.0));

    // brightness bends the midtones, black and white stay where they are
    c = pow(clamp(c, 0.0, 1.0), vec3(exp2(-uBrightness * 0.8)));
    if (uContrast > 0.0) c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
    else c = mix(c, 0.5 + (c - 0.5) * 0.45, -uContrast);
  }

  if (uCurvesOn) {
    c = clamp(c, 0.0, 1.0);
    c = vec3(lut(c.r, 0), lut(c.g, 1), lut(c.b, 2));
  }

  if (uGradingOn) {
    float l = luma(c);
    float spread = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    // vibrance boosts dull colors more than saturated ones and goes easy on skin
    float vib = uVibrance > 0.0 ? uVibrance * (1.0 - spread) * (1.0 - 0.6 * skinMask(c)) : uVibrance;
    c = mix(vec3(l), c, max(0.0, 1.0 + uSaturation + vib));

    c = mix(c, vec3(luma(c)), uFade * 0.2);
    c = c * (1.0 - uFade * 0.24) + uFade * 0.12;
    vec3 inv = clamp(1.0 - c, 0.0, 1.0);
    c += uMatte * 0.2 * inv * inv * inv;
  }

  if (uSplitOn) {
    float l = luma(c);
    float pivot = 0.5 - uSplitBalance * 0.3;
    float ws = 1.0 - smoothstep(0.0, pivot + 0.2, l);
    float wh = smoothstep(pivot - 0.2, 1.0, l);
    vec3 cc = clamp(c, 0.0, 1.0);
    c = mix(c, softLight(cc, uSplitShadow), ws * uSplitAmt.x);
    c = mix(c, softLight(clamp(c, 0.0, 1.0), uSplitHigh), wh * uSplitAmt.y);
  }

  if (uCastOn) {
    c = clamp(c, 0.0, 1.0);
    float l = luma(c);
    vec3 col = mix(uCastShadow, uCastHigh, smoothstep(0.1, 0.9, l));
    // soft light and overlay get the cast re-centered on mid gray: color shift, no brightness shift
    vec3 mid = clamp(col - luma(col) + 0.5, 0.0, 1.0);
    vec3 b;
    if (uCastBlend == 0) b = softLight(c, mid);
    else if (uCastBlend == 1) b = mix(2.0 * c * mid, 1.0 - 2.0 * (1.0 - c) * (1.0 - mid), step(0.5, c));
    else if (uCastBlend == 2) b = c * (col / max(max(col.r, max(col.g, col.b)), 1e-3));
    else if (uCastBlend == 3) b = screen(c, col * 0.35);
    else b = setLuma(col, l);
    float w = uCastAmt.x * mix(uCastAmt.y, uCastAmt.z, smoothstep(0.2, 0.8, l));
    w *= 1.0 - skinMask(c) * uCastSkin;
    c = mix(c, b, w);
  }

  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// Pass 2: everything that moves pixels around: lens geometry and the tape signal.
export const SIGNAL = `${HEAD}
uniform sampler2D uTex;
uniform float uSeed;

uniform bool uDistortOn;
uniform float uDistort;

uniform bool uVhsOn;
uniform vec4 uVhs; // shift, wobble, glitch, tracking
uniform float uTrackPos;

uniform bool uChromaOn;
uniform float uChroma;
uniform bool uChromaRadial;

uniform bool uBleedOn;
uniform vec2 uBleed; // amount, shift

uniform bool uMotionOn;
uniform vec2 uMotion; // length as fraction of height, angle in radians

uniform bool uTapeOn;
uniform vec3 uTape; // luma blur, chroma blur, ringing
uniform bool uInterlaceOn;
uniform vec2 uInterlace; // field offset, lines
uniform bool uHeadOn;
uniform vec2 uHead; // amount, strip height
uniform bool uDigiOn;
uniform vec2 uDigi; // sharpening, purple fringing
uniform bool uJpegOn;
uniform float uJpeg;

float aspect() { return uSize.x / uSize.y; }

vec3 tap(vec2 q) {
  if (!uChromaOn) return texture(uTex, q).rgb;
  vec2 off = uChromaRadial
    ? (q - 0.5) * uChroma * 0.014
    : vec2(uChroma * 0.004 / aspect(), 0.0);
  return vec3(texture(uTex, q + off).r, texture(uTex, q).g, texture(uTex, q - off).b);
}

vec3 base(vec2 q) {
  if (!uMotionOn) return tap(q);
  vec2 dir = vec2(cos(uMotion.y) / aspect(), sin(uMotion.y)) * uMotion.x;
  vec3 s = vec3(0.0);
  for (int i = 0; i < 9; i++) s += tap(q + dir * (float(i) / 8.0 - 0.5));
  return s / 9.0;
}

void main() {
  vec2 p = uv;
  float a = aspect();

  if (uDistortOn) {
    vec2 d = (p - 0.5) * vec2(a, 1.0);
    float k = uDistort * 0.18;
    // corners stay corners for barrel distortion, so no black edges show up
    float corner = 0.25 * (a * a + 1.0);
    d *= (1.0 + k * dot(d, d)) / (1.0 + max(k, 0.0) * corner);
    p = d / vec2(a, 1.0) + 0.5;
  }

  if (uVhsOn) {
    float y = p.y * 480.0;
    float off = (noise1(y * 0.035, uSeed) - 0.5) * uVhs.x * 0.006;
    off += sin(p.y * 38.0 + noise1(y * 0.012, uSeed + 3.0) * 6.0) * uVhs.y * 0.0016;
    float band = floor(y / 5.0);
    if (hash2(vec2(band, 7.0), uSeed) > 1.0 - uVhs.z * 0.07) {
      off += (hash2(vec2(band, 9.0), uSeed) - 0.5) * 0.028 * uVhs.z;
    }
    float tz = 1.0 - smoothstep(0.0, 0.025, abs(p.y - uTrackPos));
    off += tz * uVhs.w * (hash2(vec2(floor(y), 5.0), uSeed) - 0.3) * 0.022;
    p.x += off / a;
  }

  // head switching: the last lines of a VHS frame are written while the heads change over, so
  // they skew sideways, more toward the bottom edge
  float head = 0.0;
  if (uHeadOn) {
    float hgt = 0.012 + uHead.y * 0.035;
    head = clamp((p.y - 1.0 + hgt) / hgt, 0.0, 1.0);
    if (head > 0.0) {
      float line = floor(p.y * 480.0);
      float jit = hash2(vec2(line, 41.0), uSeed) - 0.5;
      p.x += (pow(head, 1.6) * 0.06 + jit * 0.012 * head) * uHead.x / a;
    }
  }

  // interlacing: the two fields were exposed 1/50 s apart, so with motion every other line is
  // displaced; the displacement varies over the frame like real motion would
  vec2 even = p;
  vec2 field = p;
  float fieldVis = 1.0;
  if (uInterlaceOn) {
    float lines = uInterlace.y;
    float motion = 0.35 + 1.3 * vnoise(p * vec2(a, 1.0) * 1.7, uSeed + 40.0);
    field.x += uInterlace.x * 0.01 * motion / a;
    // below ~2 px per line the comb would alias, show both fields blended instead
    fieldVis = smoothstep(1.5, 3.0, uSize.y / lines);
    if (mod(floor(p.y * lines), 2.0) > 0.5) p = field;
  }

  vec3 c = base(p);
  if (uInterlaceOn && fieldVis < 1.0) {
    vec3 both = 0.5 * (base(even) + base(field));
    c = mix(both, c, fieldVis);
  }

  if (uTapeOn || uBleedOn) {
    // luma and chroma are recorded separately on tape and lose resolution separately
    vec3 ycc = rgb2ycc(c);
    float yv = ycc.x;
    if (uTapeOn) {
      // horizontal luma resolution: about 240 lines near the default, 120 at full strength
      // like a worn long play tape. Negative side lobes are the deck's sharpness circuit,
      // which overshoots on both sides of an edge.
      float lr = (0.0004 + uTape.x * 0.0062) / a;
      float ys = 0.0;
      float ws = 0.0;
      for (int i = -8; i <= 8; i++) {
        float t = float(i) / 4.0;
        float w = exp(-t * t * 2.0) - uTape.z * 0.4 * exp(-pow(abs(t) - 1.4, 2.0) * 5.0);
        ys += luma(tap(p + vec2(t * lr, 0.0))) * w;
        ws += w;
      }
      yv = ys / ws;
    }

    // chroma: symmetric blur from the tape (~30 lines), plus a trail to the right from Color
    // Bleeding. The taps are jittered per pixel so a wide kernel does not show as steps.
    float cr = uTapeOn ? uTape.y * 0.03 / a : 0.0;
    float len = uBleedOn ? uBleed.x * 0.014 / a : 0.0;
    float sh = uBleedOn ? uBleed.y * 0.005 / a : 0.0;
    float jit = hash2(p * uSize, uSeed + 44.0) - 0.5;
    vec2 chroma = vec2(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 9; i++) {
      float t = (float(i) + jit) / 8.0;
      float w = (1.0 - t * 0.6 * step(1e-6, len)) * (1.0 - 0.5 * abs(2.0 * t - 1.0) * step(1e-6, cr));
      chroma += rgb2ycc(tap(p - vec2(sh + len * t + cr * (2.0 * t - 1.0), 0.0))).yz * w;
      wsum += w;
    }
    chroma /= wsum;
    // tape loses some color saturation along with the resolution
    if (uTapeOn) chroma *= 1.0 - uTape.y * 0.15;
    c = ycc2rgb(vec3(yv, chroma));
  }

  if (head > 0.0) {
    c = mix(c, vec3(luma(c)), head * uHead.x * 0.6);
    c += (hash2(vec2(floor(p.x * 900.0), floor(p.y * 480.0)), uSeed + 42.0) - 0.5) * head * uHead.x * 0.18;
  }

  if (uDigiOn) {
    vec3 own = texture(uTex, p).rgb;
    // in camera sharpening: an unsharp mask with a radius of about 1.5 sensor pixels
    float r = max(0.001, 0.8 / uSize.y);
    vec2 dx = vec2(r / a, 0.0);
    vec2 dy = vec2(0.0, r);
    vec3 nb = 0.25 * (texture(uTex, p + dx).rgb + texture(uTex, p - dx).rgb
      + texture(uTex, p + dy).rgb + texture(uTex, p - dy).rgb);
    c += (own - nb) * uDigi.x * 2.2;

    if (uDigi.y > 0.0) {
      // purple fringing: the dark side of an edge next to a clipped highlight turns violet
      float r2 = 0.0035;
      float bright = 0.0;
      for (int i = 0; i < 8; i++) {
        float ang = float(i) * 0.785398;
        vec2 o = vec2(cos(ang) / a, sin(ang)) * r2;
        bright += smoothstep(0.82, 0.98, luma(texture(uTex, p + o).rgb));
      }
      bright /= 8.0;
      float f = bright * (1.0 - smoothstep(0.5, 0.85, luma(own))) * uDigi.y * 1.6;
      c = mix(c, c * vec3(0.75, 0.5, 1.0) + vec3(0.2, 0.03, 0.34), clamp(f, 0.0, 1.0));
    }
  }

  if (uJpegOn) {
    // 8 x 8 blocks of a ~1500 line sensor. Small AC detail inside a block is dropped and
    // chroma is quantized harder than luma. Kept well below visible blocking.
    vec2 bs = vec2(0.0052 / a, 0.0052);
    vec2 center = (floor(p / bs) + 0.5) * bs;
    vec3 m = 0.25 * (texture(uTex, center + bs * vec2(-0.25, -0.25)).rgb
      + texture(uTex, center + bs * vec2(0.25, -0.25)).rgb
      + texture(uTex, center + bs * vec2(-0.25, 0.25)).rgb
      + texture(uTex, center + bs * vec2(0.25, 0.25)).rgb);
    vec3 own = texture(uTex, p).rgb;
    // blocks smaller than ~3 px would alias, so the block part fades out
    float vis = smoothstep(3.0, 6.0, 0.0052 * uSize.y);
    vec3 yc = rgb2ycc(c);
    vec3 ym = rgb2ycc(m);
    yc.yz = mix(yc.yz, ym.yz, uJpeg * 0.55 * vis);
    float d = luma(own) - ym.x;
    float keep = smoothstep(0.0, 0.012 + 0.04 * uJpeg, abs(d));
    yc.x -= d * (1.0 - keep) * uJpeg * 0.8 * vis;
    // mosquito noise around edges, at sensor pixel scale
    float edge = clamp(length(own - m) * 4.0, 0.0, 1.0);
    float fq = min(1500.0, uSize.y);
    float mq = hash2(p * vec2(a, 1.0) * fq, uSeed + 50.0) - 0.5;
    yc.x += mq * edge * uJpeg * 0.07 * (fq / 1500.0);
    c = ycc2rgb(yc);
  }

  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// Separable gaussian, 33 taps. uRadius in pixels of the texture being read.
export const BLUR = `${HEAD}
uniform sampler2D uTex;
uniform vec2 uDir; // (1,0) or (0,1) in texels
uniform vec2 uTexel;
uniform float uRadius;

void main() {
  float sigma = max(uRadius / 2.5, 0.5);
  float stepPx = max(uRadius / 16.0, 0.5);
  // alpha is blurred too, the bright chain keeps the Halation mask there
  vec4 s = vec4(0.0);
  float wsum = 0.0;
  for (int i = -16; i <= 16; i++) {
    float o = float(i) * stepPx;
    float w = exp(-o * o / (2.0 * sigma * sigma));
    s += texture(uTex, uv + uDir * uTexel * o) * w;
    wsum += w;
  }
  outColor = s / wsum;
}`;

// 4x4 box down sample in four bilinear taps, feeds the quarter resolution glow chains.
// With uBright it is the bright pass: threshold first, blur afterwards, so a bright spot
// blooms and a large mid gray area does not.
export const DOWN = `${HEAD}
uniform sampler2D uTex;
uniform vec2 uTexel; // of the source
uniform bool uBright;
uniform vec2 uThresh; // Bloom, Halation

vec4 tap(vec2 o) {
  vec3 c = texture(uTex, uv + uTexel * o).rgb;
  if (!uBright) return vec4(c, 1.0);
  float l = luma(c);
  return vec4(c * smoothstep(uThresh.x, 1.0, l), smoothstep(uThresh.y, 1.0, l));
}

void main() {
  outColor = 0.25 * (tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)));
}`;

// Pass 6: optics, light, overlays, tape texture and grain on top of each other.
export const COMPOSITE = `${HEAD}
uniform sampler2D uBase;
uniform sampler2D uSoft;
uniform sampler2D uGlow;
uniform sampler2D uLens;
uniform sampler2D uBright;
uniform sampler2D uOverlay;
uniform sampler2D uOrig;

uniform float uFlip;
uniform float uSplit;
uniform float uSeed;

uniform bool uSoftFocusOn;
uniform float uSoftFocus;
uniform bool uLensSoftOn;
uniform vec2 uLensSoft; // edge softness, glow
uniform bool uLensBlurOn;
uniform vec2 uLensBlur; // amount, focus size

uniform bool uBloomOn;
uniform vec2 uBloom; // amount, threshold
uniform bool uHalationOn;
uniform vec2 uHalation;
uniform bool uHazeOn;
uniform float uHaze;
uniform vec3 uHazeColor;
uniform bool uLeakOn;
uniform vec3 uLeakColor;
uniform vec2 uLeak; // intensity, size
uniform vec2 uLeakAnchor;
uniform vec2 uLeakDir;
uniform bool uFlashOn;
uniform vec2 uFlash; // intensity, size
uniform bool uFlareOn;
uniform vec3 uFlare; // intensity, x, y

uniform bool uVignetteOn;
uniform vec4 uVignette; // amount, midpoint, roundness, feather
uniform bool uEdgesOn;
uniform vec2 uEdges; // amount, width

uniform bool uOverlayOn;

uniform bool uScanOn;
uniform vec4 uScan; // density, opacity, width, variation
uniform bool uNoiseOn;
uniform vec4 uNoise; // intensity, streaks, flicker, chroma
uniform bool uTrackOn;
uniform vec2 uTrack; // amount, position

uniform bool uGrainOn;
uniform vec4 uGrain; // amount, size, roughness, contrast
uniform float uGrainFreq; // grains per image height
uniform bool uGrainColor;

uniform bool uDustOn;
uniform vec2 uDust; // dust, scratches
uniform bool uHeadOn;
uniform vec2 uHead;
uniform float uDigiNoise;

const mat2 ROT1 = mat2(0.799, 0.602, -0.602, 0.799);
const mat2 ROT2 = mat2(0.326, 0.946, -0.946, 0.326);

// Film grain. Three octaves on rotated grids so nothing lines up with the pixel grid, a domain
// warp for irregular grain shapes, and a slow clump field. Shadows and midtones get the coarse
// octaves, highlights mostly the fine one: on a print, the thin parts of the negative show
// the big silver clumps.
float grainAt(vec2 q, float l, float seed) {
  vec2 w = vec2(vnoise(q * 0.37 + 7.0, seed + 11.0), vnoise(q * 0.37 + 19.0, seed + 12.0));
  q += (w - 0.5) * 1.2;
  float f1 = vnoise(q, seed) - 0.5;
  float f2 = vnoise(ROT1 * q * 0.55 + 17.0, seed + 1.0) - 0.5;
  float f3 = vnoise(ROT2 * q * 0.3 + 31.0, seed + 2.0) - 0.5;
  float coarse = (1.0 - l) * (0.45 + 0.55 * uGrain.x);
  float n = f1 * (0.7 + 0.3 * l) + f2 * coarse * 0.95 + f3 * coarse * (0.25 + uGrain.z * 0.6);
  n *= 0.6 + 0.8 * vnoise(ROT1 * q * 0.16 + 53.0, seed + 3.0);
  return sign(n) * pow(abs(n) * 1.8, mix(1.0, 0.6, uGrain.z));
}

void main() {
  vec2 p = vec2(uv.x, mix(uv.y, 1.0 - uv.y, uFlip));
  float a = uSize.x / uSize.y;
  vec2 cp = (p - 0.5) * vec2(a, 1.0); // centered, aspect corrected
  float rc = length(cp) / length(vec2(a, 1.0) * 0.5); // 0 center, 1 corner

  vec3 c = texture(uBase, p).rgb;
  vec3 soft = texture(uSoft, p).rgb;
  vec3 glow = texture(uGlow, p).rgb;
  vec3 lens = texture(uLens, p).rgb;
  vec4 bright = texture(uBright, p);

  if (uSoftFocusOn) {
    // more blur where the contrast is high, so hard digital edges go soft first
    float edge = clamp(length(c - soft) * 5.0, 0.0, 1.0);
    c = mix(c, soft, uSoftFocus * (0.45 + 0.55 * edge));
  }
  if (uLensSoftOn) {
    c = mix(c, lens, uLensSoft.x * smoothstep(0.25, 1.0, rc));
    c = screen(c, glow * uLensSoft.y * 0.35);
  }
  if (uLensBlurOn) {
    // blur grows toward the edges: sharp, then the lens chain, then the wide glow
    float k = smoothstep(uLensBlur.y * 0.8, uLensBlur.y * 0.8 + 0.55, rc) * uLensBlur.x;
    c = mix(c, lens, min(k * 2.0, 1.0));
    c = mix(c, glow, max(k * 2.0 - 1.0, 0.0) * 0.85);
  }

  if (uBloomOn) c = screen(c, bright.rgb * uBloom.x * 2.2);
  if (uHalationOn) {
    // red light scattered back from the film base, strongest just outside the highlight
    float center = smoothstep(uHalation.y, 1.0, luma(c));
    c += vec3(1.0, 0.32, 0.12) * bright.a * uHalation.x * 0.9 * (1.0 - center * 0.7);
  }
  if (uHazeOn) {
    // veiling glare: stray light lifts the shadows, more of it near bright areas
    float v = uHaze * (0.16 + 0.3 * luma(glow));
    c = c * (1.0 - v) + mix(uHazeColor, glow, 0.5) * v;
    c = mix(c, vec3(luma(c)), uHaze * 0.12);
  }
  if (uLeakOn) {
    // light burning in from the frame edge: hottest at the edge, uneven reach along it, and
    // streaks running into the frame. The core shifts to yellow, the fringe to deep red.
    vec2 d = (p - uLeakAnchor) * vec2(a, 1.0);
    float along = dot(d, vec2(-uLeakDir.y, uLeakDir.x));
    float depth = max(dot(d, uLeakDir), 0.0);
    float reach = 0.18 + uLeak.y * 0.7;
    float lateral = exp(-along * along / (reach * reach * 2.5));
    float uneven = 0.55 + 0.9 * noise1(along * 3.5 + 3.0, uSeed + 30.0);
    float streak = 0.7 + 0.6 * noise1(along * 24.0, uSeed + 31.0);
    float r = depth / (reach * uneven);
    float m = (exp(-r * 2.2) * streak + exp(-r * r * 0.6) * 0.3) * lateral * uLeak.x * 1.5;
    m *= 0.85 + 0.3 * vnoise(p * vec2(a, 1.0) * 4.0, uSeed + 32.0);
    vec3 fringe = uLeakColor * vec3(1.0, 0.5, 0.4);
    vec3 core = mix(uLeakColor, vec3(1.0, 0.88, 0.55), 0.55);
    vec3 lc = mix(fringe, core, smoothstep(0.2, 0.85, m)) * clamp(m * 1.5, 0.0, 1.0);
    c = screen(c, lc);
    c += lc * lc * 0.25;
  }
  if (uFlashOn) {
    vec2 d = (p - vec2(0.5, 0.45)) * vec2(a, 1.0);
    float f = exp(-dot(d, d) / (0.03 + uFlash.y * 0.25));
    c = c * (1.0 + f * uFlash.x * 0.9) + f * uFlash.x * 0.05;
    // the flash does not reach the background
    c *= 1.0 - (1.0 - f) * uFlash.x * 0.28;
  }
  if (uFlareOn) {
    vec2 src = uFlare.yz;
    vec2 d = (p - src) * vec2(a, 1.0);
    float r = length(d);
    // hot core, soft veil and faint rays from a six blade aperture
    float ang = atan(d.y, d.x);
    float rays = pow(abs(cos(ang * 3.0 + 0.3)), 30.0) + 0.6 * pow(abs(cos(ang * 3.0 + 1.35)), 50.0);
    vec3 fl = vec3(1.0, 0.9, 0.74)
      * (exp(-r * r * 400.0) + exp(-r * r * 25.0) * 0.35 + rays * exp(-r * 5.0) * 0.35);
    // a faint rainbow ring around the source, red outside
    vec3 rr = vec3(0.36, 0.345, 0.33);
    fl += exp(-pow((vec3(r) - rr) / 0.012, vec3(2.0))) * 0.08;
    // ghosts along the line through the center: soft discs with a brighter rim, each channel
    // a slightly different size, so the rims fringe like real lens reflections
    vec2 axis = vec2(0.5) - src;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float k = 0.45 + fi * 0.42;
      vec2 gd = (p - (src + axis * k)) * vec2(a, 1.0);
      float gl = length(gd);
      float size = 0.018 + hash2(vec2(fi, 3.0), 17.0) * 0.05;
      vec3 radius = size * vec3(1.0, 1.04, 1.08);
      vec3 disc = 1.0 - smoothstep(radius * 0.85, radius, vec3(gl));
      vec3 rim = smoothstep(radius * 0.55, radius * 0.95, vec3(gl));
      vec3 tint = i == 0 ? vec3(0.7, 1.0, 0.6) : i == 1 ? vec3(1.0, 0.6, 0.9)
        : i == 2 ? vec3(1.0, 0.8, 0.45) : i == 3 ? vec3(0.5, 0.85, 1.0) : vec3(0.9, 0.7, 1.0);
      fl += tint * disc * (0.3 + 0.7 * rim) * (0.16 - fi * 0.02);
    }
    // stray light lowers contrast a little across the frame
    c = c * (1.0 - uFlare.x * 0.06) + vec3(1.0, 0.92, 0.82) * uFlare.x * 0.06;
    c = screen(c, clamp(fl * uFlare.x * 2.0, 0.0, 1.0));
  }

  if (uVignetteOn) {
    vec2 d = (p - 0.5) * 2.0;
    float sx = mix(1.0, a, uVignette.z);
    d.x *= sx;
    float r = length(d) / length(vec2(sx, 1.0));
    float start = mix(0.1, 0.85, uVignette.y);
    float v = smoothstep(start, start + mix(0.05, 0.9, uVignette.w), r);
    if (uVignette.x > 0.0) c *= 1.0 - v * uVignette.x * 0.85;
    else c = mix(c, vec3(1.0), v * -uVignette.x * 0.6);
  }
  if (uEdgesOn) {
    float e = min(min(p.x * a, (1.0 - p.x) * a), min(p.y, 1.0 - p.y));
    float k = 1.0 - smoothstep(0.0, 0.02 + uEdges.y * 0.25, e);
    c *= 1.0 - k * k * uEdges.x * 0.7;
  }

  if (uOverlayOn) {
    vec4 o = texture(uOverlay, p);
    c = mix(c, o.rgb, o.a);
  }

  if (uScanOn) {
    float y = p.y * uScan.x;
    float pxPerLine = uSize.y / uScan.x;
    float k = mix(6.0, 0.6, uScan.z);
    float prof = pow(0.5 + 0.5 * cos(6.2831853 * y), k);
    float avg = inversesqrt(3.14159 * (k + 0.25));
    // below ~3 px per line the lines would alias into moire, fall back to their average
    float vis = smoothstep(2.0, 4.0, pxPerLine);
    float dark = uScan.y * 0.55 * mix(avg, prof, vis);
    float rv = hash2(vec2(floor(y), 3.0), uSeed) - 0.5;
    c *= (1.0 - dark) * (1.0 + rv * uScan.w * 0.12 * vis);
  }
  if (uNoiseOn) {
    float freq = min(480.0, uSize.y * 0.8);
    float amp = freq / 480.0;
    // tape snow is a little longer than high: along the line the FM luma channel has less
    // bandwidth than the line count gives vertically
    vec2 q = p * vec2(a * 0.6, 1.0) * freq;
    float n = vnoise(q, uSeed + 21.0) - 0.5;
    c += n * uNoise.x * 0.16 * amp;

    if (uNoise.w > 0.0) {
      // Chroma noise. The color under signal has about a tenth of the luma bandwidth, so its
      // noise comes in coarse blotches smeared along the line, worst in dark and flat areas.
      // On top a slow hue drift down the frame, the unstable color subcarrier of a worn tape.
      float cf = min(160.0, uSize.y * 0.3);
      vec2 cq = p * vec2(a * 0.18, 1.0) * cf;
      vec2 cn = vec2(vnoise(cq, uSeed + 27.0), vnoise(cq + 17.0, uSeed + 28.0)) - 0.5;
      vec3 ycc = rgb2ycc(c);
      float dark = 1.0 - clamp(ycc.x, 0.0, 1.0);
      ycc.yz += cn * uNoise.w * 0.12 * (0.4 + 0.6 * dark);
      float ang = (noise1(p.y * 4.0, uSeed + 29.0) - 0.5) * uNoise.w * 0.5;
      ycc.yz = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * ycc.yz;
      c = ycc2rgb(ycc);
    }

    // dropouts: oxide missing on the tape, a short white fleck that fades out to the right
    // while the deck's dropout compensation catches up
    float row = floor(p.y * 480.0);
    if (hash2(vec2(row, 1.0), uSeed + 23.0) > 1.0 - uNoise.y * 0.1) {
      float x0 = hash2(vec2(row, 2.0), uSeed + 23.0) * 1.1 - 0.1;
      float len = 0.03 + 0.15 * hash2(vec2(row, 3.0), uSeed + 23.0);
      float t = (p.x - x0) / len;
      float s = step(0.0, t) * exp(-t * 2.5);
      s *= 0.65 + 0.35 * hash2(vec2(floor(p.x * 320.0 * a), row), uSeed + 24.0);
      c = mix(c, vec3(0.93), clamp(s * (0.4 + uNoise.y), 0.0, 1.0));
    }
    c *= 1.0 + (noise1(p.y * 6.0, uSeed + 25.0) - 0.5) * uNoise.z * 0.14;
  }
  if (uTrackOn) {
    float band = 1.0 - smoothstep(0.0, 0.03, abs(p.y - uTrack.y));
    // mistracking noise comes as short horizontal dashes, not as dots: every line starts its
    // dash pattern at another offset
    float row = floor(p.y * 480.0);
    float cell = floor(p.x * 90.0 * a + hash2(vec2(row, 8.0), uSeed + 26.0) * 7.0);
    float line = step(0.72, hash2(vec2(cell, row), uSeed + 26.0));
    c = mix(c, vec3(0.88), band * line * uTrack.x * 0.65);
    c *= 1.0 - band * uTrack.x * 0.15;
  }

  if (uHeadOn) {
    // the switching point itself shows as a thin bright line with noise
    float hgt = 0.012 + uHead.y * 0.035;
    float edge = 1.0 - smoothstep(0.0, 0.004, abs(p.y - 1.0 + hgt));
    c += edge * uHead.x * 0.25 * hash2(vec2(floor(p.x * 300.0), 1.0), uSeed + 43.0);
  }

  if (uDigiNoise > 0.0) {
    // sensor noise of a small CCD: per pixel luminance noise in the shadows plus some slower
    // chroma blotches, at the pixel scale of a ~1500 line sensor
    float fq = min(1500.0, uSize.y);
    float sc = fq / 1500.0;
    vec2 q = p * vec2(a, 1.0) * fq;
    float l = luma(c);
    float dark = (1.0 - l) * (1.0 - l);
    float n = hash2(q, uSeed + 80.0) + hash2(q, uSeed + 81.0) - 1.0;
    vec2 cn = vec2(vnoise(q * 0.3, uSeed + 82.0), vnoise(q * 0.3 + 9.0, uSeed + 83.0)) - 0.5;
    c += (n * 0.11 * sc + vec3(cn.x, -0.4 * (cn.x + cn.y), cn.y) * 0.07) * dark * uDigiNoise;
  }

  if (uGrainOn) {
    float freq = uGrainFreq;
    float px = uSize.y / freq;
    float scale = 1.0;
    // grain finer than a pixel averages out; render it at pixel size with the averaged strength
    if (px < 1.3) {
      freq = uSize.y / 1.3;
      scale = px / 1.3;
    }
    vec2 q = p * vec2(a, 1.0) * freq;
    float l = clamp(luma(c), 0.0, 1.0);
    float n = grainAt(q, l, uSeed);
    // visible in shadows and midtones, almost none in clipped highlights
    float resp = (0.45 + 0.55 * smoothstep(0.0, 0.2, l)) * (1.0 - 0.88 * smoothstep(0.55, 1.0, l));
    float amp = uGrain.x * 0.2 * (0.4 + uGrain.w * 1.2) * resp * scale;
    if (uGrainColor) {
      // the dye clouds of the three layers are partly independent
      vec3 cn = vec3(n, grainAt(q + 71.0, l, uSeed + 5.0), grainAt(q + 143.0, l, uSeed + 6.0));
      c += mix(vec3(n), cn, 0.5) * amp;
    } else {
      c += n * amp;
    }
  }

  if (uDustOn) {
    // dust on the negative prints as small bright specks, a few darker ones
    if (uDust.x > 0.0) {
      vec2 q = p * vec2(a, 1.0) * 40.0;
      vec2 cell = floor(q);
      if (hash2(cell, uSeed + 60.0) > 1.0 - uDust.x * 0.09) {
        vec2 ctr = cell + 0.3 + 0.4 * vec2(hash2(cell, uSeed + 61.0), hash2(cell, uSeed + 62.0));
        float rad = 0.03 + 0.1 * pow(hash2(cell, uSeed + 63.0), 3.0); // in cells
        // never smaller than a pixel, a smaller speck gets fainter instead
        float radPx = rad * uSize.y / 40.0;
        float fade = min(1.0, radPx / 0.9);
        rad = max(rad, 0.9 * 40.0 / uSize.y);
        float dd = length((q - ctr) * vec2(1.0, 0.6 + 0.8 * hash2(cell, uSeed + 64.0))) / rad;
        dd += (vnoise(q * 9.0, uSeed + 65.0) - 0.5) * 0.7;
        float m = (1.0 - smoothstep(0.55, 1.0, dd)) * fade;
        vec3 tone = hash2(cell, uSeed + 66.0) > 0.2 ? vec3(0.97, 0.96, 0.92) : vec3(0.08);
        c = mix(c, tone, m * 0.85);
      }
    }
    // scratches along the film path: thin, wandering, fading in and out
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      if (hash2(vec2(fi, 70.0), uSeed) > uDust.y * 1.3) continue;
      float x = 0.08 + 0.84 * hash2(vec2(fi, 71.0), uSeed);
      x += (noise1(p.y * 2.5 + fi * 13.0, uSeed + 72.0) - 0.5) * 0.02;
      float w = max(0.0006, 0.7 / uSize.y);
      float dx = abs(p.x - x) * a;
      float line = (1.0 - smoothstep(w * 0.5, w * 1.5, dx)) * min(1.0, 0.0006 * uSize.y / 0.7);
      line *= smoothstep(0.35, 0.65, noise1(p.y * 3.0 + fi * 7.0, uSeed + 73.0));
      c = mix(c, vec3(0.93, 0.92, 0.88), line * 0.45);
    }
  }

  // half a code value of dither against banding in 8 bit targets
  c += (hash2(p * uSize, 99.0) - 0.5) / 255.0;

  if (uSplit >= 0.0 && p.x < uSplit) c = texture(uOrig, p).rgb;

  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
