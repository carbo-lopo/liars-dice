import { useEffect, useRef } from "react";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { bidLabel } from "../lib/faceNames.js";
import { conjugate, possessive } from "../lib/grammar.js";
import { ContinueButton } from "./ContinueButton.js";

/**
 * Dims the table and stamps "LIAR!" across it, naming who called whose bid,
 * and waits for the player to press Continue, which takes focus so Enter
 * works too. Sits over the felt, which the surrounding TableFrame positions.
 */
export function ChallengeSplash({
  resolution,
  onContinue,
}: {
  resolution: ChallengeResolution;
  onContinue: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  const { challenger, bidder, bid } = resolution;
  const caller = `${challenger.name} ${conjugate(challenger.isHuman, "call")}`;
  const whose = possessive(bidder.isHuman, bidder.name);

  return (
    <div
      className="challenge-splash"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(12, 8, 4, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 72,
        zIndex: 10,
      }}
    >
      <div role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 72 }}>
        <div
          className="challenge-stamp"
          style={{
            transform: "rotate(-8deg)",
            border: "8px solid #c4513f",
            borderRadius: 14,
            padding: "14px 54px",
            background: "rgba(243, 233, 210, 0.96)",
            boxShadow: "0 18px 50px rgba(0, 0, 0, 0.55)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 132,
              letterSpacing: "0.04em",
              color: "var(--danger-strong)",
              lineHeight: 1,
            }}
          >
            LIAR!
          </span>
        </div>
        <p
          style={{
            margin: 0,
            padding: "0 24px",
            fontFamily: "var(--font-display)",
            fontSize: 24,
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          {caller} Liar on {whose} bid of{" "}
          <strong style={{ color: "var(--gold-strong)" }}>{bidLabel(bid.quantity, bid.face)}</strong>
        </p>
      </div>
      {/* Where Continue sits on the table underneath, so the eye finds it in the same place. */}
      <div style={{ position: "absolute", right: 26, bottom: 26 }}>
        <ContinueButton ref={continueRef} onContinue={onContinue} />
      </div>
    </div>
  );
}
