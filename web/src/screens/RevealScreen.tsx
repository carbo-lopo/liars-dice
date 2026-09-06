import type { ChallengeResolution, Face, PlayerView } from "@engine/types.js";
import { TableFrame } from "../components/TableFrame.js";
import { Die } from "../components/Die.js";
import { bidLabel, faceNameForCount } from "../lib/faceNames.js";
import { conjugate } from "../lib/grammar.js";
import { QuitButton } from "../components/QuitButton.js";

export interface RevealScreenProps {
  resolution: ChallengeResolution;
  view: PlayerView;
  onContinue: () => void;
  onQuit: () => void;
}

export function RevealScreen({ resolution, view, onContinue, onQuit }: RevealScreenProps) {
  const nameFor = (playerId: string): string => {
    if (playerId === view.selfId) return view.self.name;
    return view.others.find((o) => o.id === playerId)?.name ?? playerId;
  };

  const bidderName = nameFor(resolution.bidderId);
  const challengerName = nameFor(resolution.challengerId);
  const loserName = nameFor(resolution.loserId);
  const challengerIsYou = resolution.challengerId === view.selfId;
  const loserIsYou = resolution.loserId === view.selfId;
  // Use the resolution's own recorded wild-ace status, not view.isPalificoRound
  // -- by the time this screen renders, the engine has already set up the
  // *next* round's Palifico flag as part of resolving this same challenge, so
  // reading it here would describe the wrong round.
  const onesWild = resolution.onesWild;
  const face = resolution.finalBid.face as Face;

  const countsFor = (die: Face) => die === face || (onesWild && die === 1 && face !== 1);

  return (
    <TableFrame>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
        {challengerName} {conjugate(challengerIsYou, "call")} LIAR on {bidderName}&rsquo;s bid of{" "}
        {bidLabel(resolution.finalBid.quantity, resolution.finalBid.face)}!
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(resolution.reveal).map(([playerId, dice]) => {
          const count = dice.filter((d) => countsFor(d)).length;
          return (
            <div key={playerId} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 70, fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                {nameFor(playerId)}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {dice.map((d, i) => (
                  <Die key={i} face={d} size={42} highlighted={countsFor(d)} />
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
          {resolution.outcome === "bidder-right" ? "TRUE" : "FALSE"} &mdash; {resolution.actualCount}{" "}
          {faceNameForCount(resolution.finalBid.face, resolution.actualCount).toLowerCase()} counted
          {onesWild && resolution.finalBid.face !== 1 ? " (wild Aces included)" : ""}.
        </div>
        <div style={{ fontSize: 14 }}>
          {resolution.outcome === "bidder-right" ? "The bid held." : "The bid was a bluff."} {loserName}{" "}
          {conjugate(loserIsYou, "lose")} a die.
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
