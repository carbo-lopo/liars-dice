import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameEngine, IllegalActionError } from "@engine/engine/game.js";
import { decideBotAction } from "@engine/bots/botPlayer.js";
import type { Bid, ChallengeResolution, PlayerView } from "@engine/types.js";

const HUMAN_ID = "you";

export type Screen = "main" | "reveal" | "gameover";

function createEngine(): GameEngine {
  return new GameEngine([
    { id: "cora", name: "Cora", kind: "bot", personality: "cautious" },
    { id: HUMAN_ID, name: "You", kind: "human" },
    { id: "duke", name: "Duke", kind: "bot", personality: "aggressive" },
  ]);
}

export interface UseGameApi {
  view: PlayerView;
  screen: Screen;
  isYourTurn: boolean;
  /** A bot has already acted and is waiting on the player to acknowledge it. */
  awaitingContinue: boolean;
  resolution: ChallengeResolution | null;
  error: string | null;
  placeBid: (bid: Bid) => void;
  challenge: () => void;
  continueAfterBotAction: () => void;
  continueAfterReveal: () => void;
  playAgain: () => void;
}

export function useGame(): UseGameApi {
  const engineRef = useRef<GameEngine>(createEngine());
  const eventCursorRef = useRef(0);
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState<Screen>("main");
  const [resolution, setResolution] = useState<ChallengeResolution | null>(null);
  const [pendingGameOver, setPendingGameOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);

  // Guards the bot-turn effect against acting twice on the same game state --
  // most importantly React 18 StrictMode's dev-only double-invoke of effects,
  // which would otherwise make a bot take two turns for one.
  const lastActedSignatureRef = useRef<string | null>(null);

  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const view = useMemo(
    () => engineRef.current.getPlayerView(HUMAN_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const applyNewEvents = useCallback(() => {
    const { events, nextIndex } = engineRef.current.drainNewEvents(eventCursorRef.current);
    eventCursorRef.current = nextIndex;
    for (const e of events) {
      if (e.type === "reveal") {
        setResolution(e.resolution);
        setScreen("reveal");
      }
      if (e.type === "game-over") {
        setPendingGameOver(true);
      }
    }
  }, []);

  const placeBid = useCallback(
    (bid: Bid) => {
      setError(null);
      try {
        engineRef.current.placeBid(HUMAN_ID, bid);
        applyNewEvents();
        bump();
      } catch (err) {
        if (err instanceof IllegalActionError) setError(err.message);
        else throw err;
      }
    },
    [applyNewEvents, bump],
  );

  const challenge = useCallback(() => {
    setError(null);
    try {
      engineRef.current.challenge(HUMAN_ID);
      applyNewEvents();
      bump();
    } catch (err) {
      if (err instanceof IllegalActionError) setError(err.message);
      else throw err;
    }
  }, [applyNewEvents, bump]);

  const continueAfterBotAction = useCallback(() => {
    setAwaitingContinue(false);
    bump();
  }, [bump]);

  const continueAfterReveal = useCallback(() => {
    setResolution(null);
    setScreen(pendingGameOver ? "gameover" : "main");
    setPendingGameOver(false);
    bump();
  }, [pendingGameOver, bump]);

  const playAgain = useCallback(() => {
    engineRef.current = createEngine();
    eventCursorRef.current = 0;
    lastActedSignatureRef.current = null;
    setResolution(null);
    setPendingGameOver(false);
    setError(null);
    setAwaitingContinue(false);
    setScreen("main");
    bump();
  }, [bump]);

  // Run exactly one bot action whenever it's a bot's turn on the main screen
  // and nobody is waiting on a "Continue" click. There's no timer here --
  // the player paces the game themselves, same as the CLI's "press Enter to
  // continue": a bot bid stops and waits for acknowledgement, and a bot
  // challenge hands off to the (also click-gated) reveal screen.
  useEffect(() => {
    if (screen !== "main" || awaitingContinue) return;
    const snap = engineRef.current.getPublicSnapshot();
    if (snap.phase === "game-over") return;
    const current = snap.players[snap.currentPlayerIndex];
    if (!current || current.kind !== "bot") return;

    const signature = `${current.id}:${snap.roundNumber}:${snap.bidHistory.length}:${
      snap.currentBid ? `${snap.currentBid.quantity}-${snap.currentBid.face}` : "none"
    }`;
    if (lastActedSignatureRef.current === signature) return;
    lastActedSignatureRef.current = signature;

    const botView = engineRef.current.getPlayerView(current.id);
    const action = decideBotAction(botView);
    let wasChallenge = false;
    try {
      if (action.type === "challenge") {
        engineRef.current.challenge(current.id);
        wasChallenge = true;
      } else {
        engineRef.current.placeBid(current.id, action.bid);
      }
    } catch (err) {
      if (err instanceof IllegalActionError && botView.currentBid) {
        engineRef.current.challenge(current.id);
        wasChallenge = true;
      } else if (!(err instanceof IllegalActionError)) {
        throw err;
      }
    }
    applyNewEvents();
    if (!wasChallenge) {
      setAwaitingContinue(true);
    }
    bump();
  }, [screen, awaitingContinue, version, applyNewEvents, bump]);

  const isYourTurn = view.phase === "bidding" && view.currentPlayerId === HUMAN_ID && !awaitingContinue;

  return {
    view,
    screen,
    isYourTurn,
    awaitingContinue,
    resolution,
    error,
    placeBid,
    challenge,
    continueAfterBotAction,
    continueAfterReveal,
    playAgain,
  };
}
