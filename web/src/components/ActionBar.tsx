import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { isValidRaise, type BiddingRules } from "@engine/rules/bidding.js";
import type { Bid } from "@engine/types/bid.js";
import type { Face } from "@engine/types/face.js";
import { faceName } from "../lib/faceNames.js";
import { Pips } from "./Die.js";

const ALL_FACES: Face[] = [1, 2, 3, 4, 5, 6];

/**
 * Smallest legal quantity for a bid on `face`, found by asking the engine's
 * own validator, or null when no quantity up to the dice in play is legal.
 */
function minQuantityForFace(rules: BiddingRules, face: Face): number | null {
  for (let q = 1; q <= rules.totalDiceInPlay; q++) {
    if (isValidRaise(rules, { quantity: q, face }).valid) return q;
  }
  return null;
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
  /** The phone layout: larger controls, stacked to fill the width. */
  compact?: boolean;
}

export function ActionBar({
  rules,
  canCall,
  disabled,
  onPlaceBid,
  onCall,
  onFaceChange,
  compact = false,
}: ActionBarProps) {
  const { currentBid } = rules;
  const lockedFace = lockedFaceOf(rules);
  const maxQty = rules.totalDiceInPlay;
  // Faces with at least one legal bid; none at all means the bid can only be called.
  const legalFaces = ALL_FACES.filter(
    (face) => (lockedFace === null || face === lockedFace) && minQuantityForFace(rules, face) !== null,
  );
  const canRaise = legalFaces.length > 0;
  const defaultFace = (): Face => {
    const preferred = lockedFace ?? currentBid?.face ?? 2;
    if (legalFaces.includes(preferred)) return preferred;
    return legalFaces.find((face) => face !== 1) ?? legalFaces[0] ?? preferred;
  };
  const startingQuantity = (face: Face) => minQuantityForFace(rules, face) ?? maxQty;

  const [selectedFace, setSelectedFace] = useState<Face>(defaultFace());
  const [quantity, setQuantity] = useState<number>(() => startingQuantity(defaultFace()));

  // Re-anchor whenever the underlying bid situation actually changes (a new
  // bid landed, a new round started, Palifico kicked in, etc.) -- not on
  // every render, since the user's own face/qty picks should stick around
  // while they're still deciding.
  const bidKey = `${currentBid?.quantity ?? "-"}:${currentBid?.face ?? "-"}:${rules.isPalifico}`;
  useEffect(() => {
    const face = defaultFace();
    setSelectedFace(face);
    setQuantity(startingQuantity(face));
    onFaceChange?.(face);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidKey]);

  const minQty = startingQuantity(selectedFace);
  const raiseDisabled = disabled || !canRaise;

  const handleFaceClick = (face: Face) => {
    if (raiseDisabled || !legalFaces.includes(face)) return;
    setSelectedFace(face);
    setQuantity(startingQuantity(face));
    onFaceChange?.(face);
  };

  const showAceNote =
    canRaise && !!currentBid && !rules.isPalifico && (selectedFace === 1) !== (currentBid.face === 1);
  const aceNoteDetail = currentBid && selectedFace === 1 ? "halved, rounded up" : "doubled, plus one";

  const stepButton = compact ? compactStepperButtonStyle : stepperButtonStyle;
  const stepper = (
    <div
      role="group"
      aria-label={`Quantity, ${minQty} to ${maxQty}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--panel-bg)",
        border: "2px solid var(--gold)",
        borderRadius: compact ? 12 : 8,
        padding: compact ? 3 : "9px 10px",
      }}
    >
      <button
        type="button"
        disabled={raiseDisabled || quantity <= minQty}
        onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
        aria-label="Decrease quantity"
        style={stepButton}
      >
        &minus;
      </button>
      {!compact && (
        <span aria-hidden style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Qty
        </span>
      )}
      <span
        aria-live="polite"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: compact ? 20 : 16,
          color: "var(--text-primary)",
          minWidth: compact ? 36 : 20,
          textAlign: "center",
        }}
      >
        {quantity}
      </span>
      <button
        type="button"
        disabled={raiseDisabled || quantity >= maxQty}
        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
        aria-label="Increase quantity"
        style={stepButton}
      >
        &#43;
      </button>
    </div>
  );
  const range = (
    <span aria-hidden style={{ fontSize: compact ? 13 : 10, color: compact ? "var(--gold-strong)" : "var(--gold)", textAlign: "center" }}>
      min. {minQty} · max {maxQty}
    </span>
  );
  const faces = (
    <div
      role="group"
      aria-label="Face"
      style={
        compact
          ? { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8 }
          : { display: "flex", gap: 6 }
      }
    >
      {ALL_FACES.map((face) => {
        const available = legalFaces.includes(face);
        const isSelected = face === selectedFace;
        return (
          <button
            key={face}
            type="button"
            disabled={raiseDisabled || !available}
            onClick={() => handleFaceClick(face)}
            title={faceName(face)}
            aria-label={faceName(face)}
            aria-pressed={isSelected}
            style={{
              width: compact ? undefined : 32,
              height: compact ? 42 : 32,
              borderRadius: compact ? 9 : 7,
              padding: compact ? "7px 8px" : 5,
              cursor: raiseDisabled || !available ? "default" : "pointer",
              background: isSelected ? "var(--parchment)" : "var(--panel-bg)",
              border: isSelected ? "2px solid var(--gold)" : "1px solid var(--panel-border)",
              color: isSelected ? "var(--ink)" : "var(--text-secondary)",
              opacity: available ? 1 : 0.35,
            }}
          >
            <Pips face={face} pipSize={compact ? 6 : 5} color="currentColor" />
          </button>
        );
      })}
    </div>
  );
  const placeBid = (
    <button
      type="button"
      data-sound="strong"
      disabled={raiseDisabled}
      onClick={() => onPlaceBid({ quantity, face: selectedFace })}
      style={{ ...primaryButtonStyle(raiseDisabled), ...(compact && compactActionStyle) }}
    >
      Place Bid
    </button>
  );
  const callLiar = (
    <button
      type="button"
      data-sound="strong"
      disabled={disabled || !canCall}
      onClick={onCall}
      style={{ ...dangerButtonStyle(disabled || !canCall), ...(compact && compactActionStyle) }}
    >
      Call Liar!
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 8 }}>
      {showAceNote && currentBid && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: compact ? "wrap" : undefined }}>
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

      {!canRaise && (
        <span role="status" style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
          This bid already claims every die it can, so it can&rsquo;t be raised. Call it.
        </span>
      )}

      {compact ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {stepper}
            {range}
          </div>
          {faces}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {placeBid}
            {callLiar}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {stepper}
            {range}
          </div>
          {faces}
          <span style={{ flex: 1 }} />
          {placeBid}
          {callLiar}
        </div>
      )}
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

const compactStepperButtonStyle: CSSProperties = {
  ...stepperButtonStyle,
  width: 40,
  height: 40,
  borderRadius: 9,
  border: "none",
  background: "rgba(0,0,0,0.3)",
  fontSize: 20,
};

const compactActionStyle: CSSProperties = { minHeight: 48, borderRadius: 12, fontSize: 16, padding: "10px 8px" };

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
