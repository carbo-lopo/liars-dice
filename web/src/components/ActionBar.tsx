import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { isValidRaise, type BiddingRules } from "@engine/rules/bidding.js";
import type { Bid } from "@engine/types/bid.js";
import type { Face } from "@engine/types/face.js";
import { faceName } from "../lib/faceNames.js";

const ALL_FACES: Face[] = [1, 2, 3, 4, 5, 6];

/** Smallest legal quantity for a bid on `face`, found by asking the engine's own validator. */
function minQuantityForFace(rules: BiddingRules, face: Face): number {
  if (!rules.currentBid) return 1;
  const ceiling = rules.totalDiceInPlay * 8;
  for (let q = 1; q <= ceiling; q++) {
    if (isValidRaise(rules, { quantity: q, face }).valid) return q;
  }
  return rules.currentBid.quantity + 1;
}

/** In a Palifico round the opening bid's face is locked for the rest of the round. */
function lockedFaceOf(rules: BiddingRules): Face | null {
  return rules.isPalifico ? (rules.currentBid?.face ?? null) : null;
}

export interface ActionBarProps {
  rules: BiddingRules;
  canCall: boolean;
  disabled: boolean;
  onPlaceBid: (bid: Bid) => void;
  onCall: () => void;
  onFaceChange?: (face: Face) => void;
}

export function ActionBar({
  rules,
  canCall,
  disabled,
  onPlaceBid,
  onCall,
  onFaceChange,
}: ActionBarProps) {
  const { currentBid } = rules;
  const lockedFace = lockedFaceOf(rules);
  const facesAvailable: Face[] = lockedFace !== null ? [lockedFace] : ALL_FACES;
  const defaultFace = (): Face => lockedFace ?? currentBid?.face ?? 2;

  const [selectedFace, setSelectedFace] = useState<Face>(defaultFace());
  const [quantity, setQuantity] = useState<number>(() => minQuantityForFace(rules, defaultFace()));

  // Re-anchor whenever the underlying bid situation actually changes (a new
  // bid landed, a new round started, Palifico kicked in, etc.) -- not on
  // every render, since the user's own face/qty picks should stick around
  // while they're still deciding.
  const bidKey = `${currentBid?.quantity ?? "-"}:${currentBid?.face ?? "-"}:${rules.isPalifico}`;
  useEffect(() => {
    const face = defaultFace();
    setSelectedFace(face);
    setQuantity(minQuantityForFace(rules, face));
    onFaceChange?.(face);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidKey]);

  const minQty = minQuantityForFace(rules, selectedFace);

  const handleFaceClick = (face: Face) => {
    if (disabled || !facesAvailable.includes(face)) return;
    setSelectedFace(face);
    setQuantity(minQuantityForFace(rules, face));
    onFaceChange?.(face);
  };

  const showAceNote =
    !!currentBid && !rules.isPalifico && (selectedFace === 1) !== (currentBid.face === 1);
  const aceNoteDetail = currentBid && selectedFace === 1 ? "halved, rounded up" : "doubled, plus one";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {showAceNote && currentBid && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "rgba(0,0,0,0.28)",
              color: "var(--text-primary)",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--panel-border)",
            }}
          >
            {selectedFace === 1 ? "If you bid Aces" : "Switching off Aces"}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
            Aces are wild &mdash; the minimum resets when you switch ({aceNoteDetail}).
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--panel-bg)",
              border: "2px solid var(--gold)",
              borderRadius: 8,
              padding: "9px 10px",
            }}
          >
            <button
              type="button"
              disabled={disabled || quantity <= minQty}
              onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
              style={stepperButtonStyle}
            >
              &minus;
            </button>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Qty</span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text-primary)",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {quantity}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setQuantity((q) => q + 1)}
              style={stepperButtonStyle}
            >
              &#43;
            </button>
          </div>
          <span style={{ fontSize: 10, color: "var(--gold)", textAlign: "center" }}>min. {minQty}</span>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {ALL_FACES.map((face) => {
            const available = facesAvailable.includes(face);
            const isSelected = face === selectedFace;
            return (
              <button
                key={face}
                type="button"
                disabled={disabled || !available}
                onClick={() => handleFaceClick(face)}
                title={faceName(face)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: disabled || !available ? "default" : "pointer",
                  background: isSelected ? "var(--parchment)" : "var(--panel-bg)",
                  border: isSelected ? "2px solid var(--gold)" : "1px solid var(--panel-border)",
                  color: isSelected ? "var(--ink)" : "var(--text-secondary)",
                  opacity: available ? 1 : 0.35,
                }}
              >
                {face}
              </button>
            );
          })}
        </div>

        <span style={{ flex: 1 }} />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onPlaceBid({ quantity, face: selectedFace })}
          style={primaryButtonStyle(disabled)}
        >
          Place Bid
        </button>
        <button
          type="button"
          disabled={disabled || !canCall}
          onClick={onCall}
          style={dangerButtonStyle(disabled || !canCall)}
        >
          Call Liar!
        </button>
      </div>
    </div>
  );
}

const stepperButtonStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 5,
  border: "1px solid var(--panel-border)",
  background: "rgba(0,0,0,0.25)",
  color: "var(--text-primary)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
    color: "var(--ink)",
    border: "1px solid var(--gold-border)",
    borderRadius: 8,
    padding: "12px 24px",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

function dangerButtonStyle(disabled: boolean): CSSProperties {
  return {
    background: "linear-gradient(var(--danger-strong), var(--danger-deep))",
    color: "var(--text-primary)",
    border: "1px solid var(--danger-border)",
    borderRadius: 8,
    padding: "12px 24px",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 15,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}
