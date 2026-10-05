import { BOT_STRATEGIES } from "../bots/roster.js";
import type { Seat } from "../engine/gameEngine.js";
import { MIN_PLAYERS } from "../types/constants.js";

const BOT_NAMES = ["Cora", "Duke", "Ezra", "Faye", "Gus", "Hana", "Ivan"];
const DEFAULT_PLAYER_COUNT = 3;
const MAX_PLAYERS = BOT_NAMES.length + 1;

/** Reads the total player count (including you) from the first command-line argument. */
export function parsePlayerCount(args: readonly string[]): number {
  const raw = args[0];
  if (raw === undefined) return DEFAULT_PLAYER_COUNT;
  const count = Number(raw);
  if (!Number.isInteger(count) || count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new RangeError(`Player count must be a whole number from ${MIN_PLAYERS} to ${MAX_PLAYERS} (got "${raw}").`);
  }
  return count;
}

/** You plus `playerCount - 1` bots, cycling through every strategy. A bot opens the first round. */
export function buildSeats(playerCount: number): Seat[] {
  const bots: Seat[] = BOT_NAMES.slice(0, playerCount - 1).map((name, i) => ({
    name,
    strategy: BOT_STRATEGIES[i % BOT_STRATEGIES.length]!,
  }));
  const [opener, ...rest] = bots;
  return [opener!, { name: "You", strategy: null }, ...rest];
}
