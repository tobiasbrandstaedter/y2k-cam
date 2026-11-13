import { Fragment } from 'preact';
import type { RangeParam } from '../editor/effects';
import { PRESET_CATEGORIES, type BuiltInPreset } from '../editor/presets';
import type { UserPreset } from '../io/storage';
import { Slider, type OnValue } from './controls';
import { Icon } from './icons';

export type PresetItem = { id: string; name: string; hint?: string; user: boolean };

const INTENSITY: RangeParam = {
  kind: 'range',
  key: 'intensity',
  label: 'Intensität',
  min: 0,
  max: 100,
  default: 100,
  unit: '%',
};

type Props = {
  builtIns: BuiltInPreset[];
  user: UserPreset[];
  favorites: string[];
  selected: string | null;
  thumbs: Record<string, string>;
  disabled: boolean;
  intensity: number;
  onIntensity: OnValue;
  onApply: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function PresetPanel(props: Props) {
  const { favorites, selected, thumbs, disabled } = props;
  const items: PresetItem[] = [
    ...props.builtIns.map((p) => ({ id: p.id, name: p.name, hint: p.hint, user: false })),
    ...props.user.map((p) => ({ id: p.id, name: p.name, user: true })),
  ];
  const favs = items.filter((p) => favorites.includes(p.id));
  const own = items.filter((p) => p.user && !favorites.includes(p.id));
  const selectedItem = items.find((p) => p.id === selected);

  const tile = (p: PresetItem) => (
    <div class={`preset ${p.id === selected ? 'selected' : ''}`} key={p.id}>
      <button
        type="button"
        class="preset-main"
        disabled={disabled}
        title={p.hint ?? p.name}
        aria-label={p.name}
        onClick={() => props.onApply(p.id)}
      >
        <span class="thumb">{thumbs[p.id] ? <img src={thumbs[p.id]} alt="" /> : null}</span>
        <span class="preset-name">{p.name}</span>
      </button>
      <button
        type="button"
        class={`fav ${favorites.includes(p.id) ? 'on' : ''}`}
        aria-label={
          favorites.includes(p.id) ? `${p.name} aus Favoriten entfernen` : `${p.name} als Favorit`
        }
        onClick={() => props.onToggleFavorite(p.id)}
      >
        <Icon name="star" filled={favorites.includes(p.id)} />
      </button>
    </div>
  );

  return (
    <div class="presets">
      <div class="preset-actions">
        <button
          type="button"
          class="chip-btn"
          disabled={disabled}
          onClick={props.onSave}
          title="Aktuelle Einstellungen als Preset speichern"
        >
          <Icon name="save" /> Speichern
        </button>
        {/* only offered when they would do something, a phone has no room for dead buttons */}
        {selectedItem && (
          <button
            type="button"
            class="chip-btn"
            onClick={props.onDuplicate}
            title="Ausgewähltes Preset duplizieren"
          >
            <Icon name="copy" /> Duplizieren
          </button>
        )}
        {selectedItem?.user && (
          <button
            type="button"
            class="chip-btn"
            onClick={props.onDelete}
            title="Eigenes Preset löschen"
          >
            <Icon name="trash" /> Löschen
          </button>
        )}
      </div>
      {selectedItem && (
        <div class="preset-current">
          <p>
            <strong>{selectedItem.name}</strong>
            {selectedItem.hint && <span>{selectedItem.hint}</span>}
          </p>
          <Slider p={INTENSITY} value={props.intensity} onChange={props.onIntensity} />
        </div>
      )}
      {favs.length > 0 && (
        <>
          <h4 class="section">Favoriten</h4>
          <div class="preset-grid">{favs.map(tile)}</div>
        </>
      )}
      {own.length > 0 && (
        <>
          <h4 class="section">Eigene Presets</h4>
          <div class="preset-grid">{own.map(tile)}</div>
        </>
      )}
      {PRESET_CATEGORIES.map((c) => {
        const list = props.builtIns
          .filter((p) => p.category === c.id && !favorites.includes(p.id))
          .map((p) => items.find((i) => i.id === p.id)!);
        if (list.length === 0) return null;
        return (
          <Fragment key={c.id}>
            <h4 class="section">{c.label}</h4>
            <div class="preset-grid">{list.map(tile)}</div>
          </Fragment>
        );
      })}
    </div>
  );
}
