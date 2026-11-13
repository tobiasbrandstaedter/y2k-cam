// Every effect and every parameter the editor knows about. The UI builds its controls from this
// list and the renderer reads the same keys, so a control without an effect cannot exist.
// Spec: docs/specs/foto-editor.md, sections 3 and 4.

export type Value = number | string | boolean;

type Base = {
  key: string;
  label: string;
  // heading shown above this control when it differs from the previous one
  section?: string;
  // only show the control while another value of the same effect has this value
  when?: { key: string; value: Value };
};
export type RangeParam = Base & {
  kind: 'range';
  min: number;
  max: number;
  step?: number;
  default: number;
  unit?: string;
  // describes what the effect looks like rather than how strong it is (a hue, a size, a
  // position), so the Intensität slider leaves it alone
  shape?: boolean;
};
export type SelectParam = Base & {
  kind: 'select';
  options: { value: string; label: string }[];
  default: string;
};
export type ToggleParam = Base & { kind: 'toggle'; default: boolean };
export type TextParam = Base & { kind: 'text'; default: string; placeholder?: string };
export type ParamDef = RangeParam | SelectParam | ToggleParam | TextParam;

export type CategoryId =
  'color' | 'cast' | 'grain' | 'vhs' | 'digital' | 'light' | 'optics' | 'overlay';

export type EffectDef = {
  id: string;
  label: string;
  category: CategoryId;
  // effects whose defaults are a no-op start enabled, so the user can just pull a slider
  enabled: boolean;
  params: ParamDef[];
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'color', label: 'Farbe' },
  { id: 'cast', label: 'Farbstich' },
  { id: 'grain', label: 'Filmkorn' },
  { id: 'vhs', label: 'VHS & Camcorder' },
  { id: 'digital', label: 'Digicam' },
  { id: 'light', label: 'Licht & Linse' },
  { id: 'optics', label: 'Vignette & Optik' },
  { id: 'overlay', label: 'Einblendungen' },
];

const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  def: number,
  extra: { step?: number; unit?: string } = {},
): RangeParam => ({ kind: 'range', key, label, min, max, default: def, ...extra });

const pct = (key: string, label: string, def: number) => range(key, label, 0, 100, def);
const fixed = (p: RangeParam): RangeParam => ({ ...p, shape: true });
const signed = (key: string, label: string, def = 0) => range(key, label, -100, 100, def);

const select = (
  key: string,
  label: string,
  options: [string, string][],
  def: string,
): SelectParam => ({
  kind: 'select',
  key,
  label,
  options: options.map(([value, l]) => ({ value, label: l })),
  default: def,
});

const toggle = (key: string, label: string, def: boolean): ToggleParam => ({
  kind: 'toggle',
  key,
  label,
  default: def,
});

const text = (key: string, label: string, def: string, placeholder?: string): TextParam => ({
  kind: 'text',
  key,
  label,
  default: def,
  placeholder,
});

const POSITIONS: [string, string][] = [
  ['tl', 'Oben links'],
  ['tc', 'Oben Mitte'],
  ['tr', 'Oben rechts'],
  ['bl', 'Unten links'],
  ['bc', 'Unten Mitte'],
  ['br', 'Unten rechts'],
];

