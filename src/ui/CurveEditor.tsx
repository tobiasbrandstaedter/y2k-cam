import { useRef, useState } from 'preact/hooks';
import { clamp01, curveFn } from '../editor/curves';
import type { CurveChannel, CurvePoint, Curves } from '../editor/effects';
import { Segmented } from './controls';

const CHANNELS: { value: CurveChannel; label: string; color: string }[] = [
  { value: 'master', label: 'RGB', color: '#e8e8e8' },
  { value: 'r', label: 'R', color: '#ff6b5e' },
  { value: 'g', label: 'G', color: '#6bdc7c' },
  { value: 'b', label: 'B', color: '#6aa8ff' },
];

const SIZE = 240;

// Click on the curve area adds a point, drag moves it, double click removes it.
// The end points can only move up and down.
export function CurveEditor({
  curves,
  onChange,
}: {
  curves: Curves;
  onChange: (curves: Curves, commit: boolean) => void;
}) {
  const [channel, setChannel] = useState<CurveChannel>('master');
  const svg = useRef<SVGSVGElement>(null);
  // the points live here while dragging, props can lag a frame behind the pointer
  const drag = useRef<{ index: number; pts: CurvePoint[] } | null>(null);
  const points = curves[channel];
  const color = CHANNELS.find((c) => c.value === channel)!.color;

  const toCurve = (e: PointerEvent): CurvePoint => {
    const r = svg.current!.getBoundingClientRect();
    return [clamp01((e.clientX - r.left) / r.width), clamp01(1 - (e.clientY - r.top) / r.height)];
  };

  const update = (pts: CurvePoint[], commit: boolean) =>
    onChange({ ...curves, [channel]: pts }, commit);

  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    const [x, y] = toCurve(e);
    const i = drag.current.index;
    const pts = drag.current.pts.map((p) => [p[0], p[1]] as CurvePoint);
    const last = pts.length - 1;
    // keep x between the neighbours so points never swap order
    const minX = i === 0 ? 0 : pts[i - 1]![0] + 0.01;
    const maxX = i === last ? 1 : pts[i + 1]![0] - 0.01;
    pts[i] = [i === 0 ? 0 : i === last ? 1 : Math.min(maxX, Math.max(minX, x)), y];
    drag.current.pts = pts;
    update(pts, false);
  };

  const down = (e: PointerEvent) => {
    const [x, y] = toCurve(e);
    // grab the nearest point if close, otherwise add one on the curve
    let best = -1;
    let bestDist = 0.05;
    points.forEach((p, i) => {
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    // a second point at the same x would make the curve jump, take the one already there
    // (mostly the end points, when clicking along the left or right edge)
    if (best === -1) best = points.findIndex((p) => Math.abs(p[0] - x) < 0.02);
    let pts = points;
    if (best === -1) {
      pts = [...points, [x, curveFn(points)(x)] as CurvePoint].sort((a, b) => a[0] - b[0]);
      best = pts.findIndex((p) => p[0] === x);
      update(pts, false);
    }
    drag.current = { index: best, pts };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const up = () => {
    if (drag.current) update(drag.current.pts, true);
    drag.current = null;
  };

  // pointer capture retargets the double click to the svg, so find the point by position
  const removeNear = (e: MouseEvent) => {
    const [x, y] = toCurve(e as PointerEvent);
    const i = points.findIndex((p) => Math.hypot(p[0] - x, p[1] - y) < 0.05);
    if (i <= 0 || i === points.length - 1) return;
    update(
      points.filter((_, k) => k !== i),
      true,
    );
  };

  const f = curveFn(points);
  let d = '';
  for (let i = 0; i <= 64; i++) {
    const x = i / 64;
    d += `${i ? 'L' : 'M'}${x * SIZE},${(1 - clamp01(f(x))) * SIZE}`;
  }

  return (
    <div class="curves">
      <div class="curves-bar">
        <Segmented
          label="Kanal"
          options={CHANNELS}
          value={channel}
          onChange={(v) => setChannel(v as CurveChannel)}
        />
        <button
          type="button"
          class="text-btn"
          onClick={() =>
            update(
              [
                [0, 0],
                [1, 1],
              ],
              true,
            )
          }
        >
          Kanal zurücksetzen
        </button>
      </div>
      <svg
        ref={svg}
        class="curve-area"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDblClick={removeNear}
      >
        {[1, 2, 3].map((k) => (
          <>
            <line class="grid" x1={(k * SIZE) / 4} y1={0} x2={(k * SIZE) / 4} y2={SIZE} />
            <line class="grid" x1={0} y1={(k * SIZE) / 4} x2={SIZE} y2={(k * SIZE) / 4} />
          </>
        ))}
        <line class="diagonal" x1={0} y1={SIZE} x2={SIZE} y2={0} />
        <path d={d} fill="none" stroke={color} stroke-width="2" />
        {points.map((p, i) => (
          <circle
            cx={p[0] * SIZE}
            cy={(1 - p[1]) * SIZE}
            r={6}
            fill="#141416"
            stroke={color}
            stroke-width="2"
            key={i}
          />
        ))}
      </svg>
      <p class="hint">Klicken fügt einen Punkt hinzu, Ziehen verschiebt, Doppelklick entfernt.</p>
    </div>
  );
}
