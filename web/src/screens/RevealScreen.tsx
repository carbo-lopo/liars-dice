import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import type { Face } from "@engine/types/face.js";
import { ContinueButton } from "../components/ContinueButton.js";
import { FastForwardButton } from "../components/FastForwardButton.js";
import { Die } from "../components/Die.js";
import { HeaderButton } from "../components/HeaderButton.js";
import { TableFrame } from "../components/TableFrame.js";
import { FAST_FORWARD_SPEED, useRevealSequence } from "../hooks/useRevealSequence.js";
import { bidLabel, faceName, faceNameForCount } from "../lib/faceNames.js";
import { conjugate, possessive } from "../lib/grammar.js";

export interface RevealScreenProps {
  resolution: ChallengeResolution;
  onContinue: () => void;
  onQuit: () => void;
  onRules: () => void;
  onOptions: () => void;
  /** The reveal runs FAST_FORWARD_SPEED times faster. */
  fastForward: boolean;
  onToggleFastForward: () => void;
}

export function RevealScreen({
  resolution,
  onContinue,
  onQuit,
  onRules,
  onOptions,
  fastForward,
  onToggleFastForward,
}: RevealScreenProps) {
  const { challenger, bidder, loser, bid } = resolution;
  // The resolution records whether its own round was Palifico. By the time this
  // screen shows, the engine has already started the next round.
  const onesWild = !resolution.isPalifico;
  const bidHeld = resolution.outcome === "challenger-wrong";
  const countsFor = (die: Face) => die === bid.face || (onesWild && die === 1 && bid.face !== 1);

  // Hands are turned over starting with the bidder's and going round the table.
  const bidderAt = Math.max(0, resolution.reveal.findIndex((hand) => hand.player === bidder));
  const hands = [...resolution.reveal.slice(bidderAt), ...resolution.reveal.slice(0, bidderAt)];
  const { revealed, verdictShown } = useRevealSequence(
    hands.map((hand) => hand.dice.length),
    true,
    fastForward ? FAST_FORWARD_SPEED : 1,
  );

  let start = 0;
  const rows = hands.map(({ player, dice }) => {
    const first = start;
    start += dice.length;
    const shown = Math.max(0, Math.min(dice.length, revealed - first));
    return {
      player,
      dice,
      first,
      shown,
      counted: dice.slice(0, shown).filter(countsFor).length,
      done: shown === dice.length,
      inProgress: shown > 0 && shown < dice.length,
    };
  });

  const count = rows.reduce((sum, row) => sum + row.counted, 0);
  const metClaim = count >= bid.quantity;
  const current = rows.find((row) => !row.done) ?? rows[rows.length - 1]!;
  const lastDone = [...rows].reverse().find((row) => row.done);

  const headline = `${bidHeld ? "TRUE" : "FALSE"} — ${resolution.actualCount} ${faceNameForCount(bid.face, resolution.actualCount).toLowerCase()} counted${onesWild && bid.face !== 1 ? " (wild Aces included)" : ""}.`;
  const outcome = `${bidHeld ? "The bid held." : "The bid was a bluff."} ${loser.name} ${conjugate(loser.isHuman, "lose")} a die.`;
  const announcement = verdictShown
    ? `${headline} ${outcome}`
    : lastDone
      ? `${lastDone.player.name}: ${lastDone.counted} counted.`
      : "";

  return (
    <TableFrame>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <HeaderButton onClick={onRules}>Rules</HeaderButton>
        <HeaderButton onClick={onOptions}>Options</HeaderButton>
        <HeaderButton onClick={onQuit}>Quit Game</HeaderButton>
      </div>

      <h1
        style={{
          margin: 0,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--text-primary)",
        }}
      >
        {challenger.name} {conjugate(challenger.isHuman, "call")} LIAR on {possessive(bidder.isHuman, bidder.name)} bid
        of {bidLabel(bid.quantity, bid.face)}!
      </h1>

      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <div style={{ display: "flex", gap: 24, flex: 1, alignItems: "stretch" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          {rows.map((row) => {
            const losing = verdictShown && row.player === loser;
            const note = losing
              ? row.player.isEliminated()
                ? "Out of dice"
                : "− 1 die"
              : row.done
                ? `${row.counted} counted`
                : row.inProgress
                  ? "revealing…"
                  : "";
            return (
              <div
                key={row.player.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: losing
                    ? "rgba(154, 58, 44, 0.35)"
                    : row.inProgress
                      ? "rgba(201, 162, 39, 0.12)"
                      : "rgba(0, 0, 0, 0.18)",
                  border: `1px solid ${losing ? "#c4513f" : row.inProgress ? "rgba(201, 162, 39, 0.6)" : "rgba(233, 217, 184, 0.15)"}`,
                }}
              >
                <span style={{ width: 64, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  {row.player.name}
                </span>
                <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  {row.dice.map((face, i) => {
                    if (i >= row.shown) return <Die key={i} faceDown size={42} />;
                    const counts = countsFor(face);
                    const justTurned = !verdictShown && row.first + i === revealed - 1;
                    return (
                      <Die
                        key={i}
                        face={face}
                        size={42}
                        countsToward={counts ? bid.face : undefined}
                        dimmed={!counts}
                        className={justTurned ? "die-landed" : undefined}
                      />
                    );
                  })}
                </div>
                <span style={{ width: 90, textAlign: "right", fontSize: 13, color: "var(--text-secondary)" }}>
                  {note}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            width: 220,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 22,
            borderRadius: 12,
            background: "rgba(0, 0, 0, 0.28)",
            border: "1px solid var(--panel-border)",
          }}
        >
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
            {faceName(bid.face)} counted
          </span>
          <span
            data-testid="reveal-count"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1,
              color: metClaim ? "var(--gold-strong)" : "var(--text-primary)",
            }}
          >
            {count}
          </span>
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>of {bid.quantity} claimed</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 150,
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(233, 217, 184, 0.25)",
              }}
            >
              <div
                data-testid="reveal-fill"
                style={{ width: `${Math.min(count / bid.quantity, 1) * 100}%`, height: "100%", background: "var(--gold)" }}
              />
            </div>
            {count > bid.quantity && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-strong)" }}>+{count - bid.quantity}</span>
            )}
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
            {!onesWild ? "No wild Aces this round" : bid.face === 1 ? "Only Aces count" : "Aces are wild this round"}
          </span>
        </div>
      </div>

      <div style={{ minHeight: 96, display: "flex", alignItems: "center", gap: 20 }}>
        {verdictShown ? (
          <div
            style={{
              flex: 1,
              background: "var(--parchment)",
              border: "5px solid var(--parchment-border)",
              borderRadius: 6,
              padding: "14px 20px",
              color: "var(--ink)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{headline}</span>
            <span style={{ fontSize: 15 }}>{outcome}</span>
          </div>
        ) : (
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "#E7D9B8",
            }}
          >
            {current.done
              ? "All dice are up…"
              : `Revealing ${possessive(current.player.isHuman, current.player.name)} dice…`}
          </span>
        )}
        {!verdictShown && <FastForwardButton on={fastForward} onToggle={onToggleFastForward} />}
        <ContinueButton onContinue={onContinue} disabled={!verdictShown} />
      </div>
    </TableFrame>
  );
}
