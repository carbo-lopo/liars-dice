import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StrictWrapper } from "../test/strictMode";
import { GameMenu } from "./GameMenu";

function renderMenu() {
  const handlers = { onRules: vi.fn(), onOptions: vi.fn(), onQuit: vi.fn() };
  render(
    <div>
      <GameMenu {...handlers} />
      <p>Elsewhere</p>
      <button type="button">Next control</button>
    </div>,
    { wrapper: StrictWrapper },
  );
  return handlers;
}

const menuButton = () => screen.getByRole("button", { name: "Menu" });
const item = (name: string) => screen.queryByRole("button", { name });

describe("GameMenu", () => {
  it("opens to Rules, Options and Quit Game, and closes once one is chosen", () => {
    const { onOptions } = renderMenu();
    expect(item("Options")).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(menuButton());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(["Rules", "Options", "Quit Game"].every((name) => item(name))).toBe(true);

    fireEvent.click(item("Options")!);
    expect(onOptions).toHaveBeenCalledTimes(1);
    expect(item("Options")).toBeNull();
  });

  it("calls the matching handler for each choice", () => {
    const handlers = renderMenu();
    for (const [name, handler] of [
      ["Rules", handlers.onRules],
      ["Quit Game", handlers.onQuit],
    ] as const) {
      fireEvent.click(menuButton());
      fireEvent.click(item(name)!);
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it("closes on Escape, returning focus to the Menu button", () => {
    renderMenu();
    fireEvent.click(menuButton());
    item("Rules")!.focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(item("Rules")).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes when something else is pressed", () => {
    renderMenu();
    fireEvent.click(menuButton());
    fireEvent.pointerDown(screen.getByText("Elsewhere"));
    expect(item("Rules")).toBeNull();
  });

  it("closes when focus moves out of it, as when tabbing away", () => {
    renderMenu();
    fireEvent.click(menuButton());
    fireEvent.blur(item("Quit Game")!, { relatedTarget: screen.getByRole("button", { name: "Next control" }) });
    expect(item("Rules")).toBeNull();
  });

  it("stays open while focus moves between its own items", () => {
    renderMenu();
    fireEvent.click(menuButton());
    fireEvent.blur(item("Rules")!, { relatedTarget: item("Options") });
    expect(item("Rules")).not.toBeNull();
  });
});
