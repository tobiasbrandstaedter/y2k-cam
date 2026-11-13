import { useState } from 'preact/hooks';
import { defaultEffect } from '../editor/effects';
import type { Curves, EffectDef, EffectState, Value } from '../editor/effects';
import { Control, Switch } from './controls';
import { CurveEditor } from './CurveEditor';
import { Icon } from './icons';

type Props = {
  def: EffectDef;
  state: EffectState;
  onChange: (next: EffectState, commit: boolean) => void;
  // the curves card edits EditState.curves, the parent switches the effect on in the same update
  curves?: Curves;
  onCurves?: (curves: Curves, commit: boolean) => void;
  // replaces the default reset, used by the curves card to reset points and switch in one step
  onReset?: () => void;
  defaultOpen: boolean;
};

export function EffectCard({
  def,
  state,
  onChange,
  curves,
  onCurves,
  onReset,
  defaultOpen,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const setValue = (key: string, value: Value, commit: boolean) =>
    // touching a control of a switched off effect switches it on, otherwise nothing would happen
    onChange({ enabled: true, v: { ...state.v, [key]: value } }, commit);

  const reset = onReset ?? (() => onChange(defaultEffect(def), true));

  let lastSection: string | undefined;
  return (
    <section class={`card ${state.enabled ? '' : 'off'} ${open ? '' : 'closed'}`}>
      <header class="card-head">
        <Switch
          checked={state.enabled}
          label={`${def.label} an oder aus`}
          onChange={(enabled) => onChange({ ...state, enabled }, true)}
        />
        <h3>
          <button
            type="button"
            class="card-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {def.label}
            <Icon name="chevron" />
          </button>
        </h3>
        <button
          type="button"
          class="icon-btn small"
          title={`${def.label} zurücksetzen`}
          onClick={reset}
        >
          <Icon name="reset" />
        </button>
      </header>
      {open && (
        <div class="card-body">
          {def.id === 'curves' && curves && onCurves && (
            <CurveEditor curves={curves} onChange={onCurves} />
          )}
          {def.params.map((p) => {
            if (p.when && state.v[p.when.key] !== p.when.value) return null;
            const heading = p.section && p.section !== lastSection ? p.section : null;
            if (p.section) lastSection = p.section;
            return (
              <>
                {heading && <h4 class="section">{heading}</h4>}
                <Control
                  p={p}
                  value={state.v[p.key]!}
                  onChange={(v, commit) => setValue(p.key, v, commit)}
                />
              </>
            );
          })}
        </div>
      )}
    </section>
  );
}
