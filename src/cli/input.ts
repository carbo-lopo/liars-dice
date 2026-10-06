import { createInterface } from "node:readline/promises";
import { ALL_FACES, type Face } from "../types/face.js";
import type { PlayerAction } from "../types/playerAction.js";

const CALL_WORDS = ["call", "c", "liar", "l"];
const USAGE = 'Enter "bid <quantity> <face>" (e.g. "bid 4 5") or "call".';

type ParseResult = { ok: true; action: PlayerAction } | { ok: false; error: string };

export function parseAction(raw: string): ParseResult {
  const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: USAGE };
  if (tokens.length === 1 && CALL_WORDS.includes(tokens[0]!)) return { ok: true, action: { type: "call" } };

  const args = tokens[0] === "bid" ? tokens.slice(1) : tokens;
  if (args.length !== 2) return { ok: false, error: USAGE };
  if (!args.every((t) => /^\d+$/.test(t))) {
    return { ok: false, error: "Quantity and face must be whole numbers." };
  }

  const [quantity, face] = args.map(Number) as [number, number];
  if (!ALL_FACES.includes(face as Face)) return { ok: false, error: "Face must be from 1 to 6." };
  if (quantity < 1) return { ok: false, error: "Quantity must be at least 1." };
  return { ok: true, action: { type: "bid", bid: { quantity, face: face as Face } } };
}

export class Prompt {
  private readonly rl = createInterface({ input: process.stdin, output: process.stdout });

  async readAction(): Promise<PlayerAction> {
    while (true) {
      const result = parseAction(await this.rl.question('Your move ("bid <qty> <face>" or "call"): '));
      if (result.ok) return result.action;
      console.log(result.error);
    }
  }

  async pause(): Promise<void> {
    await this.rl.question("\n(press Enter to continue) ");
  }

  close(): void {
    this.rl.close();
  }
}
