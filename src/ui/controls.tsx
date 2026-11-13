import { useRef } from 'preact/hooks';
import type { ParamDef, RangeParam, Value } from '../editor/effects';

// commit = true when the user let go: that is the moment an undo step is written
export type OnValue = (value: Value, commit: boolean) => void;

function stepOf(p: RangeParam) {
  if (p.step !== undefined) return p.step;
  return p.max - p.min >= 20 ? 1 : 0.01;
}

function format(p: RangeParam, v: number) {
  const step = stepOf(p);
  const text = step < 1 ? v.toFixed(2) : String(Math.round(v));
  const signed = p.min < 0 && v > 0 ? `+${text}` : text;
  return p.unit ? `${signed} ${p.unit}` : signed;
}

export function Slider({
  p,
  value,
  onChange,
}: {
  p: RangeParam;
  value: number;
  onChange: OnValue;
}) {
  const lastTap = useRef(0);
  const reset = () => onChange(p.default, true);
  const isDefault = value === p.default;
  const fill = ((value - p.min) / (p.max - p.min)) * 100;
  const zero = p.min < 0 ? ((0 - p.min) / (p.max - p.min)) * 100 : 0;
  const lo = Math.min(fill, zero);
  const hi = Math.max(fill, zero);
  return (
    <div
      class="slider"
      onDblClick={reset}
      title="Doppelklick setzt zurück"
      onPointerUp={(e) => {
        // iOS has no reliable dblclick on touch, so count taps on the label row ourselves
        if (e.pointerType !== 'touch' || (e.target as HTMLElement).tagName === 'INPUT') return;
        const now = Date.now();
        if (now - lastTap.current < 320) reset();
        lastTap.current = now;
      }}
    >
      <div class="slider-head">
        <span>{p.label}</span>
        <span class={`value ${isDefault ? '' : 'changed'}`}>{format(p, value)}</span>
      </div>
      <input
        type="range"
        min={p.min}
        max={p.max}
        step={stepOf(p)}
        value={value}
        style={{ '--lo': `${lo}%`, '--hi': `${hi}%` }}
        aria-label={p.label}
        onInput={(e) => onChange(Number(e.currentTarget.value), false)}
        onChange={(e) => onChange(Number(e.currentTarget.value), true)}
      />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      class={`switch ${checked ? 'on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span />
    </button>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === value}
          class={o.value === value ? 'active' : ''}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Control({ p, value, onChange }: { p: ParamDef; value: Value; onChange: OnValue }) {
  switch (p.kind) {
    case 'range':
      return <Slider p={p} value={value as number} onChange={onChange} />;
    case 'toggle':
      return (
        <label class="row toggle-row">
          <span>{p.label}</span>
          <Switch checked={value as boolean} label={p.label} onChange={(v) => onChange(v, true)} />
        </label>
      );
    case 'select':
      if (p.options.length <= 3) {
        return (
          <div class="field">
            <span class="field-label">{p.label}</span>
            <Segmented
              label={p.label}
              options={p.options}
              value={value as string}
              onChange={(v) => onChange(v, true)}
            />
          </div>
        );
      }
      return (
        <label class="field">
          <span class="field-label">{p.label}</span>
          <select value={value as string} onChange={(e) => onChange(e.currentTarget.value, true)}>
            {p.options.map((o) => (
              <option value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );
    case 'text':
      return (
        <label class="field">
          <span class="field-label">{p.label}</span>
          <input
            type="text"
            value={value as string}
            placeholder={p.placeholder}
            maxLength={24}
            onInput={(e) => onChange(e.currentTarget.value, false)}
            onChange={(e) => onChange(e.currentTarget.value, true)}
          />
        </label>
      );
  }
}
