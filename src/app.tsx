import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import {
  CATEGORIES,
  EFFECTS,
  EFFECT_BY_ID,
  applyPartial,
  defaultEffect,
  defaultState,
  type CategoryId,
  type Curves,
  type EditState,
  type EffectState,
  type PartialEdit,
} from './editor/effects';
import { isIdentity } from './editor/curves';
import { historyReducer, initHistory, type History, type HistoryAction } from './editor/history';
import { PRESETS } from './editor/presets';
import { ACCEPT_ATTR, loadImage, type LoadedImage } from './io/load';
import {
  deleteUserPreset,
  loadFavorites,
  loadUserPresets,
  saveFavorites,
  saveUserPreset,
  type UserPreset,
} from './io/storage';
import type { Renderer } from './render/renderer';
import { EffectCard } from './ui/EffectCard';
import { ExportPanel } from './ui/ExportPanel';
import { Icon } from './ui/icons';
import { PresetPanel } from './ui/PresetPanel';
import { MAX_ZOOM, MIN_ZOOM, Viewer } from './ui/Viewer';

type Panel = 'presets' | 'adjust' | 'export';

const reducer = (h: History<EditState>, a: HistoryAction<EditState>) => historyReducer(h, a);

function presetState(id: string, user: UserPreset[]): { name: string; state: EditState } | null {
  const builtIn = PRESETS.find((p) => p.id === id);
  if (builtIn) return { name: builtIn.name, state: applyPartial(defaultState(), builtIn.edit) };
  const own = user.find((p) => p.id === id);
  // merged over the defaults so presets saved by an older version still get new parameters
  if (own) return { name: own.name, state: applyPartial(defaultState(), own.state as PartialEdit) };
  return null;
}

