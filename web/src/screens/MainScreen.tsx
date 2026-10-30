import type { Face } from "@engine/types/face.js";
import type { PlayerView } from "@engine/types/playerView.js";
import type { OpponentSeat } from "../hooks/useGame.js";
import { PHONE_FELT_PADDING, TableFrame } from "../components/TableFrame.js";
import { GameMenu } from "../components/GameMenu.js";
import { usePhoneLayout } from "../hooks/usePhoneLayout.js";
import { OpponentPanel } from "../components/OpponentPanel.js";
import { CurrentBidCard, BidHistoryCard } from "../components/BidCards.js";
import { HandRow } from "../components/HandRow.js";
import { ActionBar } from "../components/ActionBar.js";
import { PalificoIcon } from "../components/PalificoIcon.js";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { ChallengeSplash } from "../components/ChallengeSplash.js";
import { AUTO_CONTINUE_MS, ContinueButton } from "../components/ContinueButton.js";
import { HeaderButton } from "../components/HeaderButton.js";
import { inertWhen } from "../lib/inert.js";
import { useSettings } from "../settings/settings.js";
import { useState } from "react";

const PERSONALITY_ACCENT: Record<string, string> = {
  cautious: "rgba(47, 122, 102, 0.55)",
  aggressive: "rgba(154, 74, 47, 0.55)",
  unpredictable: "rgba(122, 47, 122, 0.55)",
};

export interface MainScreenProps {
  view: PlayerView;
  opponents: OpponentSeat[];
  isYourTurn: boolean;
  awaitingContinue: boolean;
  /** Another screen (Rules, Options) is covering the game. */
  covered: boolean;
  /** A call to announce with the splash over the table. */
  challenge: ChallengeResolution | null;
  onContinueChallenge: () => void;
  thinkingBot: string | null;
  rolling: boolean;
  typingBid: boolean;
  error: string | null;
  onPlaceBid: (bid: { quantity: number; face: Face }) => void;
  onCall: () => void;
  onContinueBotAction: () => void;
  onBidTyped: () => void;
  onRolled: () => void;
  onQuit: () => void;
  onRules: () => void;
  onOptions: () => void;
}

