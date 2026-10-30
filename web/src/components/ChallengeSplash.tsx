import { useEffect, useRef } from "react";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { bidLabel } from "../lib/faceNames.js";
import { conjugate, possessive } from "../lib/grammar.js";
import { useSound } from "../audio/SoundProvider.js";
import { prefersReducedMotion } from "../lib/motion.js";
import { usePhoneLayout } from "../hooks/usePhoneLayout.js";
import { ContinueButton } from "./ContinueButton.js";

/**
 * When the stamp hits in its 0.38 s drop (stamp-in in global.css), where its
 * sound plays. With that animation's easing it reaches full size about 105 ms
 * in, then briefly overshoots; the sound starts a little earlier to allow for
 * the browser's audio output delay.
 */
export const STAMP_HIT_MS = 100;

/**
 * Dims the table and stamps "LIAR!" across it, naming who called whose bid,
 * and waits for the player to press Continue, which takes focus so Enter
 * works too. Sits over the felt, which the surrounding TableFrame positions.
 */
export function ChallengeSplash({
  resolution,
  onContinue,
  covered = false,
}: {
  resolution: ChallengeResolution;
  onContinue: () => void;
  /** Another screen (Rules, Options) is covering the game; focus waits until it's gone. */
  covered?: boolean;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const { playSound } = useSound();

  // The thump lands with the stamp; a ref keeps StrictMode's remount from playing it twice.
  const stampedRef = useRef(false);
  useEffect(() => {
    if (stampedRef.current) return;
    const timer = window.setTimeout(
      () => {
        stampedRef.current = true;
        playSound("stamp");
      },
      prefersReducedMotion() ? 0 : STAMP_HIT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playSound]);

  // A covered screen can't take focus, e.g. when a bot calls while Rules is open.
  useEffect(() => {
    if (!covered) continueRef.current?.focus();
  }, [covered]);

  const phone = usePhoneLayout();
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
        zIndex: 10,
      }}
    >
      <div role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: phone ? 44 : 72 }}>
        <div
          className="challenge-stamp"
          style={{
            transform: "rotate(-8deg)",
            border: `${phone ? 6 : 8}px solid #c4513f`,
            borderRadius: phone ? 10 : 14,
            padding: phone ? "10px 28px" : "14px 54px",
            background: "rgba(243, 233, 210, 0.96)",
            boxShadow: "0 18px 50px rgba(0, 0, 0, 0.55)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: phone ? 84 : 132,
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
            fontSize: phone ? 21 : 24,
            lineHeight: phone ? 1.4 : undefined,
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          {caller} Liar on {whose} bid of{" "}
          <strong style={{ color: "var(--gold-strong)" }}>{bidLabel(bid.quantity, bid.face)}</strong>
        </p>
      </div>
      {/* Where Continue sits on the table underneath, so the eye finds it in the same place. */}
      <div style={phone ? { position: "absolute", left: 16, right: 16, bottom: 24 } : { position: "absolute", right: 26, bottom: 26 }}>
        <ContinueButton ref={continueRef} onContinue={onContinue} block={phone} />
      </div>
    </div>
  );
}
