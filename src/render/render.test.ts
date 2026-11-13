import { describe, expect, it } from 'vitest';
import { applyPartial, defaultState } from '../editor/effects';
import { PRESETS } from '../editor/presets';
import { overlayLines } from './overlay';
import { SEGMENTS } from './segments';
import { planPasses } from './uniforms';

const finite = (v: unknown): boolean =>
  typeof v === 'boolean' || (Array.isArray(v) ? v.every(finite) : Number.isFinite(v));

describe('planPasses', () => {
  it('produces finite uniforms for the defaults and every preset', () => {
    const states = [defaultState(), ...PRESETS.map((p) => applyPartial(defaultState(), p.edit))];
    for (const s of states) {
      const plan = planPasses(s, 3000);
      for (const group of [plan.color, plan.signal, plan.composite]) {
        for (const [name, value] of Object.entries(group)) expect(finite(value), name).toBe(true);
      }
    }
  });

  it('skips the blur chains when nothing needs them', () => {
    const plan = planPasses(defaultState(), 3000);
    expect(plan.gaussianRadius).toBe(0);
    expect(plan.softRadius).toBe(0);
    expect(plan.glowRadius).toBe(0);
    expect(plan.overlay).toBe(false);
  });

  it('scales blur radii with the image height so preview and export match', () => {
    const s = applyPartial(defaultState(), {
      effects: { gaussian: { enabled: true, v: { radius: 50 } } },
    });
    expect(planPasses(s, 4000).gaussianRadius).toBeCloseTo(planPasses(s, 1000).gaussianRadius * 4);
  });

  it('gives Soft Focus and Lens Blur their own radius', () => {
    const s = applyPartial(defaultState(), {
      effects: {
        softFocus: { enabled: true, v: { radius: 10 } },
        lensBlur: { enabled: true, v: { amount: 100 } },
      },
    });
    const plan = planPasses(s, 1000);
    expect(plan.softRadius).toBeCloseTo(1000 * (0.0015 + 0.1 * 0.006));
    // half size chain, so in half size pixels
    expect(plan.lensRadius).toBeCloseTo(500 * 0.02);
  });

  it('runs the bright chain only for Bloom and Halation, without the glow chain', () => {
    const s = applyPartial(defaultState(), { effects: { bloom: { enabled: true } } });
    const plan = planPasses(s, 1000);
    expect(plan.brightRadius).toBeGreaterThan(0);
    expect(plan.glowRadius).toBe(0);
    expect(plan.bright.uThresh).toEqual([0.7, 0.6]);
  });

  it('only reads the local average when Highlights or Shadows are used', () => {
    expect(planPasses(defaultState(), 1000).color.uLocalOn).toBe(false);
    const s = applyPartial(defaultState(), { effects: { grading: { v: { shadows: 40 } } } });
    expect(planPasses(s, 1000).color.uLocalOn).toBe(true);
  });

  it('leaves digicam clipping and sensor noise at zero while the effect is off', () => {
    const plan = planPasses(defaultState(), 1000);
    expect(plan.color.uClip).toBe(0);
    expect(plan.composite.uDigiNoise).toBe(0);
    const s = applyPartial(defaultState(), { effects: { digicam: { enabled: true } } });
    expect(planPasses(s, 1000).color.uClip).toBeCloseTo(0.3);
  });

  it('turns curves off when all four are the identity', () => {
    expect(planPasses(defaultState(), 1000).color.uCurvesOn).toBe(false);
    const s = defaultState();
    s.curves.g = [
      [0, 0.1],
      [1, 1],
    ];
    expect(planPasses(s, 1000).color.uCurvesOn).toBe(true);
  });
});

describe('overlayLines', () => {
  const date = new Date(2003, 2, 20, 15, 20);

  it('puts date and time on one line in the chosen corner', () => {
    const v = { ...defaultState().effects.overlay!.v, rec: false, recDot: false };
    const lines = overlayLines(v, date);
    expect([...lines.keys()]).toEqual(['bl']);
    expect(lines.get('bl')).toEqual([[{ kind: 'text', text: '03/20/03 PM 3:20' }]]);
  });

  it('uses custom text when the user typed date and time', () => {
    const v = {
      ...defaultState().effects.overlay!.v,
      dateSource: 'custom',
      dateText: '12/24/99',
      timeText: 'AM 9:00',
      dateLayout: 'stack',
      rec: false,
      recDot: false,
    };
    expect(overlayLines(v, date).get('bl')).toEqual([
      [{ kind: 'text', text: 'AM 9:00' }],
      [{ kind: 'text', text: '12/24/99' }],
    ]);
  });

  it('marks the date for seven segment drawing when that font is chosen', () => {
    const v = {
      ...defaultState().effects.overlay!.v,
      dateFont: 'segment',
      dateFormat: 'digicam',
      time: false,
      rec: false,
      recDot: false,
    };
    expect(overlayLines(v, date).get('bl')).toEqual([[{ kind: 'segment', text: "'03 3 20" }]]);
  });

  it('builds the REC line from dot and label', () => {
    const v = { ...defaultState().effects.overlay!.v, date: false, time: false };
    expect(overlayLines(v, date).get('tr')).toEqual([
      [{ kind: 'dot' }, { kind: 'text', text: 'REC' }],
    ]);
  });
});

describe('seven segment digits', () => {
  const lit = (ch: string) =>
    SEGMENTS[ch]!.toString(2)
      .split('')
      .filter((b) => b === '1').length;

  it('lights the usual number of segments per digit', () => {
    const counts = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6];
    counts.forEach((n, digit) => expect(lit(String(digit)), String(digit)).toBe(n));
  });

  it('has no glyph for letters a seven segment display cannot show', () => {
    for (const ch of ['M', 'R', 'W', 'X']) expect(SEGMENTS[ch]).toBeUndefined();
  });
});
