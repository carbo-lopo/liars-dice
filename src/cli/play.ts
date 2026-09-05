#!/usr/bin/env node
/**
 * Minimal text CLI for playing Liar's Dice against two bots. This exists so
 * the gameflow and bot decision-making can be felt and iterated on before
 * any visuals/animations are built -- it drives the exact same GameEngine
 * and decideBotAction that a future web UI will call.
 *
 * Run with: npm run play
 */
import { createInterface } from "node:readline/promises";
import { GameEngine, IllegalActionError } from "../engine/game.js";
import { decideBotAction } from "../bots/botPlayer.js";
import type { Bid, GameEvent, Player } from "../types.js";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function playerOf(players: readonly Player[], id: string): Player {
  const p = players.find((pl) => pl.id === id);
  // Falls back to a throwaway bot-shaped stub so a lookup miss can never
  // crash formatting -- it just conjugates as third person, worst case.
  return p ?? { id, name: id, kind: "bot", dice: [], eliminated: false };
}

/**
 * Tiny present-tense agreement helper: "You" (second person) takes the bare
 * verb ("You bid", "You call", "You lose"), while a named bot (third person
 * singular) takes the "-s" form ("Duke bids", "Cora calls", "Cora loses").
 * Every verb this CLI uses (bid/call/lose) is a regular "+s" verb, so this
 * stays deliberately simple rather than a general conjugator.
 */
function conjugate(player: Player, base: string): string {
  return player.kind === "human" ? base : `${base}s`;
}

function formatEvent(e: GameEvent, players: readonly Player[]): string | null {
  switch (e.type) {
    case "game-started":
      return null;
    case "round-started": {
      const counts = Object.entries(e.diceCounts)
        .map(([id, c]) => `${playerOf(players, id).name}: ${c}`)
        .join("  |  ");
      // Show the player's own hand the instant a new round begins, not only
      // once it's their turn -- otherwise, whenever a bot bids first (e.g.
      // every round 1, since seating goes Cora -> You -> Duke), the very
      // first thing on screen is a bot's move with the player's own dice
      // nowhere in sight.
      const human = players.find((p) => p.kind === "human");
      const handLine = human ? `\nYour hand: [${human.dice.join("] [")}]` : "";
      return `\n----- Round ${e.roundNumber} -----\n(${counts})${handLine}`;
    }
    case "palifico-declared":
      return `\n*** PALIFICO *** ${playerOf(players, e.playerId).name} is down to one die -- no wild 1s this round, and every bid must stay on face [${e.face}].`;
    case "bid-placed": {
      const bidder = playerOf(players, e.playerId);
      return `${bidder.name} ${conjugate(bidder, "bid")}: ${e.bid.quantity} x [${e.bid.face}]`;
    }
    case "challenge": {
      const challenger = playerOf(players, e.challengerId);
      const bidder = playerOf(players, e.bidderId);
      return `\n${challenger.name} ${conjugate(challenger, "call")} LIAR on ${bidder.name}'s bid of ${e.bid.quantity} x [${e.bid.face}]!`;
    }
    case "reveal": {
      const lines = Object.entries(e.resolution.reveal)
        .map(([id, dice]) => `   ${playerOf(players, id).name}: [${dice.join("] [")}]`)
        .join("\n");
      const loser = playerOf(
        players,
        e.resolution.outcome === "bidder-right" ? e.resolution.challengerId : e.resolution.bidderId,
      );
      const verdict =
        e.resolution.outcome === "bidder-right"
          ? `The bid was TRUE (actual count: ${e.resolution.actualCount}). ${loser.name} ${conjugate(loser, "lose")} a die.`
          : `The bid was FALSE (actual count: ${e.resolution.actualCount}). ${loser.name} ${conjugate(loser, "lose")} a die.`;
      return `All dice revealed:\n${lines}\n${verdict}`;
    }
    case "player-eliminated":
      return `${playerOf(players, e.playerId).name} is out of dice and eliminated!`;
    case "game-over": {
      const winner = playerOf(players, e.winnerId);
      return `\n=== ${winner.name} ${conjugate(winner, "win")} the game! ===`;
    }
  }
}

function printNewEvents(engine: GameEngine, from: number): number {
  const { events, nextIndex } = engine.drainNewEvents(from);
  const players = engine.getPublicSnapshot().players;
  for (const e of events) {
    const line = formatEvent(e, players);
    if (line) console.log(line);
  }
  return nextIndex;
}

