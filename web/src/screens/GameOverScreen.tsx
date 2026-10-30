import type { GameResult } from "../hooks/useGame.js";
import { TableFrame } from "../components/TableFrame.js";
import { usePhoneLayout } from "../hooks/usePhoneLayout.js";
import { conjugate } from "../lib/grammar.js";

export interface GameOverScreenProps {
  result: GameResult;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverScreen({ result, onPlayAgain, onMainMenu }: GameOverScreenProps) {
  const phone = usePhoneLayout();
  const { winnerName, youWon, loserNames } = result;
  const others = loserNames.join(" and ");
  const losersVerb = loserNames.length === 1 && loserNames[0] !== "You" ? "is" : "are";

  return (
    <TableFrame>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
        }}
      >
        <svg width="72" height="62" viewBox="0 0 70 60">
          <polygon
            points="10,46 10,20 25,33 35,10 45,33 60,20 60,46"
            fill="#D9B84A"
            stroke="#8A6E1E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="8" y="46" width="54" height="9" rx="2.5" fill="#D9B84A" stroke="#8A6E1E" strokeWidth="2" />
          <circle cx="35" cy="16" r="3.5" fill="#F3E9D2" />
          <circle cx="15" cy="26" r="3" fill="#F3E9D2" />
          <circle cx="55" cy="26" r="3" fill="#F3E9D2" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 44,
              color: "var(--text-primary)",
              textAlign: "center",
            }}
          >
            {winnerName} {conjugate(youWon, "win")} the game!
          </span>
          <span style={{ fontSize: 16, color: "var(--text-secondary)", textAlign: "center" }}>
            {others} {losersVerb} out of dice.
          </span>
        </div>

        <div
          style={{
            background: "var(--parchment)",
            border: "5px solid var(--parchment-border)",
            borderRadius: 6,
            padding: "14px 28px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
            Won in Round {result.finalRound + 1}
          </span>
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          style={{
            background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
            color: "var(--ink)",
            border: "1px solid var(--gold-border)",
            borderRadius: 8,
            padding: "14px 34px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Play Again
        </button>

        <button
          type="button"
          onClick={onMainMenu}
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            fontSize: 14,
            textDecoration: "underline",
            cursor: "pointer",
            // Still reads as a link, with room around it to tap on a phone.
            ...(phone && { minHeight: 44, padding: "0 16px" }),
          }}
        >
          Main Menu
        </button>
      </div>
    </TableFrame>
  );
}
