import { Die } from "./Die.js";

export interface OpponentPanelProps {
  name: string;
  personality?: string;
  diceCount: number;
  eliminated: boolean;
  /** True when this opponent placed the bid currently shown in the Current Bid
   * card -- highlighting the bidder (rather than whoever acts next) is what
   * matches the eye to the bid actually on the table. */
  isCurrentBidder: boolean;
  accent?: string;
  /** The narrower phone layout: smaller dice, with the personality on its own line. */
  compact?: boolean;
}

export function OpponentPanel({
  name,
  personality,
  diceCount,
  eliminated,
  isCurrentBidder,
  accent,
  compact = false,
}: OpponentPanelProps) {
  const diceLabel = eliminated ? "Out of dice" : `${diceCount} ${diceCount === 1 ? "die" : "dice"}`;
  if (compact) {
    return (
      <div
        style={{
          minWidth: 0,
          background: "var(--panel-bg)",
          border: `1px solid ${isCurrentBidder ? "var(--gold)" : (accent ?? "var(--panel-border)")}`,
          // A heavier ring for the bidder, drawn inside so the panel's contents don't shift as the bid moves around.
          boxShadow: isCurrentBidder ? "inset 0 0 0 1px var(--gold)" : undefined,
          borderRadius: 10,
          padding: "6px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          opacity: eliminated ? 0.45 : 1,
          transition: "border-color 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            {name}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{diceLabel}</span>
        </div>
        {personality && (
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-secondary)",
              marginTop: -4,
            }}
          >
            {personality}
          </span>
        )}
        <div style={{ display: "flex", gap: 3, minHeight: 16 }}>
          {!eliminated && Array.from({ length: diceCount }).map((_, i) => <Die key={i} faceDown size={16} decorative />)}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        flex: 1,
        background: "var(--panel-bg)",
        border: `1px solid ${isCurrentBidder ? "var(--gold)" : (accent ?? "var(--panel-border)")}`,
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
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{diceLabel}</span>
      </div>
      <div style={{ display: "flex", gap: 6, minHeight: 28 }}>
        {!eliminated && Array.from({ length: diceCount }).map((_, i) => <Die key={i} faceDown size={28} decorative />)}
      </div>
    </div>
  );
}
