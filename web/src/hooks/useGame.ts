import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOT_STRATEGIES } from "@engine/bots/roster.js";
import { GameEngine } from "@engine/engine/gameEngine.js";
import { DiceRevealed, GameOver, type GameEvent } from "@engine/events/gameEvent.js";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { IllegalActionError } from "@engine/rules/illegalActionError.js";
import type { Bid } from "@engine/types/bid.js";
import type { PlayerAction } from "@engine/types/playerAction.js";
import type { PlayerView } from "@engine/types/playerView.js";

export type Screen = "main" | "reveal" | "gameover";

/**
 * Where the game's on-screen flow currently is. Every transition is an explicit
 * setPhase call, so exactly one of these holds at a time.
 */
export type GamePhase =
  /** The player chooses a bid or calls. */
  | { kind: "yourTurn" }
  /** A bot is about to move after a short pause. */
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
  /** A bot has already acted and is waiting on the player to acknowledge it. */
  awaitingContinue: boolean;
  /** Name of the bot currently deciding its move, if any. */
  thinkingBot: string | null;
  /** The latest bid was just placed and is still being typed out on screen. */
  typingBid: boolean;
  resolution: ChallengeResolution | null;
  result: GameResult | null;
  error: string | null;
  placeBid: (bid: Bid) => void;
  call: () => void;
  continueAfterBotAction: () => void;
  /** Called by the UI once the latest bid has finished typing out. */
  finishTyping: () => void;
  continueAfterReveal: () => void;
  playAgain: () => void;
}

/** How long a bot appears to think before moving, in milliseconds. */
const THINKING_MIN_MS = 1000;
const THINKING_MAX_MS = 1700;

function thinkingDelay(): number {
  return THINKING_MIN_MS + Math.random() * (THINKING_MAX_MS - THINKING_MIN_MS);
}

function createEngine(): GameEngine {
  const [cautious, aggressive] = BOT_STRATEGIES;
  return GameEngine.start([
    { name: "Cora", strategy: cautious! },
    { name: "You", strategy: null },
    { name: "Duke", strategy: aggressive! },
  ]);
}

function apply(engine: GameEngine, action: PlayerAction): GameEvent[] {
  return action.type === "call" ? engine.call() : engine.bid(action.bid);
}

/** The phase for whoever acts next in the engine's current round. */
function turnPhase(engine: GameEngine): GamePhase {
  const { game } = engine;
  if (game.isOver) return { kind: "gameOver" };
  const player = game.round.currentPlayer;
  return player.isHuman ? { kind: "yourTurn" } : { kind: "botThinking", bot: player.name };
}

/** The phase that follows a move: a challenge's reveal, or typing out the new bid. */
function phaseAfterMove(events: readonly GameEvent[], byHuman: boolean): GamePhase {
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
  if (phase.kind === "reveal") return "reveal";
  if (phase.kind === "gameOver") return "gameover";
  return "main";
}

export function useGame(): UseGameApi {
  const engineRef = useRef<GameEngine | null>(null);
  if (engineRef.current === null) engineRef.current = createEngine();
  const engine = engineRef.current;

  const [phase, setPhase] = useState<GamePhase>(() => turnPhase(engine));
  // Bumped after every engine change so the memoised view is recomputed.
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const humanAction = useCallback(
    (act: (engine: GameEngine) => GameEvent[]) => {
      setError(null);
      try {
        setPhase(phaseAfterMove(act(engineRef.current!), true));
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
    setPhase(turnPhase(engineRef.current!));
  }, []);

  const finishTyping = useCallback(() => {
    // A bot's bid waits for "Continue"; after the player's own bid the next bot starts thinking.
    setPhase((current) =>
      current.kind !== "typingBid"
        ? current
        : current.byHuman
          ? turnPhase(engineRef.current!)
          : { kind: "awaitingContinue" },
    );
  }, []);

  const continueAfterReveal = useCallback(() => {
    setPhase((current) =>
      current.kind === "reveal" && current.gameOverAfter ? { kind: "gameOver" } : turnPhase(engineRef.current!),
    );
  }, []);

  const playAgain = useCallback(() => {
    engineRef.current = createEngine();
    setError(null);
    setPhase(turnPhase(engineRef.current));
    bump();
  }, [bump]);

  // A bot moves only when its thinking pause runs out. Leaving the phase first
  // (e.g. unmounting, or StrictMode's test cleanup) cancels the move.
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
        // Bots are tested to only make legal moves; if one slips through, call rather than stall the game.
        if (err instanceof IllegalActionError && view.currentBid) events = engine.call();
        else throw err;
      }
      setPhase(phaseAfterMove(events, false));
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
    awaitingContinue: phase.kind === "awaitingContinue",
    thinkingBot: phase.kind === "botThinking" ? phase.bot : null,
    typingBid: phase.kind === "typingBid",
    resolution: phase.kind === "reveal" ? phase.resolution : null,
    result,
    error,
    placeBid,
    call,
    continueAfterBotAction,
    finishTyping,
    continueAfterReveal,
    playAgain,
  };
}
