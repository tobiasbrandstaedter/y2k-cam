import { describe, expect, it } from 'vitest';
import { buildLut, curveFn } from './curves';
import { formatDate, formatTime } from './datetime';
import { EFFECTS, EFFECT_BY_ID, applyPartial, defaultState, withIntensity } from './effects';
import { historyReducer, initHistory } from './history';
import { PRESETS, PRESET_CATEGORIES } from './presets';

describe('curves', () => {
  it('identity curve maps every value to itself', () => {
    const f = curveFn([
      [0, 0],
      [1, 1],
    ]);
    for (const x of [0, 0.25, 0.5, 0.9, 1]) expect(f(x)).toBeCloseTo(x, 6);
  });

  it('stays monotone between close points instead of overshooting', () => {
    const f = curveFn([
      [0, 0],
      [0.4, 0.5],
      [0.45, 0.52],
      [1, 1],
    ]);
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const y = f(i / 100);
      expect(y).toBeGreaterThanOrEqual(last - 1e-9);
      last = y;
    }
  });

  it('applies the master curve before the channel curve', () => {
    const lut = buildLut({
      master: [
        [0, 0.5],
        [1, 0.5],
      ],
      r: [
        [0, 1],
        [1, 0],
      ],
      g: [
        [0, 0],
        [1, 1],
      ],
      b: [
        [0, 0],
        [1, 1],
      ],
    });
    // master flattens everything to 0.5, then red is inverted: 0.5 stays 0.5
    expect(lut[0]).toBe(128);
    expect(lut[1]).toBe(128);
    expect(lut[255 * 4]).toBe(128);
  });
});

describe('history', () => {
  it('collapses a slider drag into one undo step', () => {
    let h = initHistory(0);
    h = historyReducer(h, { type: 'live', state: 1 });
    h = historyReducer(h, { type: 'live', state: 2 });
    h = historyReducer(h, { type: 'commit', state: 3 });
    expect(h.past).toEqual([0]);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toBe(0);
    h = historyReducer(h, { type: 'redo' });
    expect(h.present).toBe(3);
  });

  it('undo first throws away an uncommitted drag', () => {
    let h = initHistory('a');
    h = historyReducer(h, { type: 'commit', state: 'b' });
    h = historyReducer(h, { type: 'live', state: 'c' });
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toBe('b');
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toBe('a');
  });

  it('a new commit clears the redo stack', () => {
    let h = initHistory(1);
    h = historyReducer(h, { type: 'commit', state: 2 });
    h = historyReducer(h, { type: 'undo' });
    h = historyReducer(h, { type: 'commit', state: 5 });
    expect(h.future).toEqual([]);
    expect(historyReducer(h, { type: 'redo' })).toBe(h);
  });
});

describe('datetime', () => {
  const d = new Date(2003, 2, 20, 15, 20);

  it.each([
    ['mdy', '03/20/03'],
    ['dmy', '20.03.2003'],
    ['ymd', '2003.03.20'],
    ['mon', 'MAR. 20 2003'],
    ['digicam', "'03 3 20"],
  ])('formats %s', (format, expected) => {
    expect(formatDate(d, format)).toBe(expected);
  });

  it('writes camcorder style 12 hour time with AM/PM in front', () => {
    expect(formatTime(d, '12h')).toBe('PM 3:20');
    expect(formatTime(new Date(2003, 0, 1, 0, 5), '12h')).toBe('AM 12:05');
    expect(formatTime(d, '24h')).toBe('15:20');
  });
});

describe('effect schema', () => {
  it('has unique effect ids and unique parameter keys per effect', () => {
    expect(new Set(EFFECTS.map((e) => e.id)).size).toBe(EFFECTS.length);
    for (const e of EFFECTS) {
      expect(new Set(e.params.map((p) => p.key)).size, e.id).toBe(e.params.length);
    }
  });

  it('keeps every default inside its own range and options', () => {
    for (const e of EFFECTS) {
      for (const p of e.params) {
        if (p.kind === 'range') {
          expect(p.default, `${e.id}.${p.key}`).toBeGreaterThanOrEqual(p.min);
          expect(p.default, `${e.id}.${p.key}`).toBeLessThanOrEqual(p.max);
        }
        if (p.kind === 'select') {
          expect(
            p.options.map((o) => o.value),
            `${e.id}.${p.key}`,
          ).toContain(p.default);
        }
        if (p.when) {
          expect(
            e.params.map((x) => x.key),
            `${e.id}.${p.key} when`,
          ).toContain(p.when.key);
        }
      }
    }
  });

  it('starts the new tape, digicam and film damage effects switched off', () => {
    for (const id of ['tape', 'interlace', 'headSwitch', 'digicam', 'jpeg', 'dust']) {
      expect(EFFECT_BY_ID[id]?.enabled, id).toBe(false);
    }
  });

  it('refuses presets that name an unknown effect', () => {
    expect(() => applyPartial(defaultState(), { effects: { nope: { enabled: true } } })).toThrow(
      /Unknown effect "nope"/,
    );
  });
});

