// EditState (UI ranges like -100..100) to shader uniforms (mostly -1..1 and 0..1).
// Kept free of WebGL so it can be unit tested.

import {
  BLEND_MODES,
  CASTS,
  LEAK_COLORS,
  hslToRgb,
  rotateHue,
  warm,
  whiteBalance,
} from '../editor/color';
import type { RGB } from '../editor/color';
import { isIdentity } from '../editor/curves';
import { num, on, str } from '../editor/effects';
import type { EditState } from '../editor/effects';

type Uniforms = Record<string, number | boolean | number[]>;

export type PassPlan = {
  color: Uniforms;
  signal: Uniforms;
  composite: Uniforms;
  gaussianRadius: number; // in pixels of the render size, 0 = skip
  softRadius: number; // Soft Focus only, 0 = skip the soft chain
  lensRadius: number; // in pixels of the half size lens targets, 0 = skip
  glowRadius: number; // in pixels of the quarter size glow targets, 0 = skip
  brightRadius: number; // thresholded quarter size chain for Bloom and Halation, 0 = skip
  bright: Uniforms; // thresholds for the bright pass down sample
  overlay: boolean;
};

const n = (x: number) => x / 100;

// where the light gets in, and the direction it burns into the frame (aspect corrected)
const D = Math.SQRT1_2;
const LEAK_ANCHORS: Record<string, { at: [number, number]; dir: [number, number] }> = {
  left: { at: [0, 0.5], dir: [1, 0] },
  right: { at: [1, 0.45], dir: [-1, 0] },
  top: { at: [0.55, 0], dir: [0, 1] },
  bottom: { at: [0.45, 1], dir: [0, -1] },
  tl: { at: [0, 0], dir: [D, D] },
  tr: { at: [1, 0], dir: [-D, D] },
  bl: { at: [0, 1], dir: [D, -D] },
  br: { at: [1, 1], dir: [-D, -D] },
};

const GRAIN_FREQ: Record<string, number> = { fine: 1100, medium: 700, coarse: 420 };

