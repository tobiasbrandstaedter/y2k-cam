import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { EditState } from '../editor/effects';
import type { LoadedImage } from '../io/load';
import { Renderer } from '../render/renderer';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
const PAD = 16;
const MAX_PREVIEW = 4096;

type Props = {
  image: LoadedImage | null;
  edit: EditState;
  compare: boolean;
  showOriginal: boolean;
  zoom: number;
  setZoom: (z: number) => void;
  onRenderer: (r: Renderer | null) => void;
  onError: (message: string) => void;
  empty: preact.ComponentChildren;
};

export function Viewer({
  image,
  edit,
  compare,
  showOriginal,
  zoom,
  setZoom,
  onRenderer,
  onError,
  empty,
}: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const frame = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [split, setSplit] = useState(0.5);
  const [generation, setGeneration] = useState(0);
  const gesture = useRef<{
    mode: 'pan' | 'split' | 'pinch';
    x: number;
    y: number;
    pan: { x: number; y: number };
    dist?: number;
    zoom?: number;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // one renderer per canvas, rebuilt after the browser threw away the GPU context
  useEffect(() => {
    const c = canvas.current!;
    try {
      renderer.current = new Renderer(c);
      onRenderer(renderer.current);
    } catch (e) {
      onError((e as Error).message);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      renderer.current = null;
      onRenderer(null);
    };
    const restored = () => setGeneration((g) => g + 1);
    c.addEventListener('webglcontextlost', lost);
    c.addEventListener('webglcontextrestored', restored);
    return () => {
      c.removeEventListener('webglcontextlost', lost);
      c.removeEventListener('webglcontextrestored', restored);
    };
  }, [generation]);

  useEffect(() => {
    if (image && renderer.current) {
      renderer.current.setImage(image.bitmap);
      setPan({ x: 0, y: 0 });
    }
  }, [image, generation]);

  useLayoutEffect(() => {
    const el = stage.current!;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fitted display size of the photo, before zoom
  const fit = image
    ? Math.min((box.w - PAD * 2) / image.width, (box.h - PAD * 2) / image.height)
    : 1;
  const dispW = image ? Math.max(1, image.width * fit) : 0;
  const dispH = image ? Math.max(1, image.height * fit) : 0;
  const cssW = dispW * zoom;
  const cssH = dispH * zoom;
  const maxPan = {
    x: Math.max(0, (cssW - box.w) / 2 + PAD),
    y: Math.max(0, (cssH - box.h) / 2 + PAD),
  };
  const px = Math.min(maxPan.x, Math.max(-maxPan.x, pan.x));
  const py = Math.min(maxPan.y, Math.max(-maxPan.y, pan.y));
  const left = (box.w - cssW) / 2 + px;
  const top = (box.h - cssH) / 2 + py;
  const splitValue = showOriginal ? 2 : compare ? split : -1;

  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  // render on the next frame, many slider events per frame collapse into one render
  useEffect(() => {
    const r = renderer.current;
    if (!image || !r || dispW < 2) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      let w = cssW * dpr;
      let h = cssH * dpr;
      const k = Math.min(1, r.sourceWidth / w, MAX_PREVIEW / Math.max(w, h));
      w = Math.max(1, Math.round(w * k));
      h = Math.max(1, Math.round(h * k));
      try {
        r.render(edit, w, h, { date: image.date }, splitValue);
      } catch (e) {
        onError((e as Error).message);
      }
    });
  }, [edit, image, cssW, cssH, splitValue, generation]);

  useEffect(() => {
    const el = stage.current!;
    const wheel = (e: WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * Math.exp(-e.deltaY * 0.0015))));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [image, zoom]);

  const onDown = (e: PointerEvent) => {
    if (!image) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: 'pinch',
        x: 0,
        y: 0,
        pan,
        dist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        zoom,
      };
      return;
    }
    const onHandle = (e.target as HTMLElement).closest('.split-handle');
    if (onHandle) {
      gesture.current = { mode: 'split', x: e.clientX, y: e.clientY, pan };
    } else if (zoom > 1) {
      gesture.current = { mode: 'pan', x: e.clientX, y: e.clientY, pan: { x: px, y: py } };
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.mode === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.zoom! * (d / g.dist!))));
    } else if (g.mode === 'pan') {
      setPan({ x: g.pan.x + e.clientX - g.x, y: g.pan.y + e.clientY - g.y });
    } else if (g.mode === 'split') {
      const rect = stage.current!.getBoundingClientRect();
      setSplit(Math.min(1, Math.max(0, (e.clientX - rect.left - left) / cssW)));
    }
  };

  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  return (
    <div
      ref={stage}
      class={`stage ${zoom > 1 ? 'zoomed' : ''}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas
        ref={canvas}
        class="photo"
        style={{
          display: image ? 'block' : 'none',
          width: `${cssW}px`,
          height: `${cssH}px`,
          transform: `translate(${left}px, ${top}px)`,
        }}
      />
      {image && compare && !showOriginal && (
        <div
          class="split-handle"
          style={{
            transform: `translateX(${left + split * cssW}px)`,
            top: `${Math.max(0, top)}px`,
            height: `${Math.min(cssH, box.h)}px`,
          }}
        >
          <span class="split-label before">Vorher</span>
          <span class="split-knob" />
          <span class="split-label after">Nachher</span>
        </div>
      )}
      {image && showOriginal && <div class="badge">Original</div>}
      {!image && empty}
    </div>
  );
}
