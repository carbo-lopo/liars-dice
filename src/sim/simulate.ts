#!/usr/bin/env node
/**
 * Bot-vs-bot simulation harness: plays many full 3-bot games and reports
 * aggregate stats. This is the sanity check that the probability engine +
 * personalities actually produce competitive, differentiated play *before*
 * any human ever sits down -- a personality that wins 0% or 100% of the
 * time, or that never gets challenged, signals a bug or a badly tuned
 * profile rather than "this bot is just better."
 *
 * Run with: npm run sim
 */
import { GameEngine } from "../engine/game.js";
import { decideBotAction } from "../bots/botPlayer.js";
import { seededRng, type Rng } from "../engine/dice.js";
import type { PersonalityName } from "../types.js";

const ALL_PERSONALITIES: PersonalityName[] = ["cautious", "aggressive", "unpredictable"];

interface ChallengeRecord {
  challengerPersonality: PersonalityName;
  correct: boolean;
}

interface GameResult {
  winnerPersonality: PersonalityName;
  rounds: number;
  turns: number;
  challenges: ChallengeRecord[];
  bidQuantitiesByPersonality: Record<PersonalityName, number[]>;
}

function shuffled<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function runGame(seatPersonalities: PersonalityName[], rng: Rng): GameResult {
  const specs = seatPersonalities.map((personality, i) => ({
    id: `p${i}`,
    name: `${personality}-${i}`,
    kind: "bot" as const,
    personality,
  }));
  const engine = new GameEngine(specs, rng);

  const bidQuantitiesByPersonality: Record<PersonalityName, number[]> = {
    cautious: [],
    aggressive: [],
    unpredictable: [],
  };

  let turns = 0;
  const GUARD = 20000;
  while (engine.getPublicSnapshot().phase !== "game-over") {
    turns++;
    if (turns > GUARD) throw new Error("Simulated game did not terminate (possible loop bug).");

    const snap = engine.getPublicSnapshot();
    const current = snap.players[snap.currentPlayerIndex]!;
    const view = engine.getPlayerView(current.id);
    const action = decideBotAction(view, rng);

    if (action.type === "challenge") {
      engine.challenge(current.id);
    } else {
      engine.placeBid(current.id, action.bid);
      bidQuantitiesByPersonality[current.personality!].push(action.bid.quantity);
    }
  }

  const finalSnap = engine.getPublicSnapshot();
  const personalityOf: Record<string, PersonalityName> = {};
  for (const p of finalSnap.players) personalityOf[p.id] = p.personality!;

  const challenges: ChallengeRecord[] = [];
  for (const e of engine.getEventLog()) {
    if (e.type === "reveal") {
      challenges.push({
        challengerPersonality: personalityOf[e.resolution.challengerId]!,
        correct: e.resolution.outcome === "bidder-wrong", // challenger right <=> bidder was lying
      });
    }
  }

  const winner = finalSnap.players.find((p) => p.id === finalSnap.winnerId)!;
  return {
    winnerPersonality: winner.personality!,
    rounds: finalSnap.roundNumber,
    turns,
    challenges,
    bidQuantitiesByPersonality,
  };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

function main() {
  const NUM_GAMES = Number(process.argv[2] ?? 500);
  const rng = seededRng(20260905);

  const wins: Record<PersonalityName, number> = { cautious: 0, aggressive: 0, unpredictable: 0 };
  const challengesMade: Record<PersonalityName, ChallengeRecord[]> = {
    cautious: [],
    aggressive: [],
    unpredictable: [],
  };
  const allBidQuantities: Record<PersonalityName, number[]> = {
    cautious: [],
    aggressive: [],
    unpredictable: [],
  };
  const roundCounts: number[] = [];

  for (let g = 0; g < NUM_GAMES; g++) {
    const seats = shuffled(ALL_PERSONALITIES, rng);
    const result = runGame(seats, rng);
    wins[result.winnerPersonality]++;
    roundCounts.push(result.rounds);
    for (const c of result.challenges) challengesMade[c.challengerPersonality].push(c);
    for (const p of ALL_PERSONALITIES) {
      allBidQuantities[p].push(...result.bidQuantitiesByPersonality[p]);
    }
  }

  console.log(`Simulated ${NUM_GAMES} games (3 bots per game: one of each personality).\n`);

  console.log("Win rate by personality:");
  for (const p of ALL_PERSONALITIES) {
    const rate = ((wins[p] / NUM_GAMES) * 100).toFixed(1);
    console.log(`  ${p.padEnd(13)} ${rate}%  (${wins[p]}/${NUM_GAMES})`);
  }

  console.log(`\nAverage game length: ${mean(roundCounts).toFixed(1)} rounds`);
  console.log(`  (min ${Math.min(...roundCounts)}, max ${Math.max(...roundCounts)})`);

  console.log("\nChallenge accuracy by personality (was calling 'liar' the right call?):");
  for (const p of ALL_PERSONALITIES) {
    const records = challengesMade[p];
    const correct = records.filter((r) => r.correct).length;
    const pct = records.length ? ((correct / records.length) * 100).toFixed(1) : "n/a";
    console.log(
      `  ${p.padEnd(13)} ${pct}%  correct  (${correct}/${records.length} challenges, ${(records.length / NUM_GAMES).toFixed(2)} per game)`,
    );
  }

  console.log("\nAverage bid quantity placed (aggression proxy):");
  for (const p of ALL_PERSONALITIES) {
    console.log(`  ${p.padEnd(13)} ${mean(allBidQuantities[p]).toFixed(2)}`);
  }
}

main();
