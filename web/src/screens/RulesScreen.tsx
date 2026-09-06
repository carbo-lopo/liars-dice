import type { Face } from "@engine/types.js";
import { TableFrame } from "../components/TableFrame.js";
import { Die } from "../components/Die.js";
import { PalificoIcon } from "../components/PalificoIcon.js";
import type { ReactNode } from "react";

export interface RulesScreenProps {
  onBack: () => void;
  onPlay: () => void;
}

export function RulesScreen({ onBack, onPlay }: RulesScreenProps) {
  return (
    <TableFrame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--text-primary)" }}>
          How to Play
        </span>
        <button type="button" onClick={onBack} style={ghostButtonStyle}>
          &larr; Back
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <RuleSection title="Objective">
          <p style={paragraphStyle}>
            Everyone rolls a hidden hand of dice. On your turn you either raise the standing bid &mdash; a claim about
            how many dice, across every hand at the table, show a certain face &mdash; or call &ldquo;Liar!&rdquo; on the
            last bid if you don&rsquo;t believe it. Guess wrong and you lose a die; last player still holding dice wins.
          </p>
        </RuleSection>

        <RuleSection title="Raising the bid">
          <p style={paragraphStyle}>
            Each new bid must beat the last one: claim more dice on the same face, or the same count on a higher
            face.
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <BidTransitionExample from="2 × Threes" to="3 × Threes" note="higher quantity, same face" />
            <BidTransitionExample from="2 × Threes" to="2 × Fours" note="same quantity, higher face" />
          </div>
        </RuleSection>

        <RuleSection title="Aces are wild">
          <p style={paragraphStyle}>
            A rolled 1 (an Ace) counts toward <em>any</em> face you bid on &mdash; except during a Palifico round (see
            below). Here, two Aces in this hand both count toward a bid on Fives:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {([1, 3, 5, 1, 4] as Face[]).map((face, i) => (
              <Die key={i} face={face} size={40} highlighted={face === 1 || face === 5} />
            ))}
            <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 8 }}>
              3 dice count toward &ldquo;Fives&rdquo;
            </span>
          </div>
        </RuleSection>

        <RuleSection title="Calling Liar">
          <p style={paragraphStyle}>
            Challenge the last bid and every hand flips face-up. The dice that actually match (including wild Aces)
            are tallied against the claim:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <RevealRow name="Cora" dice={[2, 5, 1]} matchFace={5} />
            <RevealRow name="You" dice={[5, 5, 3]} matchFace={5} />
          </div>
          <p style={paragraphStyle}>
            4 Fives counted. If the bid claimed 4 or fewer, the bidder was right and the challenger loses a die; if it
            claimed more, the bidder loses one instead.
          </p>
        </RuleSection>

        <RuleSection title="Palifico rounds">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                borderRadius: 8,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PalificoIcon size={36} />
            </div>
            <p style={{ ...paragraphStyle, margin: 0 }}>
              When a player starts their turn with exactly one die left, that round becomes a Palifico round: Aces
              stop being wild, and every bid that round must stay on whatever face the opening bid used &mdash; only the
              quantity can rise. You&rsquo;ll see a bold pulsing banner on the table whenever this is active.
            </p>
          </div>
        </RuleSection>

        <RuleSection title="Winning">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <svg width="40" height="34" viewBox="0 0 70 60" style={{ flexShrink: 0 }}>
              <polygon
                points="10,46 10,20 25,33 35,10 45,33 60,20 60,46"
                fill="#D9B84A"
                stroke="#8A6E1E"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <rect x="8" y="46" width="54" height="9" rx="2.5" fill="#D9B84A" stroke="#8A6E1E" strokeWidth="2" />
              <circle cx="35" cy="16" r="3.5" fill="#F3E9D2" />
              <circle cx="15" cy="26" r="3" fill="#F3E9D2" />
              <circle cx="55" cy="26" r="3" fill="#F3E9D2" />
            </svg>
            <p style={{ ...paragraphStyle, margin: 0 }}>
              Lose your last die and you&rsquo;re out. The last player left holding any dice wins the game.
            </p>
          </div>
        </RuleSection>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onPlay} style={primaryButtonStyle}>
          Start Playing
        </button>
      </div>
    </TableFrame>
  );
}

function RuleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--panel-border)",
        borderRadius: 10,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--gold)" }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function BidTransitionExample({ from, to, note }: { from: string; to: string; note: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BidChip label={from} />
        <span style={{ color: "var(--text-secondary)", fontSize: 16 }}>&rarr;</span>
        <BidChip label={to} strong />
      </div>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>{note}</span>
    </div>
  );
}

function BidChip({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <span
      style={{
        background: strong ? "var(--parchment)" : "rgba(0,0,0,0.22)",
        color: strong ? "var(--ink)" : "var(--text-primary)",
        border: strong ? "2px solid var(--gold)" : "1px solid var(--panel-border)",
        borderRadius: 6,
        padding: "6px 12px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {label}
    </span>
  );
}

function RevealRow({ name, dice, matchFace }: { name: string; dice: Face[]; matchFace: Face }) {
  const onesWild = true;
  const countsFor = (d: Face) => d === matchFace || (onesWild && d === 1 && matchFace !== 1);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ width: 44, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{name}</span>
      <div style={{ display: "flex", gap: 5 }}>
        {dice.map((d, i) => (
          <Die key={i} face={d} size={32} highlighted={countsFor(d)} />
        ))}
      </div>
    </div>
  );
}

const paragraphStyle = {
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
  margin: 0,
} as const;

const primaryButtonStyle = {
  background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
  color: "var(--ink)",
  border: "1px solid var(--gold-border)",
  borderRadius: 8,
  padding: "12px 28px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
} as const;

const ghostButtonStyle = {
  background: "transparent",
  color: "var(--text-primary)",
  border: "1px solid var(--panel-border)",
  borderRadius: 8,
  padding: "8px 16px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
} as const;
