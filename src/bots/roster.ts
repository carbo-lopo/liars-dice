import type { BotStrategy } from "../types/botStrategy.js";
import { AggressiveMatrixBot } from "./matrix/aggressiveMatrixBot.js";
import { CautiousMatrixBot } from "./matrix/cautiousMatrixBot.js";
import { UnpredictableMatrixBot } from "./matrix/unpredictableMatrixBot.js";

export const BOT_STRATEGIES: readonly BotStrategy[] = [
  new CautiousMatrixBot(),
  new AggressiveMatrixBot(),
  new UnpredictableMatrixBot(),
];