export function MainScreen({
  view,
  opponents,
  isYourTurn,
  awaitingContinue,
  covered,
  challenge,
  onContinueChallenge,
  thinkingBot,
  rolling,
  typingBid,
  error,
  onPlaceBid,
  onCall,
  onContinueBotAction,
  onBidTyped,
  onRolled,
  onQuit,
  onRules,
  onOptions,
}: MainScreenProps) {
  const { settings } = useSettings();
  const [selectedFace, setSelectedFace] = useState<Face | null>(view.currentBid?.face ?? null);

  const bidderName = view.bidHistory.at(-1)?.bidder.name ?? null;
  // A new bid joins the round's history only once it has finished typing out.
  const shownHistory = typingBid ? view.bidHistory.slice(0, -1) : view.bidHistory;
  // On your turn the hand previews the face you're considering; otherwise it shows the bid on the table.
  const highlightFace = isYourTurn ? selectedFace : (shownHistory.at(-1)?.bid.face ?? null);
  const actorName = view.turnOrder[0]?.name ?? "";

  const phone = usePhoneLayout();

  const roundPill = (
    <span
      style={{
        background: "rgba(0,0,0,0.25)",
        color: "#E7D9B8",
        fontSize: 13,
        padding: phone ? "4px 10px" : "6px 16px",
        borderRadius: 999,
        border: "1px solid var(--panel-border)",
        whiteSpace: "nowrap",
      }}
    >
      Round {view.roundNumber + 1}
    </span>
  );

  const header = phone ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
        Liar&rsquo;s Dice
      </span>
      {roundPill}
      <span style={{ flex: 1 }} />
      <GameMenu onRules={onRules} onOptions={onOptions} onQuit={onQuit} />
    </div>
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)" }}>
        Liar&rsquo;s Dice
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {roundPill}
        <HeaderButton onClick={onRules}>Rules</HeaderButton>
        <HeaderButton onClick={onOptions}>Options</HeaderButton>
        <HeaderButton onClick={onQuit}>Quit Game</HeaderButton>
      </div>
    </div>
  );

  const palifico = view.isPalifico && (
    <div
      style={{
        background: "linear-gradient(rgba(154,58,44,0.6), rgba(122,44,32,0.6))",
        border: "2px solid var(--gold)",
        borderRadius: 10,
        padding: phone ? "10px 12px" : "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: phone ? 10 : 14,
        animation: "palifico-pulse 2.2s ease-in-out infinite",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.25)",
          borderRadius: 8,
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PalificoIcon size={phone ? 24 : 30} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: phone ? 15 : 17,
            letterSpacing: "0.02em",
            color: "var(--text-primary)",
            textTransform: "uppercase",
          }}
        >
          Palifico Round
        </span>
        <span style={{ fontSize: 13, color: "#F0D9C9" }}>
          No wild Aces this round
          {view.currentBid
            ? `, every bid stays on that starter's face`
            : " — the starter's opening bid sets the locked face"}
          .
        </span>
      </div>
    </div>
  );

  const opponentPanels = (
    <div
      style={
        phone
          ? { display: "grid", gridTemplateColumns: `repeat(${opponents.length}, minmax(0, 1fr))`, gap: 10 }
          : { display: "flex", gap: 16 }
      }
    >
      {opponents.map((o) => (
        <OpponentPanel
          key={o.name}
          name={o.name}
          personality={o.strategyLabel}
          diceCount={o.diceCount}
          eliminated={o.eliminated}
          isCurrentBidder={bidderName === o.name}
          accent={PERSONALITY_ACCENT[o.strategyId]}
          compact={phone}
        />
      ))}
    </div>
  );

  const bidCard = (
    <CurrentBidCard
      bid={view.currentBid}
      bidderName={bidderName}
      actorName={actorName}
      typing={typingBid}
      onTyped={onBidTyped}
      status={rolling ? "Rolling…" : thinkingBot ? `${thinkingBot} is thinking…` : null}
      compact={phone}
    />
  );

  const hand = (
    <HandRow
      dice={view.hand}
      selectedFace={highlightFace}
      onesWild={!view.isPalifico}
      rolling={rolling}
      onRolled={onRolled}
      size={phone ? 56 : undefined}
    />
  );

  const errorNotice = error && (
    <div role="alert" style={{ color: "var(--text-primary)", background: "rgba(154,58,44,0.5)", padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
      {error}
    </div>
  );

  const controls = isYourTurn ? (
    <ActionBar
      rules={view}
      canCall={view.currentBid !== null}
      disabled={false}
      onPlaceBid={onPlaceBid}
      onCall={onCall}
      onFaceChange={setSelectedFace}
      compact={phone}
    />
  ) : (
    // Rendered even while a bot moves, with the button hidden, so the board doesn't shift when Continue appears.
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
      <ContinueButton
        onContinue={onContinueBotAction}
        hidden={!awaitingContinue}
        autoContinueMs={settings.autoContinue ? AUTO_CONTINUE_MS : null}
        paused={covered}
        block={phone}
      />
    </div>
  );

  return (
    <TableFrame>
      {/* While the splash is up, the table behind it is out of reach: only its Continue can be focused. */}
      <div style={{ display: "contents" }} {...inertWhen(challenge !== null)}>
        {header}
        {palifico}
        {opponentPanels}
        {phone ? (
          <>
            {bidCard}
            {/* The round's bids fill whatever height the phone has between the bid and the dock. */}
            <div style={{ flex: 1, minHeight: 72, display: "flex", flexDirection: "column" }}>
              <BidHistoryCard history={shownHistory} />
            </div>
            {errorNotice}
            {/* Sticks to the bottom of the screen, so the bid controls stay in reach on a phone too short for the whole table. */}
            <div
              data-testid="dock"
              style={{
                position: "sticky",
                bottom: 0,
                zIndex: 2,
                margin: `0 -${PHONE_FELT_PADDING}px -${PHONE_FELT_PADDING}px`,
                padding: `14px ${PHONE_FELT_PADDING}px 24px`,
                background: "rgba(13, 36, 27, 0.97)",
                borderTop: "1px solid rgba(233, 217, 184, 0.18)",
                borderRadius: "18px 18px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {hand}
              {controls}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
              {bidCard}
              <BidHistoryCard history={shownHistory} />
            </div>
            {hand}
            {errorNotice}
            {controls}
          </>
        )}
      </div>
      {challenge && <ChallengeSplash resolution={challenge} onContinue={onContinueChallenge} covered={covered} />}
    </TableFrame>
  );
}
