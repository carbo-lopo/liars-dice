import type { BidRecord } from "@engine/types.js";
import { bidLabel } from "../lib/faceNames.js";

export interface CurrentBidCardProps {
  bid: { quantity: number; face: 1 | 2 | 3 | 4 | 5 | 6 } | null;
  bidderName: string | null;
}

export function CurrentBidCard({ bid, bidderName }: CurrentBidCardProps) {
  return (
    <div
      style={{
        flex: 1.3,
        minWidth: 0,
        background: "var(--parchment)",
        border: "6px solid var(--parchment-border)",
        borderRadius: 6,
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7A6A4E" }}>
        Current bid{bidderName ? ` · ${bidderName}` : ""}
      </span>
      {bid ? (
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 38, color: "var(--ink)" }}>
          {bidLabel(bid.quantity, bid.face)}
        </span>
      ) : (
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "var(--ink)", opacity: 0.75 }}>
          No bid yet
        </span>
      )}
      <span style={{ fontSize: 13, color: "#7A6A4E", fontStyle: "italic" }}>
        {bid ? "Raise it, or call the bluff." : "You open the bidding this round."}
      </span>
    </div>
  );
}

export interface BidHistoryCardProps {
  history: BidRecord[];
  nameFor: (playerId: string) => string;
}

export function BidHistoryCard({ history, nameFor }: BidHistoryCardProps) {
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
                <span>{nameFor(record.playerId)}</span>
                <span>{bidLabel(record.bid.quantity, record.bid.face)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