export function planPasses(s: EditState, height: number): PassPlan {
  const seed = num(s, 'grain', 'seed');

  const wb = whiteBalance(num(s, 'grading', 'temperature'), num(s, 'grading', 'tint'));

  const splitShadow = hslToRgb(num(s, 'split', 'shadowHue'), 1, 0.5);
  const splitHigh = hslToRgb(num(s, 'split', 'highlightHue'), 1, 0.5);

  const castType = CASTS[str(s, 'cast', 'type')] ?? CASTS.warmYellow!;
  const castTemp = n(num(s, 'cast', 'temperature'));
  const castHue = num(s, 'cast', 'hue');
  const castColor = (c: RGB) => warm(rotateHue(c, castHue), castTemp);

  const color: Uniforms = {
    uLevelsOn: on(s, 'levels'),
    uLevels: [
      n(num(s, 'levels', 'inBlack')),
      n(num(s, 'levels', 'inWhite')),
      n(num(s, 'levels', 'outBlack')),
      n(num(s, 'levels', 'outWhite')),
    ],
    uGamma: Math.pow(2, -n(num(s, 'levels', 'midtones'))),

    uGradingOn: on(s, 'grading'),
    uExposure: num(s, 'grading', 'exposure'),
    uWB: wb,
    uBrightness: n(num(s, 'grading', 'brightness')),
    uContrast: n(num(s, 'grading', 'contrast')),
    uHighlights: n(num(s, 'grading', 'highlights')),
    uShadows: n(num(s, 'grading', 'shadows')),
    uWhites: n(num(s, 'grading', 'whites')),
    uBlacks: n(num(s, 'grading', 'blacks')),
    uSaturation: n(num(s, 'grading', 'saturation')),
    uVibrance: n(num(s, 'grading', 'vibrance')),
    uFade: n(num(s, 'grading', 'fade')),
    uMatte: n(num(s, 'grading', 'matte')),
    uRolloff: n(num(s, 'grading', 'rolloff')),

    uCurvesOn:
      on(s, 'curves') &&
      !(
        isIdentity(s.curves.master) &&
        isIdentity(s.curves.r) &&
        isIdentity(s.curves.g) &&
        isIdentity(s.curves.b)
      ),

    uSplitOn: on(s, 'split'),
    uSplitShadow: splitShadow,
    uSplitHigh: splitHigh,
    uSplitAmt: [n(num(s, 'split', 'shadowSat')) * 0.6, n(num(s, 'split', 'highlightSat')) * 0.6],
    uSplitBalance: n(num(s, 'split', 'balance')),

    uCastOn: on(s, 'cast'),
    uCastShadow: castColor(castType.shadow),
    uCastHigh: castColor(castType.highlight),
    uCastAmt: [
      n(num(s, 'cast', 'intensity')),
      n(num(s, 'cast', 'shadows')),
      n(num(s, 'cast', 'highlights')),
    ],
    uCastSkin: n(num(s, 'cast', 'skin')),
    uCastBlend: Math.max(0, BLEND_MODES.indexOf(str(s, 'cast', 'blend'))),

    // highlights and shadows read a local average, only worth the taps when they are used
    uLocalOn:
      on(s, 'grading') &&
      (num(s, 'grading', 'highlights') !== 0 || num(s, 'grading', 'shadows') !== 0),
    uClip: on(s, 'digicam') ? n(num(s, 'digicam', 'clip')) : 0,
  };

  const signal: Uniforms = {
    uSeed: seed,
    uDistortOn: on(s, 'distortion'),
    uDistort: n(num(s, 'distortion', 'amount')),
    uVhsOn: on(s, 'vhsDistortion'),
    uVhs: [
      n(num(s, 'vhsDistortion', 'shift')),
      n(num(s, 'vhsDistortion', 'wobble')),
      n(num(s, 'vhsDistortion', 'glitch')),
      n(num(s, 'vhsDistortion', 'tracking')),
    ],
    uTrackPos: n(num(s, 'vhsDistortion', 'trackingPos')),
    uChromaOn: on(s, 'chroma'),
    uChroma: n(num(s, 'chroma', 'intensity')),
    uChromaRadial: str(s, 'chroma', 'mode') === 'radial',
    uBleedOn: on(s, 'bleed'),
    uBleed: [n(num(s, 'bleed', 'amount')), n(num(s, 'bleed', 'shift'))],
    uMotionOn: on(s, 'motion') && num(s, 'motion', 'amount') > 0,
    uMotion: [n(num(s, 'motion', 'amount')) * 0.025, (num(s, 'motion', 'angle') * Math.PI) / 180],
    uTapeOn: on(s, 'tape'),
    uTape: [n(num(s, 'tape', 'luma')), n(num(s, 'tape', 'chroma')), n(num(s, 'tape', 'ringing'))],
    uInterlaceOn: on(s, 'interlace') && num(s, 'interlace', 'shift') > 0,
    uInterlace: [n(num(s, 'interlace', 'shift')), num(s, 'interlace', 'lines')],
    uHeadOn: on(s, 'headSwitch') && num(s, 'headSwitch', 'amount') > 0,
    uHead: [n(num(s, 'headSwitch', 'amount')), n(num(s, 'headSwitch', 'height'))],
    uDigiOn: on(s, 'digicam'),
    uDigi: [n(num(s, 'digicam', 'sharpen')), n(num(s, 'digicam', 'fringe'))],
    uJpegOn: on(s, 'jpeg') && num(s, 'jpeg', 'amount') > 0,
    uJpeg: n(num(s, 'jpeg', 'amount')),
  };

  const softFocusOn = on(s, 'softFocus');
  const lensSoftOn = on(s, 'lensSoftness');
  const lensBlurOn = on(s, 'lensBlur');
  const softRadius = softFocusOn ? height * (0.0015 + n(num(s, 'softFocus', 'radius')) * 0.006) : 0;
  // Lens Blur and Lens Softness share the half size chain; Lens Blur sets its radius when on
  const lensRadius = lensBlurOn
    ? (height / 2) * (0.004 + n(num(s, 'lensBlur', 'amount')) * 0.016)
    : lensSoftOn
      ? (height / 2) * 0.005
      : 0;
  const glowNeeded = on(s, 'haze') || lensSoftOn || lensBlurOn;
  const brightNeeded = on(s, 'bloom') || on(s, 'halation');

  const hazeWarm = n(num(s, 'haze', 'warmth'));
  const leak = LEAK_ANCHORS[str(s, 'lightLeak', 'position')] ?? LEAK_ANCHORS.right!;

  const composite: Uniforms = {
    uSeed: seed,
    uSoftFocusOn: softFocusOn,
    uSoftFocus: n(num(s, 'softFocus', 'amount')),
    uLensSoftOn: lensSoftOn,
    uLensSoft: [n(num(s, 'lensSoftness', 'amount')), n(num(s, 'lensSoftness', 'glow'))],
    uLensBlurOn: lensBlurOn,
    uLensBlur: [n(num(s, 'lensBlur', 'amount')), n(num(s, 'lensBlur', 'focus'))],

    uBloomOn: on(s, 'bloom'),
    uBloom: [n(num(s, 'bloom', 'amount')), n(num(s, 'bloom', 'threshold'))],
    uHalationOn: on(s, 'halation'),
    uHalation: [n(num(s, 'halation', 'amount')), n(num(s, 'halation', 'threshold'))],
    uHazeOn: on(s, 'haze'),
    uHaze: n(num(s, 'haze', 'amount')),
    uHazeColor: warm([0.82, 0.82, 0.82], hazeWarm),
    uLeakOn: on(s, 'lightLeak'),
    uLeakColor: LEAK_COLORS[str(s, 'lightLeak', 'color')] ?? LEAK_COLORS.orange!,
    uLeak: [n(num(s, 'lightLeak', 'intensity')), n(num(s, 'lightLeak', 'size'))],
    uLeakAnchor: leak.at,
    uLeakDir: leak.dir,
    uFlashOn: on(s, 'flash'),
    uFlash: [n(num(s, 'flash', 'intensity')), n(num(s, 'flash', 'size'))],
    uFlareOn: on(s, 'flare'),
    uFlare: [n(num(s, 'flare', 'intensity')), n(num(s, 'flare', 'x')), n(num(s, 'flare', 'y'))],

    uVignetteOn: on(s, 'vignette'),
    uVignette: [
      n(num(s, 'vignette', 'amount')),
      n(num(s, 'vignette', 'midpoint')),
      n(num(s, 'vignette', 'roundness')),
      n(num(s, 'vignette', 'feather')),
    ],
    uEdgesOn: on(s, 'edges'),
    uEdges: [n(num(s, 'edges', 'amount')), n(num(s, 'edges', 'width'))],

    uOverlayOn: on(s, 'overlay'),

    uScanOn: on(s, 'scanlines'),
    uScan: [
      num(s, 'scanlines', 'density'),
      n(num(s, 'scanlines', 'opacity')),
      n(num(s, 'scanlines', 'width')),
      n(num(s, 'scanlines', 'variation')),
    ],
    uNoiseOn: on(s, 'analogNoise'),
    uNoise: [
      n(num(s, 'analogNoise', 'intensity')),
      n(num(s, 'analogNoise', 'streaks')),
      n(num(s, 'analogNoise', 'flicker')),
      n(num(s, 'analogNoise', 'chroma')),
    ],
    uTrackOn: on(s, 'vhsDistortion') && num(s, 'vhsDistortion', 'tracking') > 0,
    uTrack: [n(num(s, 'vhsDistortion', 'tracking')), n(num(s, 'vhsDistortion', 'trackingPos'))],

    uGrainOn: on(s, 'grain') && num(s, 'grain', 'amount') > 0,
    uGrain: [
      n(num(s, 'grain', 'amount')),
      n(num(s, 'grain', 'size')),
      n(num(s, 'grain', 'roughness')),
      n(num(s, 'grain', 'contrast')),
    ],
    uGrainFreq:
      (GRAIN_FREQ[str(s, 'grain', 'distribution')] ?? 1100) *
      (1.6 - n(num(s, 'grain', 'size')) * 1.2),
    uGrainColor: str(s, 'grain', 'color') === 'color',

    uDustOn: on(s, 'dust'),
    uDust: [n(num(s, 'dust', 'dust')), n(num(s, 'dust', 'scratches'))],
    uHeadOn: on(s, 'headSwitch') && num(s, 'headSwitch', 'amount') > 0,
    uHead: [n(num(s, 'headSwitch', 'amount')), n(num(s, 'headSwitch', 'height'))],
    uDigiNoise: on(s, 'digicam') ? n(num(s, 'digicam', 'noise')) : 0,
  };

  return {
    color,
    signal,
    composite,
    gaussianRadius:
      on(s, 'gaussian') && num(s, 'gaussian', 'radius') > 0
        ? n(num(s, 'gaussian', 'radius')) * 0.02 * height
        : 0,
    softRadius,
    lensRadius,
    glowRadius: glowNeeded ? (0.03 * height) / 4 : 0,
    brightRadius: brightNeeded ? (0.035 * height) / 4 : 0,
    bright: {
      uThresh: [n(num(s, 'bloom', 'threshold')), n(num(s, 'halation', 'threshold'))],
    },
    overlay: on(s, 'overlay'),
  };
}