/**
 * Blocks until the player presses Enter. Used after every bot action so a
 * flurry of bot-vs-bot activity (a raise, then the next bot's response, then
 * a challenge and reveal) can't blow past the player unread -- each beat
 * waits for an explicit "I've read this" before the next one plays out.
 */
async function pause(): Promise<void> {
  await rl.question("\n(press Enter to continue) ");
}

function parseHumanInput(raw: string): { type: "challenge" } | { type: "bid"; bid: Bid } | null {
  const input = raw.trim().toLowerCase();
  if (["call", "challenge", "liar", "l", "c"].includes(input)) return { type: "challenge" };
  const nums = input.match(/\d+/g);
  if (!nums || nums.length < 2) return null;
  const quantity = parseInt(nums[0]!, 10);
  const face = parseInt(nums[1]!, 10);
  if (!(face >= 1 && face <= 6) || quantity < 1) return null;
  return { type: "bid", bid: { quantity, face: face as Bid["face"] } };
}

async function humanTurn(engine: GameEngine, humanId: string) {
  const view = engine.getPlayerView(humanId);
  console.log(`\nYour hand: [${view.self.dice.join("] [")}]`);
  console.log(
    `Opponents: ${view.others.map((o) => `${o.name} (${o.diceCount} dice)`).join("  |  ")}`,
  );
  if (view.currentBid) {
    console.log(`Current bid: ${view.currentBid.quantity} x [${view.currentBid.face}]`);
  } else {
    console.log("You open the bidding this round.");
  }
  if (view.isPalificoRound) {
    console.log(
      `(Palifico: no wild 1s${view.palificoFace ? `, all bids locked to face [${view.palificoFace}]` : ", you set the locked face with your opening bid"})`,
    );
  }

  while (true) {
    const raw = await rl.question("Your move (\"bid <qty> <face>\" or \"call\"): ");
    const parsed = parseHumanInput(raw);
    if (!parsed) {
      console.log('Could not parse that. Try e.g. "bid 4 5" or "call".');
      continue;
    }
    try {
      if (parsed.type === "challenge") {
        engine.challenge(humanId);
      } else {
        engine.placeBid(humanId, parsed.bid);
      }
      return;
    } catch (err) {
      if (err instanceof IllegalActionError) {
        console.log(`Illegal move: ${err.message}`);
        continue;
      }
      throw err;
    }
  }
}

function botTurn(engine: GameEngine, botId: string) {
  const view = engine.getPlayerView(botId);
  const action = decideBotAction(view);
  try {
    if (action.type === "challenge") {
      engine.challenge(botId);
    } else {
      engine.placeBid(botId, action.bid);
    }
  } catch (err) {
    // Defensive fallback only -- decideBotAction is expected to always
    // produce a legal action (see tests/bots.test.ts). If something
    // unexpected slips through, don't hang the game: challenge instead.
    if (err instanceof IllegalActionError && view.currentBid) {
      engine.challenge(botId);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log("=== Liar's Dice ===");
  console.log("3 players: you, Cora (cautious), and Duke (aggressive).");
  console.log("Seating order: Cora -> You -> Duke -> Cora -> ...\n");

  const engine = new GameEngine([
    { id: "cora", name: "Cora", kind: "bot", personality: "cautious" },
    { id: "you", name: "You", kind: "human" },
    { id: "duke", name: "Duke", kind: "bot", personality: "aggressive" },
  ]);

  let eventCursor = 0;
  eventCursor = printNewEvents(engine, eventCursor);

  // Cora opens round 1's bidding (seating is Cora -> You -> Duke), so on a
  // fresh game there can be bot moves before the player has acted even
  // once. Don't make them clear a "press Enter to continue" for those --
  // there's nothing of theirs to protect yet. Once they've taken their
  // first turn, pausing resumes normally for every bot action after that.
  let humanHasActed = false;

  while (engine.getPublicSnapshot().phase !== "game-over") {
    const snap = engine.getPublicSnapshot();
    const current = snap.players[snap.currentPlayerIndex]!;

    if (current.kind === "human") {
      await humanTurn(engine, current.id);
      eventCursor = printNewEvents(engine, eventCursor);
      humanHasActed = true;
    } else {
      botTurn(engine, current.id);
      eventCursor = printNewEvents(engine, eventCursor);
      if (humanHasActed && engine.getPublicSnapshot().phase !== "game-over") {
        await pause();
      }
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
