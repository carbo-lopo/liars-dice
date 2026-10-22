import { useEffect } from "react";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { bidLabel } from "../lib/faceNames.js";
import { conjugate, possessive } from "../lib/grammar.js";
import { useLatestRef } from "../hooks/useLatestRef.js";

/** How long the "LIAR!" splash stays over the table before the reveal. */
export const SPLASH_MS = 1600;

/**
 * Dims the table and stamps "LIAR!" across it, naming who called whose bid,
 * then calls `onDone` once after SPLASH_MS. Sits over the felt, which the
 * surrounding TableFrame positions.
 */
export function ChallengeSplash({ resolution, onDone }: { resolution: ChallengeResolution; onDone: () => void }) {
  const onDoneRef = useLatestRef(onDone);

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [onDoneRef]);

  const { challenger, bidder, bid } = resolution;
  const caller = `${challenger.name} ${conjugate(challenger.isHuman, "call")}`;
  const whose = possessive(bidder.isHuman, bidder.name);

  return (
    <div
      role="alert"
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
  );
}