export const EFFECTS: EffectDef[] = [
  // A. Color Grading
  {
    id: 'grading',
    label: 'Grundkorrektur',
    category: 'color',
    enabled: true,
    params: [
      range('exposure', 'Belichtung', -2, 2, 0, { step: 0.01, unit: 'EV' }),
      signed('brightness', 'Helligkeit'),
      signed('contrast', 'Kontrast'),
      signed('highlights', 'Lichter'),
      signed('shadows', 'Tiefen'),
      signed('whites', 'Weiß'),
      signed('blacks', 'Schwarz'),
      signed('temperature', 'Temperatur'),
      signed('tint', 'Tönung'),
      signed('saturation', 'Sättigung'),
      signed('vibrance', 'Dynamik'),
      pct('fade', 'Verblassen', 0),
      pct('matte', 'Schwarz anheben', 0),
      pct('rolloff', 'Lichter abrunden', 0),
    ],
  },
  {
    id: 'levels',
    label: 'Tonwerte',
    category: 'color',
    enabled: true,
    params: [
      pct('inBlack', 'Eingang Schwarz', 0),
      pct('inWhite', 'Eingang Weiß', 100),
      signed('midtones', 'Mitten'),
      pct('outBlack', 'Ausgang Schwarz', 0),
      pct('outWhite', 'Ausgang Weiß', 100),
    ],
  },
  {
    id: 'split',
    label: 'Split Toning',
    category: 'color',
    enabled: true,
    params: [
      fixed(range('shadowHue', 'Tiefen Farbton', 0, 360, 210, { unit: '°' })),
      pct('shadowSat', 'Tiefen Sättigung', 0),
      fixed(range('highlightHue', 'Lichter Farbton', 0, 360, 40, { unit: '°' })),
      pct('highlightSat', 'Lichter Sättigung', 0),
      fixed(signed('balance', 'Balance')),
    ],
  },
  // the curve points live in EditState.curves, this entry only carries the on/off switch
  { id: 'curves', label: 'RGB-Kurven', category: 'color', enabled: true, params: [] },

  // B. Vintage Color Cast
  {
    id: 'cast',
    label: 'Vintage-Farbstich',
    category: 'cast',
    enabled: false,
    params: [
      select(
        'type',
        'Farbstich',
        [
          ['warmYellow', 'Warm Yellow'],
          ['fadedGreen', 'Faded Green'],
          ['mutedBrown', 'Muted Brown'],
          ['warmPink', 'Warm Pink'],
          ['coolBlue', 'Cool Blue'],
          ['oliveFilm', 'Olive Film'],
          ['sepiaLight', 'Sepia Light'],
        ],
        'warmYellow',
      ),
      pct('intensity', 'Intensität', 50),
      fixed(signed('temperature', 'Farbtemperatur')),
      fixed(range('hue', 'Farbton', -180, 180, 0, { unit: '°' })),
      select(
        'blend',
        'Mischmodus',
        [
          ['softLight', 'Weiches Licht'],
          ['overlay', 'Ineinanderkopieren'],
          ['multiply', 'Multiplizieren'],
          ['screen', 'Negativ multiplizieren'],
          ['color', 'Farbe'],
        ],
        'softLight',
      ),
      fixed(pct('highlights', 'Intensität Lichter', 70)),
      fixed(pct('shadows', 'Intensität Tiefen', 80)),
      fixed(pct('skin', 'Hauttöne schützen', 60)),
    ],
  },

  // C. Film Grain
  {
    id: 'grain',
    label: 'Filmkorn',
    category: 'grain',
    enabled: false,
    params: [
      pct('amount', 'Menge', 30),
      fixed(pct('size', 'Größe', 40)),
      fixed(pct('roughness', 'Rauheit', 50)),
      fixed(pct('contrast', 'Kontrast', 50)),
      select(
        'color',
        'Kornfarbe',
        [
          ['mono', 'Monochrom'],
          ['color', 'Farbig'],
        ],
        'mono',
      ),
      select(
        'distribution',
        'Verteilung',
        [
          ['fine', 'Fein'],
          ['medium', 'Mittel'],
          ['coarse', 'Grob'],
        ],
        'fine',
      ),
      fixed(range('seed', 'Seed', 1, 999, 7, { step: 1 })),
    ],
  },
  {
    id: 'dust',
    label: 'Staub & Kratzer',
    category: 'grain',
    enabled: false,
    params: [pct('dust', 'Staub', 25), pct('scratches', 'Kratzer', 15)],
  },

  // D. VHS / Camcorder
  {
    id: 'scanlines',
    label: 'Scanlines',
    category: 'vhs',
    enabled: false,
    params: [
      fixed(range('density', 'Dichte', 120, 720, 480, { step: 1, unit: 'Zeilen' })),
      pct('opacity', 'Deckkraft', 25),
      fixed(pct('width', 'Linienbreite', 50)),
      fixed(pct('variation', 'Helligkeitsunterschied', 30)),
    ],
  },
  {
    id: 'analogNoise',
    label: 'Analog Noise',
    category: 'vhs',
    enabled: false,
    params: [
      pct('intensity', 'Intensität', 30),
      pct('streaks', 'Horizontale Störungen', 30),
      pct('flicker', 'Flimmern', 20),
      pct('chroma', 'Farbrauschen', 25),
    ],
  },
  {
    id: 'chroma',
    label: 'Chromatic Aberration',
    category: 'vhs',
    enabled: false,
    params: [
      pct('intensity', 'Intensität', 30),
      select(
        'mode',
        'Richtung',
        [
          ['horizontal', 'Horizontal'],
          ['radial', 'Radial'],
        ],
        'horizontal',
      ),
    ],
  },
  {
    id: 'vhsDistortion',
    label: 'VHS Distortion',
    category: 'vhs',
    enabled: false,
    params: [
      pct('shift', 'Verschiebung', 30),
      pct('wobble', 'Verzerrung', 20),
      pct('glitch', 'Signalfehler', 15),
      pct('tracking', 'Tracking-Linien', 0),
      fixed(pct('trackingPos', 'Position Tracking', 88)),
    ],
  },
  {
    id: 'softFocus',
    label: 'Soft Focus',
    category: 'vhs',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), fixed(pct('radius', 'Radius', 40))],
  },
  {
    id: 'bleed',
    label: 'Color Bleeding',
    category: 'vhs',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), pct('shift', 'Verschiebung', 30)],
  },
  {
    // what the tape could not record: ~240 lines of luma, far less chroma, edge ringing
    id: 'tape',
    label: 'Band-Auflösung',
    category: 'vhs',
    enabled: false,
    params: [
      pct('luma', 'Luma-Unschärfe', 40),
      pct('chroma', 'Chroma-Unschärfe', 50),
      pct('ringing', 'Kantenüberschwinger', 25),
    ],
  },
  {
    id: 'interlace',
    label: 'Interlacing',
    category: 'vhs',
    enabled: false,
    params: [
      pct('shift', 'Halbbild-Versatz', 30),
      fixed(range('lines', 'Zeilen', 240, 720, 480, { step: 1, unit: 'Zeilen' })),
    ],
  },
  {
    id: 'headSwitch',
    label: 'Kopfumschaltung',
    category: 'vhs',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), fixed(pct('height', 'Höhe', 30))],
  },

  // early digital cameras
  {
    id: 'digicam',
    label: 'Digicam-Sensor',
    category: 'digital',
    enabled: false,
    params: [
      pct('sharpen', 'Nachschärfung', 40),
      pct('clip', 'Lichter-Clipping', 30),
      pct('fringe', 'Purple Fringing', 30),
      pct('noise', 'Sensorrauschen', 25),
    ],
  },
  {
    id: 'jpeg',
    label: 'JPEG-Kompression',
    category: 'digital',
    enabled: false,
    params: [pct('amount', 'Stärke', 25)],
  },

  // E. Light Leaks and Lens Effects
  {
    id: 'lightLeak',
    label: 'Light Leak',
    category: 'light',
    enabled: false,
    params: [
      select(
        'color',
        'Farbe',
        [
          ['orange', 'Orange'],
          ['red', 'Rot'],
          ['yellow', 'Gelb'],
          ['pink', 'Soft Pink'],
        ],
        'orange',
      ),
      pct('intensity', 'Intensität', 40),
      select(
        'position',
        'Position',
        [
          ['left', 'Links'],
          ['right', 'Rechts'],
          ['top', 'Oben'],
          ['bottom', 'Unten'],
          ['tl', 'Ecke oben links'],
          ['tr', 'Ecke oben rechts'],
          ['bl', 'Ecke unten links'],
          ['br', 'Ecke unten rechts'],
        ],
        'right',
      ),
      fixed(pct('size', 'Größe', 50)),
    ],
  },
  {
    id: 'flash',
    label: 'White Flash',
    category: 'light',
    enabled: false,
    params: [pct('intensity', 'Intensität', 40), fixed(pct('size', 'Größe', 50))],
  },
  {
    id: 'haze',
    label: 'Lens Haze',
    category: 'light',
    enabled: false,
    params: [pct('amount', 'Stärke', 30), fixed(signed('warmth', 'Wärme', 20))],
  },
  {
    id: 'halation',
    label: 'Halation',
    category: 'light',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), fixed(pct('threshold', 'Schwelle', 60))],
  },
  {
    id: 'bloom',
    label: 'Bloom',
    category: 'light',
    enabled: false,
    params: [pct('amount', 'Stärke', 30), fixed(pct('threshold', 'Schwelle', 70))],
  },
  {
    id: 'flare',
    label: 'Lens Flare',
    category: 'light',
    enabled: false,
    params: [
      pct('intensity', 'Intensität', 30),
      fixed(pct('x', 'Lichtquelle X', 78)),
      fixed(pct('y', 'Lichtquelle Y', 18)),
    ],
  },

  // F. Vignette and optics
  {
    id: 'vignette',
    label: 'Vignette',
    category: 'optics',
    enabled: false,
    params: [
      signed('amount', 'Stärke', 40),
      fixed(pct('midpoint', 'Mittelpunkt', 50)),
      fixed(pct('roundness', 'Rundheit', 60)),
      fixed(pct('feather', 'Weichheit', 60)),
    ],
  },
  {
    id: 'edges',
    label: 'Soft Edge Darkening',
    category: 'optics',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), fixed(pct('width', 'Breite', 30))],
  },
  {
    id: 'lensBlur',
    label: 'Lens Blur',
    category: 'optics',
    enabled: false,
    params: [pct('amount', 'Stärke', 40), fixed(pct('focus', 'Schärfebereich', 50))],
  },
  {
    id: 'gaussian',
    label: 'Gaussian Blur',
    category: 'optics',
    enabled: false,
    params: [pct('radius', 'Radius', 10)],
  },
  {
    id: 'motion',
    label: 'Motion Blur',
    category: 'optics',
    enabled: false,
    params: [
      pct('amount', 'Stärke', 20),
      fixed(range('angle', 'Winkel', 0, 180, 0, { unit: '°' })),
    ],
  },
  {
    id: 'lensSoftness',
    label: 'Vintage Lens Softness',
    category: 'optics',
    enabled: false,
    params: [pct('amount', 'Randunschärfe', 40), pct('glow', 'Leuchten', 30)],
  },
  {
    id: 'distortion',
    label: 'Edge Distortion',
    category: 'optics',
    enabled: false,
    params: [signed('amount', 'Stärke', 25)],
  },

  // 4. Device overlays
  {
    id: 'overlay',
    label: 'Kamera-Einblendungen',
    category: 'overlay',
    enabled: false,
    params: [
      { ...toggle('date', 'Datum', true), section: 'Datum und Uhrzeit' },
      toggle('time', 'Uhrzeit', true),
      select(
        'dateSource',
        'Quelle',
        [
          ['auto', 'Aufnahmedatum'],
          ['custom', 'Eigene Eingabe'],
        ],
        'auto',
      ),
      {
        ...text('dateText', 'Eigenes Datum', '03/20/23', '03/20/23'),
        when: { key: 'dateSource', value: 'custom' },
      },
      {
        ...text('timeText', 'Eigene Uhrzeit', 'PM 3:20', 'PM 3:20'),
        when: { key: 'dateSource', value: 'custom' },
      },
      {
        ...select(
          'dateFormat',
          'Datumsformat',
          [
            ['mdy', '03/20/23'],
            ['dmy', '20.03.2023'],
            ['ymd', '2023.03.20'],
            ['mon', 'MAR. 20 2023'],
            ['digicam', "'23 3 20"],
          ],
          'mdy',
        ),
        when: { key: 'dateSource', value: 'auto' },
      },
      {
        ...select(
          'timeFormat',
          'Zeitformat',
          [
            ['12h', 'PM 3:20'],
            ['24h', '15:20'],
          ],
          '12h',
        ),
        when: { key: 'dateSource', value: 'auto' },
      },
      select(
        'dateLayout',
        'Anordnung',
        [
          ['line', 'Eine Zeile'],
          ['stack', 'Zwei Zeilen'],
        ],
        'line',
      ),
      select('datePos', 'Position', POSITIONS, 'bl'),

      { ...toggle('rec', 'REC-Symbol', true), section: 'Aufnahme' },
      toggle('recDot', 'Aufnahmeindikator', true),
      toggle('recTime', 'REC-Timestamp', false),
      { ...text('recTimeText', 'Zeitstempel', '0:00:12'), when: { key: 'recTime', value: true } },
      select('recPos', 'Position', POSITIONS, 'tr'),

      { ...toggle('cam', 'Kamera-Name', false), section: 'Status' },
      { ...text('camText', 'Name', 'CAM 01'), when: { key: 'cam', value: true } },
      toggle('play', 'PLAY', false),
      toggle('timer', 'Timer', false),
      { ...text('timerText', 'Timer', '00:07:28'), when: { key: 'timer', value: true } },
      toggle('mode', 'Aufnahmemodus', false),
      { ...text('modeText', 'Modus', 'SP'), when: { key: 'mode', value: true } },
      toggle('battery', 'Batteriestatus', false),
      { ...fixed(pct('batteryLevel', 'Ladung', 66)), when: { key: 'battery', value: true } },
      select('statusPos', 'Position', POSITIONS, 'tl'),

      {
        ...select(
          'color',
          'Schriftfarbe',
          [
            ['white', 'Weiß'],
            ['gray', 'Hellgrau'],
            ['orange', 'Orange'],
            ['yellow', 'Gelb'],
            ['green', 'Grün'],
          ],
          'white',
        ),
        section: 'Darstellung',
      },
      select(
        'dateFont',
        'Schrift Datum',
        [
          ['pixel', 'Pixel'],
          ['segment', '7-Segment'],
        ],
        'pixel',
      ),
      fixed(pct('size', 'Größe', 40)),
      fixed(pct('opacity', 'Deckkraft', 90)),
      fixed(pct('glow', 'Glow', 40)),
      fixed(pct('pixelate', 'Pixelig', 30)),
      fixed(pct('margin', 'Randabstand', 40)),
    ],
  },
];

