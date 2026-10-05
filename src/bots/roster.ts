import type { BotStrategy } from "../types/botStrategy.js";
import { AggressiveBot } from "./personalities/aggressive.js";
import { CautiousBot } from "./personalities/cautious.js";
import { UnpredictableBot } from "./personalities/unpredictable.js";

export const BOT_STRATEGIES: readonly BotStrategy[] = [new CautiousBot(), new AggressiveBot(), new UnpredictableBot()];
