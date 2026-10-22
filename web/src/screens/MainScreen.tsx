import type { Face } from "@engine/types/face.js";
import type { PlayerView } from "@engine/types/playerView.js";
import type { OpponentSeat } from "../hooks/useGame.js";
import { TableFrame } from "../components/TableFrame.js";
import { OpponentPanel } from "../components/OpponentPanel.js";
import { CurrentBidCard, BidHistoryCard } from "../components/BidCards.js";
import { HandRow } from "../components/HandRow.js";
import { ActionBar } from "../components/ActionBar.js";
import { PalificoIcon } from "../components/PalificoIcon.js";
import { HeaderButton } from "../components/HeaderButton.js";
import { useState } from "react";

const PERSONALITY_ACCENT: Record<string, string> = {
  cautious: "rgba(47, 122, 102, 0.55)",
  aggressive: "rgba(154, 74, 47, 0.55)",
  unpredictable: "rgba(122, 47, 122, 0.55)",
};

export interface MainScreenProps {
  view: PlayerView;
  opponents: OpponentSeat[];
  isYourTurn: boolean;
  awaitingContinue: boolean;
  thinkingBot: string | null;
  rolling: boolean;
  typingBid: boolean;
  error: string | null;
  onPlaceBid: (bid: { quantity: number; face: Face }) => void;
  onCall: () => void;
  onContinueBotAction: () => void;
  onBidTyped: () => void;
  onRolled: () => void;
  onQuit: () => void;
  onRules: () => void;
}

export function MainScreen({
  view,
  opponents,
  isYourTurn,
  awaitingContinue,
  thinkingBot,
  rolling,
  typingBid,
  error,
  onPlaceBid,
  onCall,
  onContinueBotAction,
  onBidTyped,
  onRolled,
  onQuit,
  onRules,
}: MainScreenProps) {
  const [selectedFace, setSelectedFace] = useState<Face | null>(view.currentBid?.face ?? null);

  const bidderName = view.bidHistory.at(-1)?.bidder.name ?? null;
  // A new bid joins the round's history only once it has finished typing out.
  const shownHistory = typingBid ? view.bidHistory.slice(0, -1) : view.bidHistory;
  // On your turn the hand previews the face you're considering; otherwise it shows the bid on the table.
  const highlightFace = isYourTurn ? selectedFace : (shownHistory.at(-1)?.bid.face ?? null);
  const actorName = view.turnOrder[0]?.name ?? "";

  return (
    <TableFrame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)" }}>
          Liar&rsquo;s Dice
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              background: "rgba(0,0,0,0.25)",
              color: "#E7D9B8",
              fontSize: 13,
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid var(--panel-border)",
            }}
          >
            Round {view.roundNumber + 1}
          </span>
          <HeaderButton onClick={onRules}>Rules</HeaderButton>
          <HeaderButton onClick={onQuit}>Quit Game</HeaderButton>
        </div>
      </div>

      {view.isPalifico && (
        <div
          style={{
            background: "linear-gradient(rgba(154,58,44,0.6), rgba(122,44,32,0.6))",
            border: "2px solid var(--gold)",
            borderRadius: 10,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            animation: "palifico-pulse 2.2s ease-in-out infinite",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              borderRadius: 8,
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PalificoIcon size={30} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "0.02em",
                color: "var(--text-primary)",
                textTransform: "uppercase",
              }}
            >
              Palifico Round
            </span>
            <span style={{ fontSize: 13, color: "#F0D9C9" }}>
              No wild Aces this round
              {view.currentBid
                ? `, every bid stays on that starter's face`
                : " — the starter's opening bid sets the locked face"}
              .
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        {opponents.map((o) => (
          <OpponentPanel
            key={o.name}
            name={o.name}
            personality={o.strategyLabel}
            diceCount={o.diceCount}
            eliminated={o.eliminated}
            isCurrentBidder={bidderName === o.name}
            accent={PERSONALITY_ACCENT[o.strategyId]}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        <CurrentBidCard
          bid={view.currentBid}
          bidderName={bidderName}
          actorName={actorName}
          typing={typingBid}
          onTyped={onBidTyped}
          status={rolling ? "Rolling…" : thinkingBot ? `${thinkingBot} is thinking…` : null}
        />
        <BidHistoryCard history={shownHistory} />
      </div>

      <HandRow
        dice={view.hand}
        selectedFace={highlightFace}
        onesWild={!view.isPalifico}
        rolling={rolling}
        onRolled={onRolled}
      />

      {error && (
        <div role="alert" style={{ color: "var(--text-primary)", background: "rgba(154,58,44,0.5)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {isYourTurn ? (
        <ActionBar
          rules={view}
          canCall={view.currentBid !== null}
          disabled={false}
          onPlaceBid={onPlaceBid}
          onCall={onCall}
          onFaceChange={setSelectedFace}
        />
      ) : (
        // Rendered even while a bot moves, with the button hidden, so the board doesn't shift when Continue appears.
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="button"
            onClick={onContinueBotAction}
            disabled={!awaitingContinue}
            style={{ ...continueButtonStyle, visibility: awaitingContinue ? "visible" : "hidden" }}
          >
            Continue
          </button>
        </div>
      )}
    </TableFrame>
  );
}

const continueButtonStyle = {
  background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
  color: "var(--ink)",
  border: "1px solid var(--gold-border)",
  borderRadius: 8,
  padding: "12px 24px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
} as const;
