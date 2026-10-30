import { useEffect } from "react";
import type { PlayerView } from "@engine/types/playerView.js";
import { bidLabel } from "../lib/faceNames.js";
import { useSound } from "../audio/SoundProvider.js";
import { useTypewriter } from "../hooks/useTypewriter.js";
import { prefersReducedMotion } from "../lib/motion.js";

export interface CurrentBidCardProps {
  bid: { quantity: number; face: 1 | 2 | 3 | 4 | 5 | 6 } | null;
  bidderName: string | null;
  /** Whoever acts next; "You" when it's the player. */
  actorName: string;
  /** Type the bid out instead of showing it at once; `onTyped` fires when it's finished. */
  typing?: boolean;
  onTyped?: () => void;
  /** A short status line across the top of the card, e.g. who is thinking. */
  status?: string | null;
  /** The shorter phone layout, sized to its content rather than filling a row. */
  compact?: boolean;
}

function nextMoveHint(hasBid: boolean, actorName: string): string {
  const isYou = actorName === "You";
  if (!hasBid) return isYou ? "You open the bidding this round." : `${actorName} opens the bidding this round.`;
  return isYou ? "Raise it, or call the bluff." : `${actorName} to raise or call.`;
}

export function CurrentBidCard({
  bid,
  bidderName,
  actorName,
  typing = false,
  onTyped,
  status = null,
  compact = false,
}: CurrentBidCardProps) {
  const label = bid ? bidLabel(bid.quantity, bid.face) : "";
  const shownLabel = useTypewriter(label, typing && bid !== null, () => onTyped?.());
  // Keystrokes while the bid types out, stopping as the last character appears.
  const { startLoop } = useSound();
  const typingOut = typing && bid !== null && shownLabel.length < label.length && !prefersReducedMotion();
  useEffect(() => (typingOut ? startLoop("typing") : undefined), [typingOut, startLoop]);
  const hint = nextMoveHint(bid !== null, actorName);
  // Screen readers get the finished bid once rather than every typed character.
  const announcement = typing
    ? ""
    : bid
      ? `Current bid${bidderName ? ` by ${bidderName}` : ""}: ${label}. ${hint}`
      : `No bid yet. ${hint}`;

  return (
    <div
      style={{
        position: "relative",
        flex: compact ? "none" : 1.3,
        minWidth: 0,
        background: "var(--parchment)",
        border: `${compact ? 5 : 6}px solid var(--parchment-border)`,
        borderRadius: 6,
        padding: compact ? "20px 14px 10px" : "18px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: compact ? 3 : 6,
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      <span
        role="status"
        style={{
          position: "absolute",
          top: compact ? 5 : 14,
          left: compact ? 14 : 22,
          right: compact ? 14 : 22,
          fontSize: compact ? 11 : 13,
          fontStyle: "italic",
          color: "#7A6A4E",
        }}
      >
        {status ?? ""}
      </span>
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7A6A4E" }}>
        Current bid{bidderName ? ` · ${bidderName}` : ""}
      </span>
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {bid ? (
        <span
          aria-hidden={typing}
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: compact ? 28 : 38, color: "var(--ink)" }}
        >
          {shownLabel}
          {typing && <span className="typing-caret">|</span>}
        </span>
      ) : (
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "var(--ink)", opacity: 0.75 }}>
          No bid yet
        </span>
      )}
      <span style={{ fontSize: 13, color: "#7A6A4E", fontStyle: "italic", visibility: typing ? "hidden" : "visible" }}>
        {hint}
      </span>
    </div>
  );
}

export interface BidHistoryCardProps {
  history: PlayerView["bidHistory"];
}

export function BidHistoryCard({ history }: BidHistoryCardProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "var(--panel-bg)",
        border: "1px solid var(--panel-border)",
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflowY: "auto",
      }}
    >
      <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#E7D9B8" }}>This round</span>
      {history.length === 0 ? (
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>No bids yet.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.map((record, i) => {
            const isLatest = i === history.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: isLatest ? 15 : 14,
                  color: isLatest ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: isLatest ? 700 : 400,
                }}
              >
                <span>{record.bidder.name}</span>
                <span>{bidLabel(record.bid.quantity, record.bid.face)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
