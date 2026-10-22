import { render, screen } from "@testing-library/react";
import { GameEngine } from "@engine/engine/gameEngine.js";
import { DiceRevealed } from "@engine/events/gameEvent.js";
import type { BotStrategy } from "@engine/types/botStrategy.js";
import { describe, expect, it } from "vitest";
import { SettingsProvider } from "../settings/settings";
import { MainScreen, type MainScreenProps } from "./MainScreen";

const bot: BotStrategy = { id: "idle", label: "Idle", decide: () => ({ type: "call" }) };

/** Cora opens with 2 × Fives and the player calls: the table as it stood, and the call. */
function tableAtCall() {
  const engine = GameEngine.start([
    { name: "Cora", strategy: bot },
    { name: "You", strategy: null },
  ]);
  engine.bid({ quantity: 2, face: 5 });
  const you = engine.game.players.find((p) => p.isHuman)!;
  const view = engine.viewFor(you);
  const resolution = engine.call().find((e): e is DiceRevealed => e instanceof DiceRevealed)!.resolution;
  return { view, resolution };
}

function renderMain(overrides: Partial<MainScreenProps>) {
  const { view, resolution } = tableAtCall();
  const noop = () => {};
  render(
    <SettingsProvider>
      <MainScreen
        view={view}
        opponents={[{ name: "Cora", strategyId: "idle", strategyLabel: "Idle", diceCount: 5, eliminated: false }]}
        isYourTurn={false}
        awaitingContinue={false}
        covered={false}
        challenge={resolution}
        onContinueChallenge={noop}
        thinkingBot={null}
        rolling={false}
        typingBid={false}
        error={null}
        onPlaceBid={noop}
        onCall={noop}
        onContinueBotAction={noop}
        onBidTyped={noop}
        onRolled={noop}
        onQuit={noop}
        onRules={noop}
        onOptions={noop}
        {...overrides}
      />
    </SettingsProvider>,
  );
}

describe("MainScreen", () => {
  it("puts the table behind the challenge splash out of reach, but not the splash's Continue", () => {
    renderMain({});
    for (const name of ["Rules", "Options", "Quit Game"]) {
      expect(screen.getByText(name).closest("[inert]")).not.toBeNull();
    }
    const splashContinue = screen.getByRole("button", { name: "Continue" });
    expect(splashContinue.closest("[inert]")).toBeNull();
  });

  it("leaves the table reachable when there is no splash", () => {
    renderMain({ challenge: null });
    expect(document.querySelector("[inert]")).toBeNull();
  });
});
