import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import type { Player } from "@engine/models/player.js";
import type { Face } from "@engine/types/face.js";
import { TableFrame } from "../components/TableFrame.js";
import { Die } from "../components/Die.js";
import { bidLabel, faceNameForCount } from "../lib/faceNames.js";
import { conjugate } from "../lib/grammar.js";
import { QuitButton } from "../components/QuitButton.js";
import { RulesButton } from "../components/RulesButton.js";

export interface RevealScreenProps {
  resolution: ChallengeResolution;
  onContinue: () => void;
  onQuit: () => void;
  onRules: () => void;
}

/** "your" for the human, "Cora's" for a bot. */
function possessive(player: Player): string {
  return player.isHuman ? "your" : `${player.name}’s`;
}

export function RevealScreen({ resolution, onContinue, onQuit, onRules }: RevealScreenProps) {
  const { challenger, bidder, loser, bid } = resolution;
  // The resolution records whether its own round was Palifico. By the time this
  // screen shows, the engine has already started the next round.
  const onesWild = !resolution.isPalifico;
  const face = bid.face;
  const bidHeld = resolution.outcome === "challenger-wrong";

  const countsFor = (die: Face) => die === face || (onesWild && die === 1 && face !== 1);

  return (
    <TableFrame>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <RulesButton onClick={onRules} />
        <QuitButton onClick={onQuit} />
      </div>

      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--text-primary)",
        }}
      >
        {challenger.name} {conjugate(challenger.isHuman, "call")} LIAR on {possessive(bidder)} bid of{" "}
        {bidLabel(bid.quantity, bid.face)}!
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {resolution.reveal.map(({ player, dice }) => {
          const count = dice.filter((d) => countsFor(d)).length;
          return (
            <div key={player.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 70, fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                {player.name}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {dice.map((d, i) => (
                  <Die key={i} face={d} size={42} countsToward={countsFor(d) ? face : undefined} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{count} counted</span>
            </div>
          );
        })}
      </div>

      <span style={{ flex: 1 }} />

      <div
        style={{
          background: "var(--parchment)",
          border: "5px solid var(--parchment-border)",
          borderRadius: 6,
          padding: "14px 20px",
          color: "var(--ink)",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          {bidHeld ? "TRUE" : "FALSE"} &mdash; {resolution.actualCount}{" "}
          {faceNameForCount(bid.face, resolution.actualCount).toLowerCase()} counted
          {onesWild && bid.face !== 1 ? " (wild Aces included)" : ""}.
        </div>
        <div style={{ fontSize: 14 }}>
          {bidHeld ? "The bid held." : "The bid was a bluff."} {loser.name} {conjugate(loser.isHuman, "lose")} a
          die.
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        style={{
          alignSelf: "flex-end",
          background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
          color: "var(--ink)",
          border: "1px solid var(--gold-border)",
          borderRadius: 8,
          padding: "12px 24px",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Continue
      </button>
    </TableFrame>
  );
}
