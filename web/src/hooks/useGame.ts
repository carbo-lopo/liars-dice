import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOT_STRATEGIES } from "@engine/bots/roster.js";
import { GameEngine, type Seat } from "@engine/engine/gameEngine.js";
import { DiceRevealed, GameOver, type GameEvent } from "@engine/events/gameEvent.js";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { IllegalActionError } from "@engine/rules/illegalActionError.js";
import type { Bid } from "@engine/types/bid.js";
import type { PlayerAction } from "@engine/types/playerAction.js";
import type { PlayerView } from "@engine/types/playerView.js";
import { useLatestRef } from "./useLatestRef.js";

export type Screen = "main" | "reveal" | "gameover";

/**
 * Where the game's on-screen flow currently is. Every transition is an explicit
 * setPhase call, so exactly one of these holds at a time.
 */
export type GamePhase =
  /** A new round's dice are being rolled on screen before anyone acts. */
  | { kind: "rolling" }
  /** The player chooses a bid or calls. */
  | { kind: "yourTurn" }
  /** A bot is about to act after a short pause. */
  | { kind: "botThinking"; bot: string }
  /** The latest bid is being typed out on screen. */
  | { kind: "typingBid"; byHuman: boolean }
  /** A bot has bid; the player presses Continue to move on. */
  | { kind: "awaitingContinue" }
  /** A challenge was resolved and the dice are shown. */
  | { kind: "reveal"; resolution: ChallengeResolution; gameOverAfter: boolean }
  | { kind: "gameOver" };

/** What the table shows about an opponent: public information only, never their dice. */
export interface OpponentSeat {
  name: string;
  strategyId: string;
  strategyLabel: string;
  diceCount: number;
  eliminated: boolean;
}

export interface GameResult {
  winnerName: string;
  youWon: boolean;
  loserNames: string[];
  /** 0-indexed, like PlayerView.roundNumber. */
  finalRound: number;
}

export interface UseGameApi {
  view: PlayerView;
  opponents: OpponentSeat[];
  phase: GamePhase;
  screen: Screen;
  isYourTurn: boolean;
  /** The start-of-round roll is playing. */
  rolling: boolean;
  /** A bot has already acted and is waiting on the player to acknowledge it. */
  awaitingContinue: boolean;
  /** Name of the bot currently deciding its action, if any. */
  thinkingBot: string | null;
  /** The latest bid was just placed and is still being typed out on screen. */
  typingBid: boolean;
  resolution: ChallengeResolution | null;
  result: GameResult | null;
  error: string | null;
  placeBid: (bid: Bid) => void;
  call: () => void;
  continueAfterBotAction: () => void;
  /** Called by the UI once the start-of-round roll has finished. */
  finishRolling: () => void;
  /** Called by the UI once the latest bid has finished typing out. */
  finishTyping: () => void;
  continueAfterReveal: () => void;
  playAgain: () => void;
}

/** How long a bot appears to think before moving, in milliseconds. */
export const THINKING_MIN_MS = 1000;
export const THINKING_MAX_MS = 1700;

function thinkingDelay(): number {
  return THINKING_MIN_MS + Math.random() * (THINKING_MAX_MS - THINKING_MIN_MS);
}

const [cautious, aggressive] = BOT_STRATEGIES;

/** The table the web app seats when it isn't given another: two bots with the player between them. */
export const DEFAULT_SEATS: readonly Seat[] = [
  { name: "Cora", strategy: cautious! },
  { name: "You", strategy: null },
  { name: "Duke", strategy: aggressive! },
];

function createEngine(seats: readonly Seat[]): GameEngine {
  const humans = seats.filter((seat) => seat.strategy === null).length;
  if (humans !== 1) {
    throw new Error(`The web game needs exactly one human seat (strategy null); got ${humans}.`);
  }
  return GameEngine.start(seats);
}

function apply(engine: GameEngine, action: PlayerAction): GameEvent[] {
  return action.type === "call" ? engine.call() : engine.bid(action.bid);
}

/**
 * The phase to enter once the engine is ready for its next turn: waiting on the
 * player, a bot thinking, or game over. Phases belong to this hook and drive
 * what the screens show; the engine knows nothing about them.
 */
function nextTurnPhase(engine: GameEngine): GamePhase {
  const { game } = engine;
  if (game.isOver) return { kind: "gameOver" };
  const player = game.round.currentPlayer;
  return player.isHuman ? { kind: "yourTurn" } : { kind: "botThinking", bot: player.name };
}

/**
 * The phase after a player, human or bot, bids or calls: a call reveals the
 * dice, and a bid is typed out in the Current Bid card.
 */
function phaseAfterAction(events: readonly GameEvent[], byHuman: boolean): GamePhase {
  const revealed = events.find((e): e is DiceRevealed => e instanceof DiceRevealed);
  if (revealed) {
    return {
      kind: "reveal",
      resolution: revealed.resolution,
      gameOverAfter: events.some((e) => e instanceof GameOver),
    };
  }
  return { kind: "typingBid", byHuman };
}

