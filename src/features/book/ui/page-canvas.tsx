"use client";

import { useRef, useState, type DragEvent, type PointerEvent } from "react";
import { ptToMm, rectBottom, rectRight, type Rect } from "../units";
import type { BookElement, BookPage, ImageElement, TextElement } from "../types";
import { PageView } from "./page-view";
import type { BookStudioApi } from "./use-book-studio";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

interface Drag {
  mode: "move" | Handle;
  start: { x: number; y: number };
  frame: Rect;
  elementId: string;
  moved: boolean;
}

function handlePos(f: Rect, h: Handle): { x: number; y: number } {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  return { nw: { x: f.x, y: f.y }, n: { x: cx, y: f.y }, ne: { x: rectRight(f), y: f.y }, e: { x: rectRight(f), y: cy }, se: { x: rectRight(f), y: rectBottom(f) }, s: { x: cx, y: rectBottom(f) }, sw: { x: f.x, y: rectBottom(f) }, w: { x: f.x, y: cy } }[h];
}

const CURSORS: Record<Handle, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };

/** Rubber-band snapping: nearest of the candidate coordinates within `threshold`. */
function snap1(values: number[], targets: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const v of values) for (const t of targets) {
    const d = t - v;
    if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: t };
  }
  return best;
}

export function PageCanvas({
  studio,
  page,
  index,
  pxPerMm,
  interactive = true,
}: {
  studio: BookStudioApi;
  page: BookPage;
  index: number;
  pxPerMm: number;
  interactive?: boolean;
}) {
  const { project, view, selection, images } = studio;
  const render = studio.renderOf(page, index);
  const geom = render.geometry;
  const box = view.bleed ? geom.bleed : geom.trim;
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [editing, setEditing] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const isCurrent = selection.pageId === page.id;
  const selectedId = isCurrent ? selection.elementId : null;

  const toMm = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: box.x + ((e.clientX - r.left) / r.width) * box.w, y: box.y + ((e.clientY - r.top) / r.height) * box.h };
  };

  const otherTargets = (excludeId: string) => {
    const W = geom.trim.w;
    const H = geom.trim.h;
    const xs = [0, W / 2, W, geom.content.x, geom.content.x + geom.content.w];
    const ys = [0, H / 2, H, geom.content.y, geom.content.y + geom.content.h];
    for (const el of page.elements) {
      if (el.id === excludeId) continue;
      xs.push(el.frame.x, el.frame.x + el.frame.w / 2, el.frame.x + el.frame.w);
      ys.push(el.frame.y, el.frame.y + el.frame.h / 2, el.frame.y + el.frame.h);
    }
    return { xs, ys };
  };

  const onElementDown = (e: PointerEvent, el: BookElement) => {
    if (!interactive) return;
    e.stopPropagation();
    studio.selectElement(page.id, el.id);
    if (el.locked || editing === el.id) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode: "move", start: toMm(e), frame: { ...el.frame }, elementId: el.id, moved: false };
  };

  const onHandleDown = (e: PointerEvent, el: BookElement, h: Handle) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode: h, start: toMm(e), frame: { ...el.frame }, elementId: el.id, moved: false };
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toMm(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) * pxPerMm < 2) return;
    d.moved = true;
    const thr = 6 / pxPerMm;
    const t = view.snap ? otherTargets(d.elementId) : { xs: [], ys: [] };
    let f: Rect = { ...d.frame };
    const gx: number[] = [];
    const gy: number[] = [];

    if (d.mode === "move") {
      f.x += dx;
      f.y += dy;
      const sx = snap1([f.x, f.x + f.w / 2, f.x + f.w], t.xs, thr);
      const sy = snap1([f.y, f.y + f.h / 2, f.y + f.h], t.ys, thr);
      if (sx) {
        f.x += sx.delta;
        gx.push(sx.at);
      }
      if (sy) {
        f.y += sy.delta;
        gy.push(sy.at);
      }
    } else {
      const m = d.mode;
      let left = d.frame.x;
      let top = d.frame.y;
      let right = d.frame.x + d.frame.w;
      let bottom = d.frame.y + d.frame.h;
      if (m.includes("w")) left += dx;
      if (m.includes("e")) right += dx;
      if (m.includes("n")) top += dy;
      if (m.includes("s")) bottom += dy;
      if (view.snap) {
        if (m.includes("w")) {
          const s = snap1([left], t.xs, thr);
          if (s) {
            left += s.delta;
            gx.push(s.at);
          }
        }
        if (m.includes("e")) {
          const s = snap1([right], t.xs, thr);
          if (s) {
            right += s.delta;
            gx.push(s.at);
          }
        }
        if (m.includes("n")) {
          const s = snap1([top], t.ys, thr);
          if (s) {
            top += s.delta;
            gy.push(s.at);
          }
        }
        if (m.includes("s")) {
          const s = snap1([bottom], t.ys, thr);
          if (s) {
            bottom += s.delta;
            gy.push(s.at);
          }
        }
      }
      f = { x: Math.min(left, right), y: Math.min(top, bottom), w: Math.abs(right - left), h: Math.abs(bottom - top) };
      const el = page.elements.find((x) => x.id === d.elementId);
      // Shift keeps the shape's proportions.
      if (e.shiftKey && el && d.frame.h > 0) {
        const ratio = d.frame.w / d.frame.h;
        if (m === "n" || m === "s") f.w = f.h * ratio;
        else f.h = f.w / ratio;
      }
    }
    if (view.grid) {
      f = { ...f, x: Math.round(f.x / 5) * 5, y: Math.round(f.y / 5) * 5 };
    }
    setGuides({ x: gx, y: gy });
    studio.setFrame(page.id, d.elementId, f);
  };

  const onUp = () => {
    drag.current = null;
    setGuides({ x: [], y: [] });
  };

  // Photos dragged in from the Photos tab or from the desktop.
  const onDragOver = (e: DragEvent) => {
    if (!interactive) return;
    const types = Array.from(e.dataTransfer.types);
    if (types.includes("application/x-tms-source") || types.includes("Files")) {
      e.preventDefault();
      setOver(true);
    }
  };
  const onDrop = async (e: DragEvent) => {
    setOver(false);
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toMm(e);
    const hit = [...page.elements].reverse().find((el): el is ImageElement => el.type === "image" && p.x >= el.frame.x && p.x <= rectRight(el.frame) && p.y >= el.frame.y && p.y <= rectBottom(el.frame));
    const id = e.dataTransfer.getData("application/x-tms-source");
    if (id) {
      studio.placeSource(id, { pageId: page.id, elementId: hit?.id });
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      const added = await studio.addFiles(files);
      if (added[0]) studio.placeSource(added[0].id, { pageId: page.id, elementId: hit?.id });
    }
  };

  const placeholders = page.elements.filter((e): e is ImageElement => e.type === "image" && !e.sourceId).map((e) => e.frame);
  const pageIssues = studio.issues.filter((i) => i.pageId === page.id && i.elementId);
  const selectedEl = page.elements.find((e) => e.id === selectedId) ?? null;
  const handle = 9 / pxPerMm;
  const editingEl = editing ? (page.elements.find((e): e is TextElement => e.id === editing && e.type === "text") ?? null) : null;
  const editLayout = editingEl ? render.layouts.get(editingEl.id) : undefined;

  const guideLines = () => {
    const lines: React.ReactNode[] = [];
    const t = geom.trim;
    if (view.bleed && project.settings.bleedMm > 0) {
      // Shade the bleed so it is obvious that this part is trimmed off.
      lines.push(
        <path key="bleed" fillRule="evenodd" fill="#d00" opacity={0.12} d={`M${geom.bleed.x} ${geom.bleed.y}h${geom.bleed.w}v${geom.bleed.h}h${-geom.bleed.w}Z M${t.x} ${t.y}h${t.w}v${t.h}h${-t.w}Z`} />,
      );
    }
    lines.push(<rect key="trim" x={t.x} y={t.y} width={t.w} height={t.h} fill="none" stroke="#111" strokeOpacity={0.5} strokeWidth={0.25} />);
    if (view.margins) lines.push(<rect key="margin" x={geom.content.x} y={geom.content.y} width={geom.content.w} height={geom.content.h} fill="none" stroke="#06f" strokeOpacity={0.55} strokeWidth={0.2} strokeDasharray="2 1.5" />);
    if (view.safe) lines.push(<rect key="safe" x={geom.safe.x} y={geom.safe.y} width={geom.safe.w} height={geom.safe.h} fill="none" stroke="#0a0" strokeOpacity={0.7} strokeWidth={0.2} strokeDasharray="1 1" />);
    if (view.grid) {
      for (let x = 5; x < t.w; x += 5) lines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={t.h} stroke="#888" strokeOpacity={x % 25 === 0 ? 0.35 : 0.18} strokeWidth={0.1} />);
      for (let y = 5; y < t.h; y += 5) lines.push(<line key={`gy${y}`} x1={0} y1={y} x2={t.w} y2={y} stroke="#888" strokeOpacity={y % 25 === 0 ? 0.35 : 0.18} strokeWidth={0.1} />);
    }
    return lines;
  };

  const overlay = (
    <g pointerEvents="none">
      {guideLines()}
      {page.elements.map((el) => {
        if (el.type === "image" && !el.sourceId) {
          return (
            <text key={`ph${el.id}`} x={el.frame.x + el.frame.w / 2} y={el.frame.y + el.frame.h / 2} textAnchor="middle" fontSize={3.2} fill="#666" fontFamily="system-ui, sans-serif">
              Drop a photo here
            </text>
          );
        }
        if (el.type === "text") {
          const l = render.layouts.get(el.id);
          if (l?.overflow) {
            return (
              <g key={`of${el.id}`}>
                <rect x={el.frame.x} y={el.frame.y} width={el.frame.w} height={el.frame.h} fill="none" stroke="#d92d20" strokeWidth={0.4} strokeDasharray="1.5 1" />
                <circle cx={rectRight(el.frame)} cy={rectBottom(el.frame)} r={2.4} fill="#d92d20" />
                <text x={rectRight(el.frame)} y={rectBottom(el.frame) + 1.1} textAnchor="middle" fontSize={3.2} fill="#fff" fontWeight="bold" fontFamily="system-ui, sans-serif">
                  !
                </text>
              </g>
            );
          }
        }
        return null;
      })}
      {pageIssues
        .filter((i) => i.severity !== "info" && i.code !== "text-overflow")
        .map((i) => {
          const el = page.elements.find((e) => e.id === i.elementId);
          return el ? <rect key={i.id} x={el.frame.x} y={el.frame.y} width={el.frame.w} height={el.frame.h} fill="none" stroke={i.severity === "error" ? "#d92d20" : "#f79009"} strokeWidth={0.5} strokeDasharray="2 1" /> : null;
        })}
      {guides.x.map((x, i) => (
        <line key={`snx${i}`} x1={x} y1={geom.bleed.y} x2={x} y2={geom.bleed.y + geom.bleed.h} stroke="#e0338a" strokeWidth={0.25} />
      ))}
      {guides.y.map((y, i) => (
        <line key={`sny${i}`} x1={geom.bleed.x} y1={y} x2={geom.bleed.x + geom.bleed.w} y2={y} stroke="#e0338a" strokeWidth={0.25} />
      ))}
    </g>
  );

  const hit = (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className="absolute inset-0 h-full w-full touch-none"
      onPointerDown={() => interactive && studio.selectElement(page.id, null)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {page.elements.map((el) => {
        const f = el.type === "shape" && el.shape === "line" ? { ...el.frame, y: el.frame.y - 2, h: Math.max(el.frame.h, 0) + 4 } : el.frame;
        return (
          <rect
            key={el.id}
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            fill="transparent"
            style={{ cursor: el.locked ? "default" : "move" }}
            onPointerDown={(e) => onElementDown(e, el)}
            onDoubleClick={() => el.type === "text" && !el.locked && setEditing(el.id)}
          />
        );
      })}
      {interactive && selectedEl ? (
        <g>
          <rect x={selectedEl.frame.x} y={selectedEl.frame.y} width={selectedEl.frame.w} height={selectedEl.frame.h} fill="none" stroke="#2563eb" strokeWidth={0.5} pointerEvents="none" />
          {!selectedEl.locked && editing !== selectedEl.id
            ? HANDLES.map((h) => {
                const p = handlePos(selectedEl.frame, h);
                return <rect key={h} x={p.x - handle / 2} y={p.y - handle / 2} width={handle} height={handle} fill="#fff" stroke="#2563eb" strokeWidth={0.4} style={{ cursor: CURSORS[h] }} onPointerDown={(e) => onHandleDown(e, selectedEl, h)} />;
              })
            : null}
        </g>
      ) : null}
    </svg>
  );

  return (
    <div
      ref={wrap}
      className="relative bg-white shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/10"
      style={{ width: box.w * pxPerMm, height: box.h * pxPerMm, outline: over ? "3px solid #2563eb" : undefined }}
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onPointerDown={() => !isCurrent && studio.selectElement(page.id, null)}
    >
      <PageView render={render} images={images} showBleed={view.bleed} pxPerMm={pxPerMm} overlay={overlay} placeholders={placeholders} />
      {hit}
      {editingEl && editLayout ? (
        <textarea
          autoFocus
          aria-label="Edit text"
          value={editingEl.text}
          onChange={(e) => studio.patchElement(page.id, editingEl.id, { text: e.target.value } as Partial<TextElement>, `text:${editingEl.id}`)}
          onBlur={() => setEditing(null)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
          className="absolute resize-none overflow-auto border-0 bg-transparent p-0 outline-2 outline-blue-500"
          style={{
            left: (editingEl.frame.x - box.x) * pxPerMm,
            top: (editingEl.frame.y - box.y) * pxPerMm,
            width: editingEl.frame.w * pxPerMm,
            height: editingEl.frame.h * pxPerMm,
            padding: editingEl.paddingMm * pxPerMm,
            fontFamily: `'${editLayout.font.cssFamily}', sans-serif`,
            fontSize: ptToMm(editingEl.style.sizePt) * pxPerMm,
            lineHeight: editingEl.style.lineHeight,
            letterSpacing: ptToMm(editingEl.style.trackingPt) * pxPerMm,
            fontWeight: editLayout.font.bold ? 700 : 400,
            fontStyle: editLayout.font.italic ? "italic" : "normal",
            color: editingEl.style.color,
            textAlign: editingEl.style.align === "justify" ? "justify" : editingEl.style.align,
            textTransform: editingEl.style.uppercase ? "uppercase" : "none",
            background: page.background.color,
          }}
        />
      ) : null}
    </div>
  );
}