export function App() {
  const [hist, dispatch] = useReducer(reducer, defaultState(), initHistory);
  const edit = hist.present;
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('color');
  const [panel, setPanel] = useState<Panel>('presets');
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(1);
  const [compare, setCompare] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const rightPanel = useRef<HTMLElement>(null);
  // on a phone the sheet is short, so only the first card of a category starts open
  const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 899px)').matches;

  useEffect(() => {
    loadUserPresets()
      .then(setUserPresets)
      .catch(() => setError('Eigene Presets konnten nicht geladen werden.'));
    loadFavorites()
      .then(setFavorites)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 7000);
    return () => clearTimeout(t);
  }, [error]);

  const commit = (state: EditState) => dispatch({ type: 'commit', state });
  const update = (state: EditState, isCommit: boolean) =>
    dispatch(isCommit ? { type: 'commit', state } : { type: 'live', state });

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await loadImage(file);
      image?.bitmap.close();
      setImage(img);
      setZoom(1);
      if (panel === 'export') setPanel('presets');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // real previews of every preset on the loaded photo
  useEffect(() => {
    if (!image || !renderer) return;
    const id = setTimeout(() => {
      const long = 220;
      const k = long / Math.max(image.width, image.height);
      const w = Math.max(1, Math.round(image.width * k));
      const h = Math.max(1, Math.round(image.height * k));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d')!;
      const next: Record<string, string> = {};
      const ids = [...PRESETS.map((p) => p.id), ...userPresets.map((p) => p.id)];
      try {
        for (const pid of ids) {
          const p = presetState(pid, userPresets)!;
          g.putImageData(
            new ImageData(renderer.renderPixels(p.state, w, h, { date: image.date }), w, h),
            0,
            0,
          );
          next[pid] = canvas.toDataURL('image/jpeg', 0.82);
        }
        setThumbs(next);
      } catch (e) {
        setError((e as Error).message);
      }
    }, 60);
    return () => clearTimeout(id);
  }, [image, renderer, userPresets]);

  const applyPreset = (id: string) => {
    const p = presetState(id, userPresets);
    if (!p) return;
    commit(p.state);
    setPresetId(id);
  };

  const setEffect = (id: string, next: EffectState, isCommit: boolean) =>
    update({ ...edit, effects: { ...edit.effects, [id]: next } }, isCommit);

  const setCurves = (curves: Curves, isCommit: boolean) =>
    update(
      {
        ...edit,
        curves,
        effects: { ...edit.effects, curves: { ...edit.effects.curves!, enabled: true } },
      },
      isCommit,
    );

  const resetCurves = () =>
    commit({
      ...edit,
      curves: defaultState().curves,
      effects: { ...edit.effects, curves: defaultEffect(EFFECT_BY_ID.curves!) },
    });

  const resetAll = () => {
    commit(defaultState());
    setPresetId(null);
  };

  const savePreset = async () => {
    const name = prompt('Name für das neue Preset', 'Mein Preset')?.trim();
    if (!name) return;
    const p: UserPreset = {
      id: `user-${Date.now()}`,
      name,
      state: structuredClone(edit),
      created: Date.now(),
    };
    try {
      await saveUserPreset(p);
      setUserPresets(await loadUserPresets());
      setPresetId(p.id);
    } catch {
      setError('Das Preset konnte nicht gespeichert werden. Ist der private Modus aktiv?');
    }
  };

  const duplicatePreset = async () => {
    if (!presetId) return;
    const src = presetState(presetId, userPresets);
    if (!src) return;
    const p: UserPreset = {
      id: `user-${Date.now()}`,
      name: `${src.name} Kopie`,
      state: src.state,
      created: Date.now(),
    };
    await saveUserPreset(p);
    setUserPresets(await loadUserPresets());
    setPresetId(p.id);
  };

  const deletePreset = async () => {
    const own = userPresets.find((p) => p.id === presetId);
    if (!own || !confirm(`Preset "${own.name}" löschen?`)) return;
    await deleteUserPreset(own.id);
    setUserPresets(await loadUserPresets());
    const favs = favorites.filter((f) => f !== own.id);
    setFavorites(favs);
    await saveFavorites(favs);
    setPresetId(null);
  };

  const toggleFavorite = async (id: string) => {
    const favs = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(favs);
    await saveFavorites(favs).catch(() => setError('Favoriten konnten nicht gespeichert werden.'));
  };

  const toggleFullscreen = () => {
    const next = !fullscreen;
    setFullscreen(next);
    // real fullscreen where the browser allows it, the CSS mode works everywhere
    if (next) document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  };

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).matches?.(
        'input[type=text], input[type=number], textarea',
      );
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [fullscreen]);

  const canUndo = hist.past.length > 0 || hist.present !== hist.committed;
  const canRedo = hist.future.length > 0;
  const effects = EFFECTS.filter((e) => e.category === category);

  const categoryNav = (
    <nav class="categories" aria-label="Effektkategorien">
      {CATEGORIES.map((c) => {
        const active = EFFECTS.some(
          (e) => e.category === c.id && edit.effects[e.id]!.enabled && isChanged(edit, e.id),
        );
        return (
          <button
            type="button"
            class={`cat ${c.id === category ? 'active' : ''}`}
            onClick={() => {
              setCategory(c.id);
              setPanel('adjust');
              // otherwise the new category opens wherever the old one was scrolled to
              rightPanel.current?.scrollTo({ top: 0 });
            }}
          >
            {c.label}
            {active && <span class="dot" />}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      class={`app panel-${panel} ${image ? '' : 'no-image'} ${fullscreen ? 'fullscreen' : ''} ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.relatedTarget === null) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        openFile(e.dataTransfer?.files[0]);
      }}
    >
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          openFile(e.currentTarget.files?.[0]);
          e.currentTarget.value = '';
        }}
      />

      <aside class="side left">
        <div class="brand">
          y2k<span>retro photo lab</span>
        </div>
        <button type="button" class="primary" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" /> Foto öffnen
        </button>
        <div class="desktop-only">
          <h2>Effekte</h2>
          {categoryNav}
        </div>
        <h2>Presets</h2>
        <PresetPanel
          builtIns={PRESETS}
          user={userPresets}
          favorites={favorites}
          selected={presetId}
          thumbs={thumbs}
          disabled={false}
          intensity={edit.intensity}
          onIntensity={(v, isCommit) => update({ ...edit, intensity: v as number }, isCommit)}
          onApply={applyPreset}
          onToggleFavorite={toggleFavorite}
          onSave={savePreset}
          onDuplicate={duplicatePreset}
          onDelete={deletePreset}
        />
      </aside>

      <main class="center">
        <div class="toolbar">
          <div class="group">
            <button
              type="button"
              class="icon-btn mobile-only"
              title="Foto öffnen"
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" />
            </button>
            <button
              type="button"
              class="icon-btn"
              title="Rückgängig (Strg+Z)"
              disabled={!canUndo}
              onClick={() => dispatch({ type: 'undo' })}
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              class="icon-btn"
              title="Wiederholen (Strg+Umschalt+Z)"
              disabled={!canRedo}
              onClick={() => dispatch({ type: 'redo' })}
            >
              <Icon name="redo" />
            </button>
            <button
              type="button"
              class="text-btn"
              title="Alle Effekte zurücksetzen"
              onClick={resetAll}
            >
              Alles zurücksetzen
            </button>
          </div>
          <div class="file-name">{image ? image.name : ''}</div>
          <div class="group">
            <button
              type="button"
              class={`icon-btn ${compare ? 'active' : ''}`}
              title="Vorher-Nachher-Vergleich"
              disabled={!image}
              onClick={() => setCompare(!compare)}
            >
              <Icon name="compare" />
            </button>
            <button
              type="button"
              class={`icon-btn ${showOriginal ? 'active' : ''}`}
              title="Gedrückt halten zeigt das Original"
              disabled={!image}
              onPointerDown={() => setShowOriginal(true)}
              onPointerUp={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <Icon name="eye" />
            </button>
            <span class="sep" />
            <button
              type="button"
              class="icon-btn desktop-only"
              title="Verkleinern"
              disabled={!image || zoom <= MIN_ZOOM}
              onClick={() => setZoom(Math.max(MIN_ZOOM, zoom / 1.5))}
            >
              <Icon name="zoomOut" />
            </button>
            <span class="zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              class="icon-btn desktop-only"
              title="Vergrößern"
              disabled={!image || zoom >= MAX_ZOOM}
              onClick={() => setZoom(Math.min(MAX_ZOOM, zoom * 1.5))}
            >
              <Icon name="zoomIn" />
            </button>
            <button
              type="button"
              class="icon-btn desktop-only"
              title="Einpassen"
              disabled={!image || zoom === 1}
              onClick={() => setZoom(1)}
            >
              <Icon name="fit" />
            </button>
            <button type="button" class="icon-btn" title="Vollbild" onClick={toggleFullscreen}>
              <Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} />
            </button>
          </div>
        </div>
        <Viewer
          image={image}
          edit={edit}
          compare={compare}
          showOriginal={showOriginal}
          zoom={zoom}
          setZoom={setZoom}
          onRenderer={setRenderer}
          onError={setError}
          empty={
            <div class="empty">
              <div class="brand">
                y2k<span>retro photo lab</span>
              </div>
              <Icon name="image" />
              <p>Foto hierher ziehen oder auswählen</p>
              <button type="button" class="primary" onClick={() => fileInput.current?.click()}>
                <Icon name="upload" /> Foto öffnen
              </button>
              <p class="hint">JPG, JPEG, PNG oder WebP. Alles bleibt auf deinem Gerät.</p>
            </div>
          }
        />
        {error && (
          <div class="toast" role="alert">
            <span>{error}</span>
            <button
              type="button"
              class="icon-btn small"
              aria-label="Meldung schließen"
              onClick={() => setError(null)}
            >
              <Icon name="x" />
            </button>
          </div>
        )}
      </main>

      <aside class="side right" ref={rightPanel}>
        <nav class="tabs desktop-only">
          <button
            type="button"
            class={panel !== 'export' ? 'active' : ''}
            onClick={() => setPanel('adjust')}
          >
            Anpassen
          </button>
          <button
            type="button"
            class={panel === 'export' ? 'active' : ''}
            onClick={() => setPanel('export')}
          >
            Export
          </button>
        </nav>
        {panel === 'export' ? (
          <ExportPanel image={image} edit={edit} renderer={renderer} onError={setError} />
        ) : (
          <div class="adjust">
            <div class="mobile-only cat-bar">{categoryNav}</div>
            {effects.map((def, i) => (
              <EffectCard
                key={def.id}
                def={def}
                defaultOpen={!phone || i === 0}
                state={edit.effects[def.id]!}
                onChange={(next, isCommit) => setEffect(def.id, next, isCommit)}
                curves={def.id === 'curves' ? edit.curves : undefined}
                onCurves={def.id === 'curves' ? setCurves : undefined}
                onReset={def.id === 'curves' ? resetCurves : undefined}
              />
            ))}
          </div>
        )}
      </aside>

      <nav class="mobile-tabs">
        {(
          [
            ['presets', 'Presets'],
            ['adjust', 'Anpassen'],
            ['export', 'Export'],
          ] as [Panel, string][]
        ).map(([id, label]) => (
          <button type="button" class={panel === id ? 'active' : ''} onClick={() => setPanel(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function isChanged(edit: EditState, id: string): boolean {
  // the curves effect has no params, its points live in EditState.curves
  if (id === 'curves') return !Object.values(edit.curves).every(isIdentity);
  const def = EFFECT_BY_ID[id]!;
  const v = edit.effects[id]!.v;
  // effects that are off by default count as changed as soon as they are on
  return !def.enabled || def.params.some((p) => v[p.key] !== p.default);
}