export const EFFECT_BY_ID: Record<string, EffectDef> = Object.fromEntries(
  EFFECTS.map((e) => [e.id, e]),
);

export type CurvePoint = [number, number];
export type Curves = { master: CurvePoint[]; r: CurvePoint[]; g: CurvePoint[]; b: CurvePoint[] };
export type CurveChannel = keyof Curves;

export type EffectState = { enabled: boolean; v: Record<string, Value> };
// intensity 0..100 scales the whole look between the original and the full edit, see withIntensity
export type EditState = { effects: Record<string, EffectState>; curves: Curves; intensity: number };

const identity = (): CurvePoint[] => [
  [0, 0],
  [1, 1],
];

export function defaultEffect(def: EffectDef): EffectState {
  return {
    enabled: def.enabled,
    v: Object.fromEntries(def.params.map((p) => [p.key, p.default])),
  };
}

export function defaultState(): EditState {
  return {
    effects: Object.fromEntries(EFFECTS.map((e) => [e.id, defaultEffect(e)])),
    curves: { master: identity(), r: identity(), g: identity(), b: identity() },
    intensity: 100,
  };
}

// A partial state: only the effects and values that differ from the defaults.
export type PartialEdit = {
  effects?: Record<string, { enabled?: boolean; v?: Record<string, Value> }>;
  curves?: Partial<Curves>;
  intensity?: number;
};