function screenFor(phase: GamePhase): Screen {
  // Every phase is listed so that adding one is a compile error until it's given a screen.
  switch (phase.kind) {
    case "rolling":
    case "yourTurn":
    case "botThinking":
    case "typingBid":
    case "awaitingContinue":
      return "main";
    case "reveal":
      return "reveal";
    case "gameOver":
      return "gameover";
  }
}

/**
 * Runs one game at the given table. Seats act in the order given, the first
 * seat opening round one; exactly one seat must be the human player.
 */
export function useGame(seats: readonly Seat[] = DEFAULT_SEATS): UseGameApi {
  const seatsRef = useLatestRef(seats);
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) engineRef.current = createEngine(seats);
  const engine = engineRef.current;

  const [phase, setPhase] = useState<GamePhase>({ kind: "rolling" });
  // Bumped after every engine change so the memoised view is recomputed.
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const humanAction = useCallback(
    (act: (engine: GameEngine) => GameEvent[]) => {
      setError(null);
      try {
        setPhase(phaseAfterAction(act(engineRef.current!), true));
        bump();
      } catch (err) {
        if (err instanceof IllegalActionError) setError(err.message);
        else throw err;
      }
    },
    [bump],
  );

  const placeBid = useCallback((bid: Bid) => humanAction((engine) => engine.bid(bid)), [humanAction]);
  const call = useCallback(() => humanAction((engine) => engine.call()), [humanAction]);

  const continueAfterBotAction = useCallback(() => {
    setPhase(nextTurnPhase(engineRef.current!));
  }, []);

  const finishRolling = useCallback(() => {
    setPhase((current) => (current.kind === "rolling" ? nextTurnPhase(engineRef.current!) : current));
  }, []);

  const finishTyping = useCallback(() => {
    // A bot's bid waits for "Continue"; after the player's own bid the next bot starts thinking.
    setPhase((current) =>
      current.kind !== "typingBid"
        ? current
        : current.byHuman
          ? nextTurnPhase(engineRef.current!)
          : { kind: "awaitingContinue" },
    );
  }, []);

  const continueAfterReveal = useCallback(() => {
    setPhase((current) =>
      current.kind === "reveal" && current.gameOverAfter ? { kind: "gameOver" } : { kind: "rolling" },
    );
  }, []);

  const playAgain = useCallback(() => {
    engineRef.current = createEngine(seatsRef.current);
    setError(null);
    setPhase({ kind: "rolling" });
    bump();
  }, [bump]);

  // A bot acts only when its thinking pause runs out. Leaving the phase first
  // (e.g. unmounting, or StrictMode's test cleanup) cancels the action.
  useEffect(() => {
    if (phase.kind !== "botThinking") return;
    const timer = window.setTimeout(() => {
      const engine = engineRef.current!;
      const bot = engine.game.round.currentPlayer;
      const view = engine.viewFor(bot);
      let events: GameEvent[];
      try {
        events = apply(engine, bot.strategy!.decide(view));
      } catch (err) {
        // Bots are tested to only take legal actions; if one slips through, call rather than stall the game.
        if (err instanceof IllegalActionError && view.currentBid) events = engine.call();
        else throw err;
      }
      setPhase(phaseAfterAction(events, false));
      bump();
    }, thinkingDelay());
    return () => window.clearTimeout(timer);
  }, [phase, bump]);

  const { game } = engine;
  const human = game.players.find((p) => p.isHuman)!;

  const view = useMemo(
    () => engine.viewFor(human),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, version],
  );

  const opponents: OpponentSeat[] = game.players
    .filter((p) => !p.isHuman)
    .map((p) => ({
      name: p.name,
      strategyId: p.strategy!.id,
      strategyLabel: p.strategy!.label,
      diceCount: p.diceCount,
      eliminated: p.isEliminated(),
    }));

  const winner = game.isOver ? game.winner : null;
  const result: GameResult | null = winner
    ? {
        winnerName: winner.name,
        youWon: winner.isHuman,
        loserNames: game.players.filter((p) => p !== winner).map((p) => p.name),
        finalRound: game.round.index,
      }
    : null;

  return {
    view,
    opponents,
    phase,
    screen: screenFor(phase),
    isYourTurn: phase.kind === "yourTurn",
    rolling: phase.kind === "rolling",
    awaitingContinue: phase.kind === "awaitingContinue",
    thinkingBot: phase.kind === "botThinking" ? phase.bot : null,
    typingBid: phase.kind === "typingBid",
    resolution: phase.kind === "reveal" ? phase.resolution : null,
    result,
    error,
    placeBid,
    call,
    continueAfterBotAction,
    finishRolling,
    finishTyping,
    continueAfterReveal,
    playAgain,
  };
}