describe('presets', () => {
  it('ships at least the 15 presets the spec asks for', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it('only uses known parameters, with values inside their ranges', () => {
    for (const preset of PRESETS) {
      for (const [id, e] of Object.entries(preset.edit.effects ?? {})) {
        const def = EFFECT_BY_ID[id];
        expect(def, `${preset.id}: effect ${id}`).toBeDefined();
        for (const [key, value] of Object.entries(e.v ?? {})) {
          const p = def!.params.find((x) => x.key === key);
          expect(p, `${preset.id}: ${id}.${key}`).toBeDefined();
          if (p!.kind === 'range') {
            expect(value, `${preset.id}: ${id}.${key}`).toBeGreaterThanOrEqual(p!.min);
            expect(value, `${preset.id}: ${id}.${key}`).toBeLessThanOrEqual(p!.max);
          }
          if (p!.kind === 'select') {
            expect(
              p!.options.map((o) => o.value),
              `${preset.id}: ${id}.${key}`,
            ).toContain(value);
          }
        }
      }
    }
  });

  it('gives every preset its own parameters, not just its own name', () => {
    const states = PRESETS.map((p) => JSON.stringify(applyPartial(defaultState(), p.edit)));
    expect(new Set(states).size).toBe(PRESETS.length);
  });

  it('does not change the defaults when applied', () => {
    const before = JSON.stringify(defaultState());
    for (const p of PRESETS) applyPartial(defaultState(), p.edit);
    expect(JSON.stringify(defaultState())).toBe(before);
  });
});

describe('intensity', () => {
  const vhs = applyPartial(defaultState(), PRESETS.find((p) => p.id === 'vhsTape')!.edit);

  it('leaves the edit alone at 100', () => {
    expect(withIntensity(vhs)).toBe(vhs);
  });

  it('gives back the untouched photo at 0', () => {
    const zero = withIntensity({ ...vhs, intensity: 0 });
    const neutral = defaultState();
    for (const def of EFFECTS) {
      const e = zero.effects[def.id]!;
      if (!def.enabled) {
        expect(e.enabled, def.id).toBe(false);
        continue;
      }
      for (const p of def.params) {
        if (p.kind === 'range' && !p.shape) {
          expect(e.v[p.key], `${def.id}.${p.key}`).toBeCloseTo(
            neutral.effects[def.id]!.v[p.key] as number,
            6,
          );
        }
      }
    }
  });

  it('scales strengths and keeps shape, selects and toggles', () => {
    const half = withIntensity({ ...vhs, intensity: 50 });
    expect(half.effects.analogNoise!.v.intensity).toBeCloseTo(16, 6);
    expect(half.effects.grading!.v.saturation).toBeCloseTo(-4, 6);
    expect(half.effects.scanlines!.v.density).toBe(480);
    expect(half.effects.vhsDistortion!.v.trackingPos).toBe(92);
    expect(half.effects.chroma!.v.mode).toBe('horizontal');
    expect(half.effects.overlay!.enabled).toBe(true);
    expect(half.effects.overlay!.v.play).toBe(true);
  });

  it('moves curves halfway back to the diagonal', () => {
    const beach = applyPartial(defaultState(), PRESETS.find((p) => p.id === 'beachMemories')!.edit);
    const half = withIntensity({ ...beach, intensity: 50 });
    expect(half.curves.b[0]).toEqual([0, 0.03]);
    expect(half.curves.b[2]![1]).toBeCloseTo(0.95, 6);
  });

  it('is stored with the edit, so undo and user presets keep it', () => {
    expect(defaultState().intensity).toBe(100);
    expect(applyPartial(defaultState(), { intensity: 40 }).intensity).toBe(40);
  });
});

describe('preset library', () => {
  it('puts every preset in a known category and leaves no category empty', () => {
    const ids = PRESET_CATEGORIES.map((c) => c.id);
    for (const p of PRESETS) expect(ids, p.id).toContain(p.category);
    for (const c of ids)
      expect(
        PRESETS.some((p) => p.category === c),
        c,
      ).toBe(true);
  });

  it('gives every preset a description', () => {
    for (const p of PRESETS) expect(p.hint.length, p.id).toBeGreaterThan(10);
  });
});
