import type { DestinationTheme, ThemePalette } from "./types";

type Scene = "hills" | "coast" | "peaks" | "forest";

function sceneFor(theme: DestinationTheme): Scene {
  const d = theme.decorations;
  if (d.includes("waves") || d.includes("sun")) return "coast";
  if (d.includes("peaks") || d.includes("pines")) return "peaks";
  if (d.includes("fern") || d.includes("falls")) return "forest";
  return "hills";
}

/**
 * A layered, palette-driven landscape used wherever destination photography
 * or a user photo is unavailable. It is decorative, so it is hidden from
 * assistive technology; callers provide surrounding text.
 */
export function ThemeIllustration({
  theme,
  palette,
  className,
}: {
  theme: DestinationTheme;
  palette: ThemePalette;
  className?: string;
}) {
  const scene = sceneFor(theme);
  const sky = palette.secondary;
  const far = palette.accent;
  const near = palette.primary;
  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
      focusable={false}
    >
      <rect width="800" height="500" fill={sky} />
      {scene === "coast" ? (
        <>
          <circle cx="560" cy="250" r="90" fill={far} opacity={0.55} />
          <rect y="300" width="800" height="200" fill={near} opacity={0.85} />
          {[320, 345, 372, 402].map((y, i) => (
            <path
              key={y}
              d={`M0 ${y} Q 100 ${y - 8} 200 ${y} T 400 ${y} T 600 ${y} T 800 ${y}`}
              stroke={palette.surface}
              strokeWidth={2}
              fill="none"
              opacity={0.45 - i * 0.08}
            />
          ))}
          <path d="M0 460 Q 300 420 800 450 V500 H0 Z" fill={palette.surface} opacity={0.75} />
        </>
      ) : scene === "peaks" ? (
        <>
          <path d="M0 330 L150 170 L230 250 L360 90 L480 230 L560 160 L700 280 L800 220 V500 H0 Z" fill={far} opacity={0.5} />
          <path d="M330 125 L360 90 L392 132 L368 122 Z" fill={palette.surface} opacity={0.9} />
          <path d="M0 400 L120 300 L240 380 L380 270 L520 370 L660 300 L800 380 V500 H0 Z" fill={near} opacity={0.85} />
          {Array.from({ length: 14 }, (_, i) => {
            const x = 20 + i * 58;
            const h = 50 + ((i * 17) % 40);
            return <path key={i} d={`M${x} 500 L${x} ${470 - h} L${x - 18} 480 Z M${x} ${470 - h} L${x + 18} 480 Z`} fill={palette.ink} opacity={0.35} />;
          })}
        </>
      ) : scene === "forest" ? (
        <>
          <path d="M0 260 Q 200 180 400 230 T 800 210 V500 H0 Z" fill={far} opacity={0.45} />
          <rect x="520" y="150" width="10" height="260" fill={palette.surface} opacity={0.6} />
          <rect x="536" y="150" width="5" height="260" fill={palette.surface} opacity={0.4} />
          <path d="M0 340 Q 180 280 380 330 T 800 300 V500 H0 Z" fill={near} opacity={0.8} />
          <path d="M0 430 Q 260 380 520 420 T 800 410 V500 H0 Z" fill={palette.ink} opacity={0.3} />
        </>
      ) : (
        <>
          <path d="M0 250 Q 180 160 360 220 T 800 180 V500 H0 Z" fill={far} opacity={0.4} />
          <path d="M0 330 Q 220 250 440 300 T 800 280 V500 H0 Z" fill={near} opacity={0.75} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M0 ${370 + i * 20} Q 220 ${330 + i * 20} 440 ${360 + i * 20} T 800 ${345 + i * 20}`}
              stroke={palette.surface}
              strokeWidth={1.5}
              fill="none"
              opacity={0.28}
            />
          ))}
          <rect y="200" width="800" height="40" fill={palette.surface} opacity={0.25} />
        </>
      )}
    </svg>
  );
}
