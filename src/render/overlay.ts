// Camcorder and digicam on screen display, drawn with Canvas 2D at render size and uploaded as
// a texture. The composite pass puts it under scanlines, noise and grain so it looks recorded.
// Font is VT323 (SIL OFL 1.1), bundled, see main.tsx. The date can also be drawn as seven
// segment digits, see segments.ts.

import { formatDate, formatTime } from '../editor/datetime';
import type { Value } from '../editor/effects';
import { drawSegments, segmentWidth } from './segments';

type Part =
  | { kind: 'text'; text: string }
  | { kind: 'segment'; text: string }
  | { kind: 'dot' }
  | { kind: 'play' }
  | { kind: 'battery'; level: number };
type Line = Part[];

const COLORS: Record<string, string> = {
  white: '#f3f3ee',
  gray: '#c9c9c4',
  orange: '#ff9b30',
  yellow: '#ffd43d',
  green: '#a4ff80',
};

const t = (text: string): Part => ({ kind: 'text', text });

// Which lines end up in which corner. Exported for tests.
export function overlayLines(v: Record<string, Value>, date: Date): Map<string, Line[]> {
  const groups = new Map<string, Line[]>();
  const add = (anchor: string, line: Line) => {
    if (line.length === 0) return;
    groups.set(anchor, [...(groups.get(anchor) ?? []), line]);
  };

  const custom = v.dateSource === 'custom';
  const dateStr = custom ? String(v.dateText) : formatDate(date, String(v.dateFormat));
  const timeStr = custom ? String(v.timeText) : formatTime(date, String(v.timeFormat));
  const datePos = String(v.datePos);
  const d = (text: string): Part =>
    v.dateFont === 'segment' ? { kind: 'segment', text } : t(text);
  if (v.dateLayout === 'stack') {
    // camcorders put the time above the date
    if (v.time) add(datePos, [d(timeStr)]);
    if (v.date) add(datePos, [d(dateStr)]);
  } else {
    const parts = [v.date ? dateStr : '', v.time ? timeStr : ''].filter(Boolean);
    if (parts.length) add(datePos, [d(parts.join(' '))]);
  }

  const recPos = String(v.recPos);
  const recLine: Line = [];
  if (v.recDot) recLine.push({ kind: 'dot' });
  if (v.rec) recLine.push(t('REC'));
  add(recPos, recLine);
  if (v.recTime) add(recPos, [t(String(v.recTimeText))]);

  const statusPos = String(v.statusPos);
  if (v.cam) add(statusPos, [t(String(v.camText))]);
  if (v.play) add(statusPos, [t('PLAY'), { kind: 'play' }]);
  if (v.timer) add(statusPos, [t(String(v.timerText))]);
  const modeLine: Line = [];
  if (v.mode) modeLine.push(t(String(v.modeText)));
  if (v.battery) modeLine.push({ kind: 'battery', level: Number(v.batteryLevel) });
  add(statusPos, modeLine);

  return groups;
}

export function drawOverlay(
  v: Record<string, Value>,
  width: number,
  height: number,
  date: Date,
): OffscreenCanvas {
  const out = new OffscreenCanvas(width, height);
  const fontPx = height * (0.022 + (Number(v.size) / 100) * 0.05);
  // pixelation: draw small, scale up without smoothing
  const cell = 1 + (Number(v.pixelate) / 100) * (fontPx / 9);
  const sw = Math.max(1, Math.round(width / cell));
  const sh = Math.max(1, Math.round(height / cell));
  const small = new OffscreenCanvas(sw, sh);
  const g = small.getContext('2d')!;
  const s = sw / width;

  const fs = fontPx * s;
  const margin = height * (0.02 + (Number(v.margin) / 100) * 0.08) * s;
  const lineH = fs * 1.08;
  const gap = fs * 0.32;
  const color = COLORS[String(v.color)] ?? COLORS.white!;
  g.font = `${fs}px VT323, "Courier New", monospace`;
  g.textBaseline = 'middle';
  g.globalAlpha = Number(v.opacity) / 100;

  const widthOf = (p: Part) => {
    switch (p.kind) {
      case 'text':
        return g.measureText(p.text).width;
      case 'segment':
        return segmentWidth(g, p.text, fs);
      case 'dot':
        return fs * 0.62;
      case 'play':
        return fs * 0.55;
      case 'battery':
        return fs * 1.35;
    }
  };
  const lineWidth = (line: Line) =>
    line.reduce((sum, p, i) => sum + widthOf(p) + (i > 0 ? gap : 0), 0);

  const drawPart = (p: Part, x: number, y: number) => {
    switch (p.kind) {
      case 'text':
        g.fillStyle = color;
        g.fillText(p.text, x, y);
        break;
      case 'segment':
        g.fillStyle = color;
        drawSegments(g, p.text, x, y, fs);
        break;
      case 'dot':
        g.fillStyle = '#ff2d24';
        g.beginPath();
        g.arc(x + fs * 0.3, y, fs * 0.27, 0, Math.PI * 2);
        g.fill();
        break;
      case 'play':
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x, y - fs * 0.28);
        g.lineTo(x + fs * 0.5, y);
        g.lineTo(x, y + fs * 0.28);
        g.closePath();
        g.fill();
        break;
      case 'battery': {
        const w = fs * 1.15;
        const h = fs * 0.52;
        const lw = Math.max(1, fs * 0.08);
        g.strokeStyle = color;
        g.fillStyle = color;
        g.lineWidth = lw;
        g.strokeRect(x + lw / 2, y - h / 2, w - lw, h);
        g.fillRect(x + w, y - h * 0.22, fs * 0.12, h * 0.44);
        const bars = Math.ceil((p.level / 100) * 3);
        const bw = (w - lw * 4) / 3;
        for (let i = 0; i < bars; i++) {
          g.fillRect(x + lw * 1.5 + i * (bw + lw * 0.5), y - h / 2 + lw * 1.5, bw, h - lw * 3);
        }
        break;
      }
    }
  };

  const groups = overlayLines(v, date);
  // two layers: a dark soft shadow for legibility, then the text with its own glow
  for (const layer of ['shadow', 'glow'] as const) {
    if (layer === 'shadow') {
      g.shadowColor = 'rgba(0, 0, 0, 0.55)';
      g.shadowBlur = fs * 0.12;
      g.shadowOffsetX = fs * 0.05;
      g.shadowOffsetY = fs * 0.05;
    } else {
      g.shadowColor = color;
      g.shadowBlur = fs * 0.6 * (Number(v.glow) / 100);
      g.shadowOffsetX = 0;
      g.shadowOffsetY = 0;
    }
    for (const [anchor, lines] of groups) {
      lines.forEach((line, i) => {
        const lw = lineWidth(line);
        let x = anchor[1] === 'l' ? margin : anchor[1] === 'r' ? sw - margin - lw : (sw - lw) / 2;
        // never let a line run off the picture
        x = Math.min(Math.max(x, 2), Math.max(2, sw - lw - 2));
        const y =
          anchor[0] === 't'
            ? margin + lineH * (i + 0.5)
            : sh - margin - lineH * (lines.length - i - 0.5);
        for (const p of line) {
          drawPart(p, x, y);
          x += widthOf(p) + gap;
        }
      });
    }
  }

  const og = out.getContext('2d')!;
  og.imageSmoothingEnabled = cell < 1.5;
  og.drawImage(small, 0, 0, width, height);
  return out;
}
