"use client";

import { Fragment, useId, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { DisplayItem, PageRender } from "../display-list";
import { filterMatrix, isNeutral } from "../filters";
import type { BookImages } from "../images";
import { ptToMm, type Rect } from "../units";

export function useImageVersion(images: BookImages): number {
  // A cheap counter that changes whenever a preview finishes generating.
  return useSyncExternalStore(
    (cb) => images.onChange(cb),
    () => images.version,
    () => 0,
  );
}

function filterKey(f: DisplayItem & { type: "image" }): string {
  return `${f.filter.preset}|${f.filter.brightness}|${f.filter.contrast}|${f.filter.saturation}`;
}

/**
 * Draws a page from its display list as SVG. SVG units are millimetres, so what you see is
 * what the PDF writes, at any zoom. `pxPerMm` only decides how detailed the photo previews are.
 */
export function PageView({
  render,
  images,
  showBleed = false,
  pxPerMm = 2,
  className,
  overlay,
  placeholders,
}: {
  render: PageRender;
  images: BookImages;
  showBleed?: boolean;
  pxPerMm?: number;
  className?: string;
  /** Extra SVG drawn on top, in the same millimetre coordinates */
  overlay?: ReactNode;
  /** Draw dashed placeholders for empty frames (editor only) */
  placeholders?: Rect[];
}) {
  const uid = useId().replace(/:/g, "");
  const version = useImageVersion(images);
  const view = showBleed ? render.geometry.bleed : render.geometry.trim;

  const filters = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of render.items) {
      if (item.type === "image" && !isNeutral(item.filter)) {
        const key = filterKey(item);
        if (!map.has(key)) map.set(key, filterMatrix(item.filter).map((n) => n.toFixed(4)).join(" "));
      }
    }
    return [...map.entries()];
  }, [render.items]);
  const filterIds = new Map(filters.map(([key], i) => [key, `f${uid}${i}`]));

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "auto", fontKerning: "normal", fontSynthesis: "none" }}
      data-version={version}
    >
      <defs>
        <clipPath id={`trim${uid}`}>
          <rect x={view.x} y={view.y} width={view.w} height={view.h} />
        </clipPath>
        {filters.map(([key, values]) => (
          <filter key={key} id={filterIds.get(key)} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={values} />
          </filter>
        ))}
        {render.items.map((item, i) =>
          item.type === "image" ? (
            <clipPath key={i} id={`c${uid}${i}`}>
              <rect x={item.clip.x} y={item.clip.y} width={item.clip.w} height={item.clip.h} rx={item.radiusMm} />
            </clipPath>
          ) : null,
        )}
      </defs>
      <g clipPath={`url(#trim${uid})`}>
        {render.items.map((item, i) => {
          switch (item.type) {
            case "rect":
              return (
                <rect
                  key={i}
                  x={item.rect.x}
                  y={item.rect.y}
                  width={item.rect.w}
                  height={item.rect.h}
                  rx={item.radiusMm || undefined}
                  fill={item.fill ?? "none"}
                  stroke={item.stroke ?? "none"}
                  strokeWidth={item.strokeMm}
                  opacity={item.opacity}
                />
              );
            case "ellipse":
              return (
                <ellipse
                  key={i}
                  cx={item.rect.x + item.rect.w / 2}
                  cy={item.rect.y + item.rect.h / 2}
                  rx={item.rect.w / 2}
                  ry={item.rect.h / 2}
                  fill={item.fill ?? "none"}
                  stroke={item.stroke ?? "none"}
                  strokeWidth={item.strokeMm}
                  opacity={item.opacity}
                />
              );
            case "line":
              return <line key={i} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke={item.stroke} strokeWidth={item.strokeMm} opacity={item.opacity} />;
            case "image": {
              const src = images.get(item.sourceId);
              if (!src) return null;
              const need = (item.dest.w / Math.max(0.0001, item.clip.w)) * item.clip.w * pxPerMm;
              const url = images.previewUrl(item.sourceId, Math.min(2400, Math.max(160, need)));
              const fid = isNeutral(item.filter) ? undefined : filterIds.get(filterKey(item));
              return (
                <g key={i} clipPath={`url(#c${uid}${i})`} opacity={item.opacity}>
                  {url ? (
                    <image href={url} x={item.dest.x} y={item.dest.y} width={item.dest.w} height={item.dest.h} preserveAspectRatio="none" filter={fid ? `url(#${fid})` : undefined} />
                  ) : (
                    <rect x={item.clip.x} y={item.clip.y} width={item.clip.w} height={item.clip.h} fill="#8883" />
                  )}
                </g>
              );
            }
            case "text": {
              const size = ptToMm(item.sizePt);
              return (
                <Fragment key={i}>
                  {item.segments.map((seg, k) => (
                    <text
                      key={k}
                      x={seg.x}
                      y={item.y}
                      fontFamily={`'${item.font.cssFamily}', sans-serif`}
                      fontSize={size}
                      fontWeight={item.font.bold ? 700 : 400}
                      fontStyle={item.font.italic ? "italic" : "normal"}
                      letterSpacing={ptToMm(item.trackingPt)}
                      fill={item.color}
                      opacity={item.opacity}
                      xmlSpace="preserve"
                    >
                      {seg.text}
                    </text>
                  ))}
                </Fragment>
              );
            }
          }
        })}
        {placeholders?.map((r, i) => (
          <rect key={`ph${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="#8881" stroke="#888" strokeWidth={0.35} strokeDasharray="2 1.5" />
        ))}
      </g>
      {overlay}
    </svg>
  );
}
