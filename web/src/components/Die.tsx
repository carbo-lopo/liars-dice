import type { Face } from "@engine/types/face.js";
import { faceName, singularFaceName } from "../lib/faceNames.js";

// 3x3 pip grid, indices 0-8 left-to-right/top-to-bottom.
const PIP_LAYOUTS: Record<Face, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export interface DieProps {
  face?: Face;
  faceDown?: boolean;
  size?: number;
  /** The face this die counts toward; the die gets a gold ring and says so in its label. */
  countsToward?: Face;
  /** Hide from assistive technology when nearby text already conveys the information. */
  decorative?: boolean;
  /** Still being rolled: the face shown is not the die's value yet. */
  spinning?: boolean;
  /** Faded, e.g. a revealed die that doesn't count toward the bid. */
  dimmed?: boolean;
  className?: string;
}

function accessibilityProps(label: string, decorative: boolean) {
  return decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label };
}

export function Die({
  face,
  faceDown = false,
  size = 50,
  countsToward,
  decorative = false,
  spinning = false,
  dimmed = false,
  className,
}: DieProps) {
  const highlighted = countsToward !== undefined;
  const radius = Math.round(size * 0.16);

  if (faceDown || face === undefined) {
    return (
      <div
        {...accessibilityProps("Hidden die", decorative)}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          flexShrink: 0,
          background:
            "repeating-linear-gradient(45deg, var(--die-back), var(--die-back) 5px, var(--die-back-dark) 5px, var(--die-back-dark) 9px)",
          border: "2px solid var(--die-back-dark)",
          boxShadow: highlighted ? "0 0 0 3px var(--gold)" : undefined,
        }}
      />
    );
  }

  const pipSize = Math.max(4, Math.round(size * 0.16));
  const active = new Set(PIP_LAYOUTS[face]);

  const label = spinning
    ? "Rolling die"
    : countsToward === undefined
      ? singularFaceName(face)
      : `${singularFaceName(face)}, counts toward ${faceName(countsToward)}`;

  return (
    <div
      {...accessibilityProps(label, decorative)}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        opacity: dimmed ? 0.5 : undefined,
        background: "linear-gradient(var(--die-face-top), var(--die-face-bottom))",
        border: "1px solid var(--die-shadow)",
        boxShadow: highlighted
          ? `0 0 0 3px var(--gold), 0 ${Math.round(size * 0.06)}px 0 var(--die-shadow), 0 ${Math.round(size * 0.1)}px ${Math.round(size * 0.16)}px rgba(0,0,0,0.35)`
          : `0 ${Math.round(size * 0.06)}px 0 var(--die-shadow), 0 ${Math.round(size * 0.1)}px ${Math.round(size * 0.16)}px rgba(0,0,0,0.35)`,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        padding: Math.round(size * 0.14),
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: pipSize,
            height: pipSize,
            borderRadius: "50%",
            justifySelf: "center",
            alignSelf: "center",
            background: active.has(i) ? "var(--die-pip)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}
