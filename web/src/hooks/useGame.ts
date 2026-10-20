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
  screen: Screen;
  isYourTurn: boolean;
  /** A bot has already acted and is waiting on the player to acknowledge it. */
  awaitingContinue: boolean;
  /** Name of the bot currently deciding its move, if any. */
  thinkingBot: string | null;
  /** The latest bid was just placed by a bot and is still being typed out on screen. */
  typingBid: boolean;
  resolution: ChallengeResolution | null;
  result: GameResult | null;
  error: string | null;
  placeBid: (bid: Bid) => void;
  call: () => void;
  continueAfterBotAction: () => void;
  /** Called by the UI once a bot's bid has finished typing out. */
  finishTyping: () => void;
  continueAfterReveal: () => void;
  playAgain: () => void;
}

/** How long a bot appears to think before moving, in milliseconds. */
const THINKING_MIN_MS = 700;
const THINKING_MAX_MS = 1300;

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

export function useGame(): UseGameApi {
  const engineRef = useRef<GameEngine>(createEngine());
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState<Screen>("main");
  const [resolution, setResolution] = useState<ChallengeResolution | null>(null);
  const [pendingGameOver, setPendingGameOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [thinkingBot, setThinkingBot] = useState<string | null>(null);
  const [typingBid, setTypingBid] = useState(false);

  // Guards the bot-turn effect against acting twice on the same game state,
  // e.g. React StrictMode running effects twice in development.
  const lastActedSignatureRef = useRef<string | null>(null);

  const bump = useCallback(() => setVersion((n) => n + 1), []);

  const handleEvents = useCallback((events: readonly GameEvent[]) => {
    for (const event of events) {
      if (event instanceof DiceRevealed) {
        setResolution(event.resolution);
        setScreen("reveal");
      }
      if (event instanceof GameOver) {
        setPendingGameOver(true);
      }
    }
  }, []);

  const humanAction = useCallback(
    (act: (engine: GameEngine) => GameEvent[]) => {
      setError(null);
      try {
        handleEvents(act(engineRef.current));
        bump();
      } catch (err) {
        if (err instanceof IllegalActionError) setError(err.message);
        else throw err;
      }
    },
    [handleEvents, bump],
  );

  const placeBid = useCallback((bid: Bid) => humanAction((engine) => engine.bid(bid)), [humanAction]);
  const call = useCallback(() => humanAction((engine) => engine.call()), [humanAction]);

  const continueAfterBotAction = useCallback(() => {
    setAwaitingContinue(false);
    bump();
  }, [bump]);

  const finishTyping = useCallback(() => {
    setTypingBid(false);
    setAwaitingContinue(true);
  }, []);

  const continueAfterReveal = useCallback(() => {
    setResolution(null);
    setScreen(pendingGameOver ? "gameover" : "main");
    setPendingGameOver(false);
    bump();
  }, [pendingGameOver, bump]);

  const playAgain = useCallback(() => {
    engineRef.current = createEngine();
    lastActedSignatureRef.current = null;
    setResolution(null);
    setPendingGameOver(false);
    setError(null);
    setAwaitingContinue(false);
    setThinkingBot(null);
    setTypingBid(false);
    setScreen("main");
    bump();
  }, [bump]);

  // Runs exactly one bot move whenever it's a bot's turn on the main screen and
  // nothing is waiting on the player. The bot "thinks" for a short delay first.
  // A bot bid is then typed out by the UI, which calls finishTyping, and waits
  // for "Continue"; a bot call goes straight to the reveal screen.
  useEffect(() => {
    if (screen !== "main" || awaitingContinue || typingBid) return;
    const engine = engineRef.current;
    const { game } = engine;
    if (game.isOver) return;
    const bot = game.round.currentPlayer;
    if (bot.strategy === null) return;

    const round = game.round;
    const signature = `${round.index}:${round.bidHistory.length}:${bot.name}`;
    if (lastActedSignatureRef.current === signature) return;
    lastActedSignatureRef.current = signature;

    setThinkingBot(bot.name);
    let moved = false;
    const timer = window.setTimeout(() => {
      moved = true;
      setThinkingBot(null);
      const view = engine.viewFor(bot);
      let events: GameEvent[];
      try {
        events = apply(engine, bot.strategy!.decide(view));
      } catch (err) {
        // Bots are tested to only make legal moves; if one slips through, call rather than stall the game.
        if (err instanceof IllegalActionError && view.currentBid) events = engine.call();
        else throw err;
      }
      handleEvents(events);
      if (!events.some((e) => e instanceof DiceRevealed)) setTypingBid(true);
      bump();
    }, thinkingDelay());

    return () => {
      window.clearTimeout(timer);
      // A move cancelled before it happened (unmount, StrictMode's test cleanup)
      // must be allowed to run again on the next pass.
      if (!moved && lastActedSignatureRef.current === signature) {
        lastActedSignatureRef.current = null;
        setThinkingBot(null);
      }
    };
  }, [screen, awaitingContinue, typingBid, version, handleEvents, bump]);

  const { game } = engineRef.current;
  const human = game.players.find((p) => p.isHuman)!;

  const view = useMemo(
    () => engineRef.current.viewFor(human),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
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

  const isYourTurn = !game.isOver && game.round.currentPlayer.isHuman && !awaitingContinue && !typingBid;

  return {
    view,
    opponents,
    screen,
    isYourTurn,
    awaitingContinue,
    thinkingBot,
    typingBid,
    resolution,
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
