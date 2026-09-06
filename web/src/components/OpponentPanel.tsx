import { Die } from "./Die.js";

export interface OpponentPanelProps {
  name: string;
  personality?: string;
  diceCount: number;
  eliminated: boolean;
  isCurrentTurn: boolean;
  accent?: string;
}

export function OpponentPanel({
  name,
  personality,
  diceCount,
  eliminated,
  isCurrentTurn,
  accent,
}: OpponentPanelProps) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--panel-bg)",
        border: `1px solid ${isCurrentTurn ? "var(--gold)" : (accent ?? "var(--panel-border)")}`,
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        opacity: eliminated ? 0.45 : 1,
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--text-primary)",
            }}
          >
            {name}
          </span>
          {personality && (
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-secondary)",
              }}
            >
              {personality}
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {eliminated ? "Out of dice" : `${diceCount} ${diceCount === 1 ? "die" : "dice"}`}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, minHeight: 28 }}>
        {!eliminated && Array.from({ length: diceCount }).map((_, i) => <Die key={i} faceDown size={28} />)}
      </div>
    </div>
  );
}
