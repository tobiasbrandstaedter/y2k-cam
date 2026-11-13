import { useEffect, useState } from 'preact/hooks';
import type { EditState } from '../editor/effects';
import {
  canEncodeWebp,
  canShareFile,
  download,
  exportImage,
  exportSize,
  share,
  type ExportOptions,
  type ExportResult,
} from '../io/export';
import type { LoadedImage } from '../io/load';
import type { Renderer } from '../render/renderer';
import { Segmented, Switch } from './controls';
import { Icon } from './icons';

const DEFAULTS: ExportOptions = {
  format: 'jpeg',
  quality: 92,
  size: 'original',
  longEdge: 2048,
  optimize: false,
  targetKB: 1500,
  keepMeta: true,
  compare: false,
};

type Props = {
  image: LoadedImage | null;
  edit: EditState;
  renderer: Renderer | null;
  onError: (message: string) => void;
};

const kb = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export function ExportPanel({ image, edit, renderer, onError }: Props) {
  const [opts, setOpts] = useState(DEFAULTS);
  const [webp, setWebp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    canEncodeWebp().then(setWebp);
  }, []);

  // a result belongs to one set of settings, drop it when anything changes
  useEffect(() => setResult(null), [opts, edit, image]);

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOpts((o) => ({ ...o, [key]: value }));

  const lossy = opts.format !== 'png';
  const size = image && renderer ? exportSize(image, opts, renderer.maxTexture) : null;

  const shareable = result !== null && canShareFile(result.blob, result.name);
  const shareResult = () => {
    if (!result) return;
    share(result.blob, result.name).catch((e: Error) => {
      if (e.name !== 'AbortError') onError(e.message);
    });
  };

  const run = async () => {
    if (!image || !renderer) return;
    setBusy(true);
    setResult(null);
    // let the button show its busy state before the GPU blocks the thread
    await new Promise((r) => setTimeout(r, 30));
    try {
      const r = await exportImage(renderer, edit, image, opts);
      setResult(r);
      // on touch devices the share sheet needs a fresh tap, so only desktop downloads right away
      if (!touch) download(r.blob, r.name);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="export">
      <div class="field">
        <span class="field-label">Format</span>
        <Segmented
          label="Format"
          value={opts.format}
          onChange={(v) => set('format', v as ExportOptions['format'])}
          options={[
            { value: 'jpeg', label: 'JPEG' },
            { value: 'png', label: 'PNG' },
            { value: 'webp', label: 'WebP', disabled: !webp },
          ]}
        />
        {!webp && <p class="hint">Dieser Browser kann kein WebP schreiben.</p>}
      </div>

      {lossy && (
        <div class="slider">
          <div class="slider-head">
            <span>Qualität</span>
            <span class="value">{opts.quality}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={opts.quality}
            style={{ '--lo': '0%', '--hi': `${opts.quality}%` }}
            aria-label="Qualität"
            onInput={(e) => set('quality', Number(e.currentTarget.value))}
          />
        </div>
      )}

      <div class="field">
        <span class="field-label">Auflösung</span>
        <Segmented
          label="Auflösung"
          value={opts.size}
          onChange={(v) => set('size', v as ExportOptions['size'])}
          options={[
            { value: 'original', label: 'Original' },
            { value: 'custom', label: 'Eigene' },
          ]}
        />
        {opts.size === 'custom' && (
          <label class="inline">
            Lange Kante
            <input
              type="number"
              min={64}
              max={16384}
              value={opts.longEdge}
              onChange={(e) => set('longEdge', Math.max(64, Number(e.currentTarget.value) || 2048))}
            />
            px
          </label>
        )}
        {size && (
          <p class="hint">
            {opts.compare ? size.width * 2 : size.width} × {size.height} px
            {size.capped ? ', vom Browser begrenzt' : ''}
          </p>
        )}
      </div>

      <label class="row toggle-row">
        <span>Dateigröße optimieren</span>
        <Switch
          checked={opts.optimize}
          label="Dateigröße optimieren"
          onChange={(v) => set('optimize', v)}
        />
      </label>
      {opts.optimize && lossy && (
        <label class="inline">
          Höchstens
          <input
            type="number"
            min={20}
            value={opts.targetKB}
            onChange={(e) => set('targetKB', Math.max(20, Number(e.currentTarget.value) || 1500))}
          />
          KB
        </label>
      )}

      <label class="row toggle-row">
        <span>Metadaten erhalten</span>
        <Switch
          checked={opts.keepMeta}
          label="Metadaten erhalten"
          onChange={(v) => set('keepMeta', v)}
        />
      </label>
      {opts.keepMeta && (opts.format !== 'jpeg' || (image && !image.app1)) && (
        <p class="hint">
          {opts.format !== 'jpeg'
            ? 'Nur beim JPEG-Export möglich.'
            : 'Das Originalbild enthält keine EXIF-Daten.'}
        </p>
      )}

      <label class="row toggle-row">
        <span>Vorher-Nachher exportieren</span>
        <Switch
          checked={opts.compare}
          label="Vorher-Nachher exportieren"
          onChange={(v) => set('compare', v)}
        />
      </label>

      {/* sticks to the bottom of the panel so the main action never hides below the fold */}
      <div class="export-footer">
        {result && (
          <div class="result">
            <p>
              <strong>{result.name}</strong>
              <br />
              {result.width} × {result.height} px, {kb(result.blob.size)}
            </p>
            {result.notes.map((n) => (
              <p class="hint">{n}</p>
            ))}
            <div class="result-actions">
              <button
                type="button"
                class="chip-btn"
                onClick={() => download(result.blob, result.name)}
              >
                <Icon name="download" /> Herunterladen
              </button>
              {shareable && !touch && (
                <button type="button" class="chip-btn" onClick={shareResult}>
                  <Icon name="share" /> Teilen
                </button>
              )}
            </div>
          </div>
        )}

        {/* on a phone the share sheet is the way into Fotos, so it takes over the main button */}
        {result && shareable && touch ? (
          <button type="button" class="primary" onClick={shareResult}>
            <Icon name="share" /> In Fotos sichern / Teilen
          </button>
        ) : (
          <button
            type="button"
            class="primary"
            disabled={!image || !renderer || busy}
            onClick={run}
          >
            <Icon name="download" />
            {busy ? 'Wird gerendert…' : 'Exportieren'}
          </button>
        )}
      </div>
    </div>
  );
}
