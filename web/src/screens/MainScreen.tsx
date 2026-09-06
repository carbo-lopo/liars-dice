import type { Face, PlayerView } from "@engine/types.js";
import type { BidContext } from "@engine/engine/bidding.js";
import { TableFrame } from "../components/TableFrame.js";
import { OpponentPanel } from "../components/OpponentPanel.js";
import { CurrentBidCard, BidHistoryCard } from "../components/BidCards.js";
import { HandRow } from "../components/HandRow.js";
import { ActionBar } from "../components/ActionBar.js";
import { PalificoIcon } from "../components/PalificoIcon.js";
import { QuitButton } from "../components/QuitButton.js";
import { useState } from "react";

const PERSONALITY_ACCENT: Record<string, string> = {
  cautious: "rgba(47, 122, 102, 0.55)",
  aggressive: "rgba(154, 74, 47, 0.55)",
  unpredictable: "rgba(122, 47, 122, 0.55)",
};

export interface MainScreenProps {
  view: PlayerView;
  isYourTurn: boolean;
  awaitingContinue: boolean;
  error: string | null;
  onPlaceBid: (bid: { quantity: number; face: Face }) => void;
  onChallenge: () => void;
  onContinueBotAction: () => void;
  onQuit: () => void;
}

export function MainScreen({
  view,
  isYourTurn,
  awaitingContinue,
  error,
  onPlaceBid,
  onChallenge,
  onContinueBotAction,
  onQuit,
}: MainScreenProps) {
  const [selectedFace, setSelectedFace] = useState<Face | null>(view.currentBid?.face ?? null);

  const nameFor = (playerId: string): string => {
    if (playerId === view.selfId) return view.self.name;
    return view.others.find((o) => o.id === playerId)?.name ?? playerId;
  };

  const ctx: BidContext = {
    totalDiceInPlay: view.totalDiceInPlay,
    isPalificoRound: view.isPalificoRound,
    palificoFace: view.palificoFace,
  };

  const bidderName = view.bidHistory.length > 0 ? nameFor(view.bidHistory[view.bidHistory.length - 1]!.playerId) : null;
  const actorName = nameFor(view.currentPlayerId);

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
            Round {view.roundNumber}
          </span>
          <QuitButton onClick={onQuit} />
        </div>
      </div>

      {view.isPalificoRound && (
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
              {view.palificoFace
                ? `, every bid stays on that starter's face`
                : " — the starter's opening bid sets the locked face"}
              .
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        {view.others.map((o) => (
          <OpponentPanel
            key={o.id}
            name={o.name}
            personality={personalityFor(o.id)}
            diceCount={o.diceCount}
            eliminated={o.eliminated}
            isCurrentTurn={view.currentPlayerId === o.id}
            accent={PERSONALITY_ACCENT[personalityFor(o.id)]}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        <CurrentBidCard bid={view.currentBid} bidderName={bidderName} />
        <BidHistoryCard history={view.bidHistory} nameFor={nameFor} />
      </div>

      <HandRow dice={view.self.dice} selectedFace={selectedFace} onesWild={!view.isPalificoRound} />

      {error && (
        <div style={{ color: "var(--text-primary)", background: "rgba(154,58,44,0.5)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {isYourTurn ? (
        <ActionBar
          currentBid={view.currentBid}
          ctx={ctx}
          canChallenge={view.currentBid !== null}
          disabled={false}
          onPlaceBid={onPlaceBid}
          onChallenge={onChallenge}
          onFaceChange={setSelectedFace}
        />
      ) : awaitingContinue ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" onClick={onContinueBotAction} style={continueButtonStyle}>
            Continue
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
          Waiting on {actorName}&hellip;
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

function personalityFor(playerId: string): string {
  // PlayerView's OpponentView intentionally doesn't carry personality (it's
  // not something a bot's own decision-making should see), but the two
  // seats are fixed for this single-player build, so the UI can label them
  // as flavor text without the engine exposing anything gameplay-relevant.
  if (playerId === "cora") return "cautious";
  if (playerId === "duke") return "aggressive";
  return "";
}