export function applyPartial(base: EditState, partial: PartialEdit): EditState {
  const next = structuredClone(base);
  for (const [id, e] of Object.entries(partial.effects ?? {})) {
    const target = next.effects[id];
    if (!target) throw new Error(`Unknown effect "${id}" in preset`);
    if (e.enabled !== undefined) target.enabled = e.enabled;
    Object.assign(target.v, e.v ?? {});
  }
  for (const [ch, pts] of Object.entries(partial.curves ?? {})) {
    next.curves[ch as CurveChannel] = pts.map((p) => [p[0], p[1]]);
  }
  if (partial.intensity !== undefined) next.intensity = partial.intensity;
  return next;
}

// The edit the renderer actually draws. Every strength parameter moves toward its neutral value:
// the default for effects that are on by default (their defaults do nothing), 0 for the others.
// Shape parameters, selects, toggles and texts stay, so the look keeps its character and only
// gets weaker. At 0 the result is the original photo.
export function withIntensity(state: EditState): EditState {
  const k = state.intensity / 100;
  if (k >= 1) return state;
  const effects: Record<string, EffectState> = {};
  for (const def of EFFECTS) {
    const e = state.effects[def.id]!;
    const v = { ...e.v };
    for (const p of def.params) {
      if (p.kind !== 'range' || p.shape) continue;
      const neutral = def.enabled ? p.default : Math.min(Math.max(0, p.min), p.max);
      v[p.key] = neutral + ((v[p.key] as number) - neutral) * k;
    }
    effects[def.id] = { enabled: e.enabled && (def.enabled || k > 0), v };
  }
  const toward = (pts: CurvePoint[]): CurvePoint[] => pts.map(([x, y]) => [x, x + (y - x) * k]);
  const c = state.curves;
  return {
    effects,
    curves: { master: toward(c.master), r: toward(c.r), g: toward(c.g), b: toward(c.b) },
    intensity: 100,
  };
}

export function num(state: EditState, effect: string, key: string): number {
  return state.effects[effect]!.v[key] as number;
}

export function str(state: EditState, effect: string, key: string): string {
  return state.effects[effect]!.v[key] as string;
}

export function on(state: EditState, effect: string): boolean {
  return state.effects[effect]!.enabled;
}
