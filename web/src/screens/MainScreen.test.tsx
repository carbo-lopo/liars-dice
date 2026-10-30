import { fireEvent, render, screen } from "@testing-library/react";
import { GameEngine } from "@engine/engine/gameEngine.js";
import { DiceRevealed } from "@engine/events/gameEvent.js";
import type { BotStrategy } from "@engine/types/botStrategy.js";
import { describe, expect, it, vi } from "vitest";
import { stubPhoneScreen } from "../test/phone";
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

  it("folds Rules, Options and Quit Game into one Menu on a phone", () => {
    stubPhoneScreen();
    const onRules = vi.fn();
    renderMain({ challenge: null, onRules });
    expect(screen.queryByRole("button", { name: "Rules" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Quit Game" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Rules" }));
    expect(onRules).toHaveBeenCalledTimes(1);
  });

  it("puts the hand and the bid controls together at the bottom on a phone", () => {
    stubPhoneScreen();
    renderMain({ challenge: null, isYourTurn: true });
    const hand = screen.getByText("Your hand");
    const placeBid = screen.getByRole("button", { name: "Place Bid" });
    const history = screen.getByText("This round");
    const dock = screen.getByTestId("dock");
    expect(dock.contains(placeBid)).toBe(true);
    expect(dock.contains(hand)).toBe(true);
    expect(dock.contains(history)).toBe(false);
    expect(history.compareDocumentPosition(hand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows an error inside the dock on a phone, where the dock can't cover it", () => {
    stubPhoneScreen();
    renderMain({ challenge: null, isYourTurn: true, error: "That bid isn't high enough." });
    expect(screen.getByTestId("dock").contains(screen.getByRole("alert"))).toBe(true);
  });

  it("keeps the separate header buttons on a wide screen", () => {
    renderMain({ challenge: null });
    expect(screen.queryByRole("button", { name: "Menu" })).toBeNull();
    expect(screen.getByRole("button", { name: "Quit Game" })).toBeTruthy();
  });

  it("leaves the table reachable when there is no splash", () => {
    renderMain({ challenge: null });
    expect(document.querySelector("[inert]")).toBeNull();
  });
});
