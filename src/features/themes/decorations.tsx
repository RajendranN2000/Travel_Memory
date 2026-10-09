import type { ComponentType, SVGProps } from "react";
import type { DecorationKey, DestinationTheme } from "./types";

type DecorationProps = SVGProps<SVGSVGElement>;

const base: DecorationProps = {
  "aria-hidden": true,
  focusable: false,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function TeaRows(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 80" strokeWidth={1.4} {...base} {...props}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M0 ${70 - i * 9} C 60 ${52 - i * 9}, 120 ${78 - i * 9}, 240 ${50 - i * 9}`} opacity={1 - i * 0.12} />
      ))}
    </svg>
  );
}

function MistLines(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 60" strokeWidth={1.2} {...base} {...props}>
      <path d="M10 18 C 50 10, 90 26, 140 16 S 210 12, 232 18" opacity={0.7} />
      <path d="M30 34 C 70 26, 120 42, 170 32 S 220 30, 236 34" opacity={0.5} />
      <path d="M4 50 C 44 44, 94 56, 140 48 S 200 46, 228 50" opacity={0.35} />
    </svg>
  );
}

function Waves(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 60" strokeWidth={1.6} {...base} {...props}>
      {[0, 1, 2].map((row) => (
        <path
          key={row}
          d={`M0 ${16 + row * 16} ${"q 15 -8 30 0 ".repeat(8).trim()}`}
          transform={`translate(${row % 2 === 0 ? 0 : -15} 0)`}
          opacity={1 - row * 0.25}
        />
      ))}
    </svg>
  );
}

function Sun(props: DecorationProps) {
  return (
    <svg viewBox="0 0 120 120" strokeWidth={1.4} {...base} {...props}>
      <circle cx="60" cy="60" r="30" />
      {[72, 80, 88, 96].map((y, i) => (
        <path key={y} d={`M${18 + i * 4} ${y} H${102 - i * 4}`} opacity={0.8 - i * 0.15} />
      ))}
    </svg>
  );
}

function Palm(props: DecorationProps) {
  return (
    <svg viewBox="0 0 120 140" strokeWidth={1.5} {...base} {...props}>
      <path d="M62 136 C 60 100, 58 70, 64 40" />
      <path d="M64 40 C 44 30, 24 34, 8 50" />
      <path d="M64 40 C 52 22, 36 14, 18 14" />
      <path d="M64 40 C 70 20, 84 10, 102 10" />
      <path d="M64 40 C 86 32, 104 38, 116 56" />
      <path d="M64 40 C 72 52, 76 66, 74 82" />
    </svg>
  );
}

function FogBands(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 70" strokeWidth={6} {...base} {...props}>
      <path d="M8 16 H150" opacity={0.18} />
      <path d="M60 32 H232" opacity={0.14} />
      <path d="M20 48 H180" opacity={0.1} />
      <path d="M90 62 H220" opacity={0.08} />
    </svg>
  );
}

function Fern(props: DecorationProps) {
  return (
    <svg viewBox="0 0 80 160" strokeWidth={1.4} {...base} {...props}>
      <path d="M40 156 C 40 110, 38 60, 44 6" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 140 - i * 15;
        const len = 30 - i * 2.6;
        return (
          <g key={i}>
            <path d={`M${40 + i * 0.4} ${y} C ${34 - len * 0.4} ${y - 6}, ${36 - len} ${y - 4}, ${38 - len} ${y - 12}`} />
            <path d={`M${40 + i * 0.4} ${y} C ${46 + len * 0.4} ${y - 6}, ${44 + len} ${y - 4}, ${42 + len} ${y - 12}`} />
          </g>
        );
      })}
    </svg>
  );
}

function Falls(props: DecorationProps) {
  return (
    <svg viewBox="0 0 80 160" strokeWidth={1.3} {...base} {...props}>
      {[18, 30, 42, 54, 64].map((x, i) => (
        <path key={x} d={`M${x} 4 C ${x - 4} 50, ${x + 4} 100, ${x - 2} 156`} opacity={0.9 - i * 0.12} />
      ))}
    </svg>
  );
}

function Peaks(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 80" strokeWidth={1.5} {...base} {...props}>
      <path d="M0 76 L40 34 L58 50 L96 8 L130 46 L150 30 L186 62 L210 44 L240 76" />
      <path d="M86 20 L96 8 L106 22 L98 18 Z" opacity={0.6} />
      <path d="M0 76 H240" opacity={0.4} />
    </svg>
  );
}

function Pines(props: DecorationProps) {
  return (
    <svg viewBox="0 0 240 70" strokeWidth={1.4} {...base} {...props}>
      {[12, 40, 62, 96, 124, 150, 182, 210, 232].map((x, i) => {
        const h = 30 + ((i * 13) % 26);
        return <path key={x} d={`M${x} 66 V${66 - h} M${x - 9} ${66 - h * 0.35} L${x} ${66 - h} L${x + 9} ${66 - h * 0.35}`} />;
      })}
    </svg>
  );
}

const decorations: Record<DecorationKey, ComponentType<DecorationProps>> = {
  "tea-rows": TeaRows,
  "mist-lines": MistLines,
  waves: Waves,
  sun: Sun,
  palm: Palm,
  "fog-bands": FogBands,
  fern: Fern,
  falls: Falls,
  peaks: Peaks,
  pines: Pines,
};

/** Renders one of the theme's decorative motifs. `index` picks which one. */
export function ThemeDecoration({
  theme,
  index = 0,
  ...props
}: DecorationProps & { theme: DestinationTheme; index?: number }) {
  const key = theme.decorations[index % Math.max(theme.decorations.length, 1)];
  const Component = key ? decorations[key] : MistLines;
  return <Component {...props} />;
}
