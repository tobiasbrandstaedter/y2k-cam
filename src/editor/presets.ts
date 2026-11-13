// Built in presets. The 15 from spec section 5 plus the VHS additions from
// docs/looks/vhs-preset-library.md. Each one is a partial edit merged over the defaults, so it
// only lists what it changes. A test checks that every key exists and no two presets match.

import type { PartialEdit } from './effects';

export type PresetCategory =
  'vhs' | 'camcorder' | 'heavy' | 'soft' | 'summer' | 'digital' | 'experimental';

export const PRESET_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: 'vhs', label: 'VHS' },
  { id: 'camcorder', label: 'Classic Camcorder' },
  { id: 'heavy', label: 'Heavy Distortion' },
  { id: 'soft', label: 'Soft & Faded' },
  { id: 'summer', label: 'Summer Memories' },
  { id: 'digital', label: 'Early Digital' },
  { id: 'experimental', label: 'Film & Experimental' },
];

export type BuiltInPreset = {
  id: string;
  name: string;
  hint: string;
  category: PresetCategory;
  edit: PartialEdit;
};

const OVERLAY_OFF = {
  rec: false,
  recDot: false,
  recTime: false,
  cam: false,
  play: false,
  timer: false,
  mode: false,
  battery: false,
};

export const PRESETS: BuiltInPreset[] = [
  // --- VHS -------------------------------------------------------------------------------------
  {
    id: 'vhsTape',
    name: 'VHS Tape',
    category: 'vhs',
    hint: 'Klassische VHS-Kassette: weiche Luma, verschmierte Farbe, Farbrauschen, leichtes Tracking',
    edit: {
      effects: {
        // VHS keeps the reds but compresses the whites and lifts the blacks a little
        grading: {
          v: {
            saturation: -8,
            contrast: -10,
            highlights: -10,
            temperature: 4,
            tint: 3,
            fade: 12,
            matte: 10,
            rolloff: 35,
          },
        },
        scanlines: { enabled: true, v: { density: 480, opacity: 20, width: 50, variation: 35 } },
        vhsDistortion: {
          enabled: true,
          v: { shift: 30, wobble: 20, glitch: 12, tracking: 25, trackingPos: 92 },
        },
        // the fringes come from Color Bleeding, aberration only adds a hint
        chroma: { enabled: true, v: { intensity: 18, mode: 'horizontal' } },
        analogNoise: { enabled: true, v: { intensity: 32, streaks: 25, flicker: 20, chroma: 40 } },
        bleed: { enabled: true, v: { amount: 45, shift: 40 } },
        tape: { enabled: true, v: { luma: 60, chroma: 75, ringing: 35 } },
        headSwitch: { enabled: true, v: { amount: 40, height: 30 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: false,
            time: false,
            play: true,
            timer: true,
            timerText: '00:07:28',
            mode: true,
            modeText: 'SP',
            statusPos: 'tl',
            pixelate: 40,
          },
        },
      },
    },
  },
  {
    id: 'vhsNight',
    name: 'VHS Night Recording',
    category: 'vhs',
    hint: 'Dunkle Aufnahme mit hochgezogener Verstärkung: starkes Rauschen, Farbflecken, flackernde Helligkeit',
    edit: {
      effects: {
        // camcorder gain lifts the shadows, the blacks still crush, lights bloom
        grading: {
          v: {
            shadows: 12,
            blacks: -35,
            highlights: -10,
            contrast: 5,
            saturation: -28,
            temperature: -6,
            tint: 6,
            rolloff: 45,
          },
        },
        bloom: { enabled: true, v: { amount: 35, threshold: 60 } },
        scanlines: { enabled: true, v: { density: 480, opacity: 18, width: 50, variation: 30 } },
        vhsDistortion: { enabled: true, v: { shift: 25, wobble: 15, glitch: 8, tracking: 0 } },
        analogNoise: { enabled: true, v: { intensity: 65, streaks: 20, flicker: 45, chroma: 85 } },
        bleed: { enabled: true, v: { amount: 55, shift: 45 } },
        tape: { enabled: true, v: { luma: 70, chroma: 85, ringing: 40 } },
        headSwitch: { enabled: true, v: { amount: 35, height: 30 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: true,
            time: true,
            dateFormat: 'mdy',
            timeFormat: '12h',
            datePos: 'bl',
            rec: true,
            recDot: true,
            recPos: 'tr',
            color: 'white',
            pixelate: 35,
            glow: 55,
          },
        },
      },
    },
  },

  // --- Classic Camcorder ----------------------------------------------------------------------
  {
    id: 'vintageCamcorder',
    name: 'Vintage Camcorder',
    category: 'camcorder',
    hint: '90er Heimvideo: warmer Camcorder-Weißabgleich, etwas überbelichtet, Datum und REC',
    edit: {
      effects: {
        // auto white balance under daylight lands warm and a bit magenta, auto exposure opens up
        grading: {
          v: {
            exposure: 0.3,
            contrast: -8,
            highlights: -5,
            temperature: 14,
            tint: 5,
            saturation: 6,
            vibrance: 8,
            fade: 10,
            rolloff: 40,
          },
        },
        split: { v: { highlightHue: 45, highlightSat: 15 } },
        scanlines: { enabled: true, v: { density: 480, opacity: 15, width: 45, variation: 25 } },
        analogNoise: { enabled: true, v: { intensity: 20, streaks: 10, flicker: 12, chroma: 25 } },
        vhsDistortion: {
          enabled: true,
          v: { shift: 18, wobble: 10, glitch: 5, tracking: 15, trackingPos: 94 },
        },
        // Hi8 class luma, chroma as poor as on VHS
        tape: { enabled: true, v: { luma: 40, chroma: 55, ringing: 30 } },
        softFocus: { enabled: true, v: { amount: 15, radius: 35 } },
        bleed: { enabled: true, v: { amount: 35, shift: 30 } },
        overlay: {
          enabled: true,
          v: {
            date: true,
            time: true,
            rec: true,
            recDot: true,
            dateFormat: 'mdy',
            timeFormat: '12h',
            color: 'yellow',
            glow: 50,
          },
        },
      },
    },
  },
  {
    id: 'oldFamilyVideo',
    name: 'Old Family Video',
    category: 'camcorder',
    hint: 'Gealterte VHS-C-Familienkassette: braun verblasst, weich, REC und Zeitstempel',
    edit: {
      effects: {
        // years on the shelf: color fades to brown, blacks lift, the picture gets flat
        grading: {
          v: {
            exposure: 0.1,
            contrast: -18,
            saturation: -28,
            temperature: 18,
            fade: 28,
            matte: 22,
            rolloff: 30,
          },
        },
        split: { v: { shadowHue: 25, shadowSat: 20 } },
        cast: {
          enabled: true,
          v: { type: 'mutedBrown', intensity: 40, shadows: 90, highlights: 50 },
        },
        scanlines: { enabled: true, v: { density: 480, opacity: 12, width: 50, variation: 20 } },
        analogNoise: { enabled: true, v: { intensity: 22, streaks: 18, flicker: 25, chroma: 35 } },
        vhsDistortion: { enabled: true, v: { shift: 15, wobble: 15, glitch: 4, tracking: 0 } },
        tape: { enabled: true, v: { luma: 60, chroma: 70, ringing: 15 } },
        interlace: { enabled: true, v: { shift: 20, lines: 480 } },
        bleed: { enabled: true, v: { amount: 40, shift: 35 } },
        headSwitch: { enabled: true, v: { amount: 30, height: 25 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: true,
            time: true,
            dateLayout: 'stack',
            dateFormat: 'mon',
            timeFormat: '12h',
            datePos: 'br',
            rec: true,
            recDot: true,
            recPos: 'tl',
            color: 'orange',
            pixelate: 35,
            glow: 45,
          },
        },
      },
    },
  },

  // --- Heavy Distortion -----------------------------------------------------------------------
  {
    id: 'heavyVhs',
    name: 'Heavy VHS Distortion',
    category: 'heavy',
    hint: 'Abgenudelte Long-Play-Kopie: Tracking-Fehler, verzogene Zeilen, starkes Rauschen und Farbversatz',
    edit: {
      effects: {
        // a worn third generation copy: the color drifts to a cold green and fades out
        grading: {
          v: {
            saturation: -30,
            contrast: -12,
            temperature: -12,
            tint: -14,
            fade: 24,
            matte: 18,
            rolloff: 40,
          },
        },
        scanlines: { enabled: true, v: { density: 480, opacity: 28, width: 55, variation: 55 } },
        vhsDistortion: {
          enabled: true,
          v: { shift: 70, wobble: 55, glitch: 45, tracking: 70, trackingPos: 80 },
        },
        chroma: { enabled: true, v: { intensity: 35, mode: 'horizontal' } },
        analogNoise: { enabled: true, v: { intensity: 55, streaks: 60, flicker: 45, chroma: 75 } },
        bleed: { enabled: true, v: { amount: 70, shift: 65 } },
        tape: { enabled: true, v: { luma: 85, chroma: 95, ringing: 55 } },
        headSwitch: { enabled: true, v: { amount: 75, height: 55 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: false,
            time: false,
            play: true,
            timer: true,
            timerText: '01:43:17',
            mode: true,
            modeText: 'LP',
            statusPos: 'tl',
            pixelate: 45,
          },
        },
      },
    },
  },

  // --- Soft & Faded ---------------------------------------------------------------------------
  {
    id: 'softVhs',
    name: 'Soft VHS Memories',
    category: 'soft',
    hint: 'Weiche, pastellige VHS-Erinnerung: wenig Kontrast, verblasste Farben, kaum Störungen',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.35,
            contrast: -26,
            highlights: -15,
            saturation: -4,
            temperature: 6,
            tint: 12,
            fade: 24,
            matte: 12,
            rolloff: 45,
          },
        },
        // pastel rather than gray: peach highlights, lavender shadows
        split: { v: { highlightHue: 25, highlightSat: 32, shadowHue: 275, shadowSat: 32 } },
        scanlines: { enabled: true, v: { density: 480, opacity: 10, width: 50, variation: 15 } },
        vhsDistortion: { enabled: true, v: { shift: 12, wobble: 8, glitch: 3, tracking: 0 } },
        analogNoise: { enabled: true, v: { intensity: 15, streaks: 5, flicker: 10, chroma: 20 } },
        bleed: { enabled: true, v: { amount: 30, shift: 20 } },
        tape: { enabled: true, v: { luma: 55, chroma: 65, ringing: 10 } },
        softFocus: { enabled: true, v: { amount: 35, radius: 45 } },
        bloom: { enabled: true, v: { amount: 15, threshold: 70 } },
      },
    },
  },
  {
    id: 'fadedFilm',
    name: 'Faded Film',
    category: 'soft',
    hint: 'Angehobene Schwarztöne, wenig Kontrast, feines Korn',
    edit: {
      effects: {
        // one way of lifting the blacks, not three, so dark scenes keep a dark point
        grading: { v: { contrast: -30, saturation: -30, fade: 40, matte: 25, rolloff: 20 } },
        grain: { enabled: true, v: { amount: 22, size: 30, roughness: 40, distribution: 'fine' } },
        vignette: { enabled: true, v: { amount: 10 } },
      },
    },
  },
  {
    id: 'warmNostalgia',
    name: 'Warm Nostalgia',
    category: 'soft',
    hint: 'Gelblich-orange, matte Schwarztöne, weich',
    edit: {
      effects: {
        grading: {
          v: { temperature: 35, tint: 4, saturation: -5, contrast: -12, matte: 30, fade: 15 },
        },
        cast: {
          enabled: true,
          v: { type: 'warmYellow', intensity: 45, shadows: 90, highlights: 60 },
        },
        softFocus: { enabled: true, v: { amount: 25, radius: 30 } },
        grain: { enabled: true, v: { amount: 15, size: 35 } },
        vignette: { enabled: true, v: { amount: 25 } },
      },
    },
  },
  {
    id: 'coolVintage',
    name: 'Cool Vintage',
    category: 'soft',
    hint: 'Bläuliche Schatten, entsättigt, dezentes Korn',
    edit: {
      effects: {
        grading: { v: { temperature: -25, saturation: -30, contrast: -8, matte: 20, fade: 15 } },
        split: { v: { shadowHue: 215, shadowSat: 40, highlightHue: 50, highlightSat: 8 } },
        cast: { enabled: true, v: { type: 'coolBlue', intensity: 30 } },
        grain: { enabled: true, v: { amount: 18, size: 30, distribution: 'fine' } },
        vignette: { enabled: true, v: { amount: 15 } },
      },
    },
  },

  // --- Summer Memories ------------------------------------------------------------------------
  {
    id: 'summerVacation97',
    name: 'Summer Vacation 1997',
    category: 'summer',
    hint: 'Urlaubsvideo vom Strand: warme, verblasste Lichter, grünliche Schatten, VHS-Textur, Datum',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.25,
            temperature: 30,
            tint: -3,
            contrast: -14,
            highlights: -20,
            saturation: 15,
            vibrance: 10,
            fade: 16,
            rolloff: 45,
          },
        },
        split: { v: { highlightHue: 40, highlightSat: 30, shadowHue: 150, shadowSat: 8 } },
        scanlines: { enabled: true, v: { density: 480, opacity: 14, width: 50, variation: 25 } },
        vhsDistortion: { enabled: true, v: { shift: 20, wobble: 12, glitch: 6, tracking: 0 } },
        analogNoise: { enabled: true, v: { intensity: 22, streaks: 12, flicker: 15, chroma: 30 } },
        bleed: { enabled: true, v: { amount: 40, shift: 35 } },
        tape: { enabled: true, v: { luma: 50, chroma: 65, ringing: 25 } },
        headSwitch: { enabled: true, v: { amount: 25, height: 25 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: true,
            time: false,
            dateFormat: 'mon',
            datePos: 'br',
            color: 'white',
            pixelate: 30,
            glow: 40,
          },
        },
      },
    },
  },
  {
    id: 'beachMemories',
    name: 'Beach Memories',
    category: 'summer',
    hint: 'Blasse Strandfotos: gelbliche Lichter, grünliche Schatten, entsättigtes Blau',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.2,
            temperature: 2,
            tint: -4,
            contrast: -10,
            highlights: -20,
            saturation: -18,
            fade: 18,
            rolloff: 35,
          },
        },
        split: { v: { highlightHue: 55, highlightSat: 26, shadowHue: 165, shadowSat: 34 } },
        softFocus: { enabled: true, v: { amount: 35, radius: 35 } },
        grain: {
          enabled: true,
          v: { amount: 18, size: 45, distribution: 'medium', roughness: 40 },
        },
        halation: { enabled: true, v: { amount: 12, threshold: 65 } },
      },
      // blue range squeezed: less saturated blues, slightly warm highlights
      curves: {
        b: [
          [0, 0.06],
          [0.5, 0.48],
          [1, 0.9],
        ],
      },
    },
  },
  {
    id: 'summer90s',
    name: '90s Summer',
    category: 'summer',
    hint: 'Goldorange Sommersonne, kräftige Farben, leuchtende Lichter, analoges Korn',
    edit: {
      effects: {
        grading: {
          v: {
            temperature: 32,
            tint: 4,
            exposure: 0.1,
            highlights: 5,
            saturation: 14,
            vibrance: 10,
            fade: 10,
            rolloff: 30,
          },
        },
        split: { v: { highlightHue: 32, highlightSat: 30, shadowHue: 20, shadowSat: 10 } },
        grain: {
          enabled: true,
          v: { amount: 28, size: 45, roughness: 55, distribution: 'medium', contrast: 55 },
        },
        halation: { enabled: true, v: { amount: 30, threshold: 58 } },
        vignette: { enabled: true, v: { amount: 20 } },
      },
    },
  },
  {
    id: 'analogSummer2003',
    name: 'Analog Summer 2003',
    category: 'summer',
    hint: 'Warme Sommerfarben, leicht überbelichtet, weiches Korn, Lichtleck',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.3,
            temperature: 25,
            saturation: 5,
            vibrance: 15,
            contrast: -12,
            fade: 18,
            rolloff: 35,
          },
        },
        split: { v: { highlightHue: 42, highlightSat: 22, shadowHue: 190, shadowSat: 12 } },
        grain: {
          enabled: true,
          v: { amount: 22, size: 40, roughness: 40, distribution: 'medium', contrast: 40 },
        },
        halation: { enabled: true, v: { amount: 15, threshold: 65 } },
        lightLeak: {
          enabled: true,
          v: { color: 'orange', intensity: 20, position: 'tr', size: 40 },
        },
      },
    },
  },

  // --- Early Digital --------------------------------------------------------------------------
  {
    id: 'miniDV',
    name: 'MiniDV',
    category: 'digital',
    hint: 'Digitaler Camcorder um 2002: nachgeschärft, harte Lichter, DCT-Artefakte, Interlacing',
    edit: {
      effects: {
        // DV is clean and punchy, slightly magenta: no tape noise, no line jitter
        grading: {
          v: { contrast: 12, saturation: 16, vibrance: 10, temperature: 4, tint: 6, whites: 5 },
        },
        // the small CCD clips early, which is enough: no extra highlight lift on top
        digicam: { enabled: true, v: { sharpen: 50, clip: 30, fringe: 15, noise: 12 } },
        jpeg: { enabled: true, v: { amount: 30 } },
        // DV records chroma at a quarter of the luma resolution
        tape: { enabled: true, v: { luma: 10, chroma: 45, ringing: 5 } },
        interlace: { enabled: true, v: { shift: 30, lines: 576 } },
        scanlines: { enabled: true, v: { density: 576, opacity: 8, width: 40, variation: 10 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: true,
            time: true,
            dateLayout: 'stack',
            dateFormat: 'mon',
            timeFormat: '24h',
            datePos: 'br',
            recTime: true,
            recTimeText: '0:12:33',
            recPos: 'tl',
            mode: true,
            modeText: 'SP',
            battery: true,
            statusPos: 'tr',
            pixelate: 45,
            glow: 25,
          },
        },
      },
    },
  },
  {
    id: 'digicam2000',
    name: '2000s Digital Camera',
    category: 'digital',
    hint: 'Warm, leicht verblasst, weicher Kontrast, Datumsstempel',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.25,
            contrast: -15,
            highlights: -10,
            temperature: 18,
            saturation: -6,
            vibrance: 10,
            fade: 12,
            rolloff: 30,
          },
        },
        split: { v: { highlightHue: 45, highlightSat: 18, shadowHue: 200, shadowSat: 10 } },
        grain: {
          enabled: true,
          v: { amount: 10, size: 25, roughness: 30, contrast: 35, distribution: 'fine' },
        },
        digicam: { enabled: true, v: { sharpen: 30, clip: 25, fringe: 15, noise: 15 } },
        jpeg: { enabled: true, v: { amount: 15 } },
        chroma: { enabled: true, v: { intensity: 10, mode: 'radial' } },
        vignette: { enabled: true, v: { amount: 15, midpoint: 55, feather: 70 } },
        overlay: {
          enabled: true,
          v: {
            ...OVERLAY_OFF,
            date: true,
            time: false,
            dateFormat: 'digicam',
            dateFont: 'segment',
            datePos: 'br',
            color: 'orange',
            size: 35,
            glow: 60,
            pixelate: 0,
          },
        },
      },
    },
  },
  {
    id: 'oldSony',
    name: 'Old Sony Camera',
    category: 'digital',
    hint: 'Frühe Digitalfotografie, harte Lichter, kühl, Farbrauschen',
    edit: {
      effects: {
        grading: {
          v: {
            contrast: 15,
            highlights: 15,
            whites: 15,
            temperature: -18,
            tint: -5,
            saturation: 5,
          },
        },
        // a 2 to 3 megapixel CCD: clipped highlights, sharpening halos, noisy shadows
        digicam: { enabled: true, v: { sharpen: 55, clip: 35, fringe: 35, noise: 35 } },
        jpeg: { enabled: true, v: { amount: 25 } },
        chroma: { enabled: true, v: { intensity: 14, mode: 'radial' } },
        edges: { enabled: true, v: { amount: 20, width: 25 } },
      },
    },
  },

  // --- Film & Experimental --------------------------------------------------------------------
  {
    id: 'disposable',
    name: 'Disposable Camera',
    category: 'experimental',
    hint: 'Starker Blitz, helle Lichter, dunkle Ecken, körnig',
    edit: {
      effects: {
        grading: {
          v: { contrast: 20, highlights: 8, saturation: 10, temperature: 8, rolloff: 30 },
        },
        cast: { enabled: true, v: { type: 'fadedGreen', intensity: 20 } },
        flash: { enabled: true, v: { intensity: 42, size: 45 } },
        vignette: { enabled: true, v: { amount: 45, feather: 50 } },
        edges: { enabled: true, v: { amount: 30, width: 30 } },
        grain: {
          enabled: true,
          v: { amount: 35, size: 55, roughness: 60, distribution: 'medium' },
        },
        lensSoftness: { enabled: true, v: { amount: 35, glow: 20 } },
        // single element plastic lens
        distortion: { enabled: true, v: { amount: 12 } },
      },
    },
  },
  {
    id: 'expiredFilm',
    name: 'Expired Film',
    category: 'experimental',
    hint: 'Unregelmäßige Farbverschiebung, Lichtleck, grobes Korn',
    edit: {
      effects: {
        grading: { v: { contrast: -10, saturation: -25, fade: 30, tint: 18, temperature: -8 } },
        split: { v: { shadowHue: 170, shadowSat: 35, highlightHue: 25, highlightSat: 30 } },
        lightLeak: { enabled: true, v: { color: 'red', intensity: 25, position: 'tl', size: 50 } },
        grain: {
          enabled: true,
          v: { amount: 40, size: 60, roughness: 75, distribution: 'medium', color: 'color' },
        },
        vignette: { enabled: true, v: { amount: 20 } },
        haze: { enabled: true, v: { amount: 15, warmth: 30 } },
        // old emulsion drifts toward olive, and an old roll picks up dust
        cast: { enabled: true, v: { type: 'oliveFilm', intensity: 25 } },
        dust: { enabled: true, v: { dust: 20, scratches: 10 } },
      },
      curves: {
        r: [
          [0, 0.05],
          [1, 0.95],
        ],
        g: [
          [0, 0],
          [0.5, 0.55],
          [1, 1],
        ],
        b: [
          [0, 0.1],
          [1, 0.85],
        ],
      },
    },
  },
  {
    id: 'pinkFilm',
    name: 'Pink Film',
    category: 'experimental',
    hint: 'Rosastich, helle Lichter, weiche Kontraste',
    edit: {
      effects: {
        grading: {
          v: {
            exposure: 0.2,
            highlights: 10,
            contrast: -20,
            saturation: -5,
            tint: 15,
            fade: 15,
            rolloff: 25,
          },
        },
        cast: { enabled: true, v: { type: 'warmPink', intensity: 45 } },
        split: { v: { highlightHue: 340, highlightSat: 20 } },
        grain: { enabled: true, v: { amount: 15, size: 30, distribution: 'fine' } },
        bloom: { enabled: true, v: { amount: 20, threshold: 70 } },
      },
    },
  },
];
