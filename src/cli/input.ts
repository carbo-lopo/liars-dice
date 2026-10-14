import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";
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

export class InputClosedError extends Error {
  constructor() {
    super("Input closed.");
  }
}

/**
 * Reads moves and pauses from one queued line reader, so lines typed or
 * pasted ahead of a prompt are kept for the next read instead of dropped.
 */
export class Prompt {
  private readonly rl: Interface;
  private readonly lines: AsyncIterator<string>;

  constructor(
    input: Readable = process.stdin,
    private readonly output: Writable = process.stdout,
  ) {
    this.rl = createInterface({ input, output });
    this.lines = this.rl[Symbol.asyncIterator]();
  }

  async readAction(): Promise<PlayerAction> {
    while (true) {
      const result = parseAction(await this.nextLine('Your move ("bid <qty> <face>" or "call"): '));
      if (result.ok) return result.action;
      this.output.write(`${result.error}\n`);
    }
  }

  async pause(): Promise<void> {
    await this.nextLine("\n(press Enter to continue) ");
  }

  close(): void {
    this.rl.close();
  }

  private async nextLine(prompt: string): Promise<string> {
    this.rl.setPrompt(prompt);
    this.rl.prompt();
    const { value, done } = await this.lines.next();
    if (done) throw new InputClosedError();
    return value;
  }
}
