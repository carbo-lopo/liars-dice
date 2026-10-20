import type { Face } from "@engine/types.js";
import { TableFrame } from "../components/TableFrame.js";
import { Die } from "../components/Die.js";

export interface StartScreenProps {
  onPlay: () => void;
  onRules: () => void;
}

const DECORATIVE_DICE: { face: Face; rotate: number }[] = [
  { face: 5, rotate: -8 },
  { face: 2, rotate: 5 },
  { face: 6, rotate: -3 },
  { face: 1, rotate: 9 },
  { face: 4, rotate: -6 },
];

export function StartScreen({ onPlay, onRules }: StartScreenProps) {
  return (
    <TableFrame>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {DECORATIVE_DICE.map((d, i) => (
            <div key={i} style={{ transform: `rotate(${d.rotate}deg)` }}>
              <Die face={d.face} size={46} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 56,
              color: "var(--text-primary)",
              textAlign: "center",
            }}
          >
            Liar&rsquo;s Dice
          </span>
          <span style={{ fontSize: 16, color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center" }}>
            Bluff, bid, and call the liar. Last one with dice wins.
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220 }}>
          <button type="button" onClick={onPlay} style={primaryButtonStyle}>
            Play
          </button>
          <button type="button" onClick={onRules} style={secondaryButtonStyle}>
            Rules
          </button>
        </div>
      </div>
    </TableFrame>
  );
}

const primaryButtonStyle = {
  background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
  color: "var(--ink)",
  border: "1px solid var(--gold-border)",
  borderRadius: 8,
  padding: "14px 0",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 17,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  background: "var(--panel-bg)",
  color: "var(--text-primary)",
  border: "1px solid var(--panel-border)",
  borderRadius: 8,
  padding: "14px 0",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 17,
  cursor: "pointer",
} as const;
