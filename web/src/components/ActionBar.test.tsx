import { fireEvent, render, screen } from "@testing-library/react";
import type { BiddingRules } from "@engine/rules/bidding.js";
import { describe, expect, it, vi } from "vitest";
import { fakeAudio } from "../test/fakeAudio";
import { ActionBar } from "./ActionBar";

function renderBar(rules: BiddingRules) {
  const onPlaceBid = vi.fn();
  const onCall = vi.fn();
  render(<ActionBar rules={rules} canCall={rules.currentBid !== null} disabled={false} onPlaceBid={onPlaceBid} onCall={onCall} />);
  return { onPlaceBid, onCall };
}

const face = (name: string) => screen.getByRole("button", { name });
const plus = () => screen.getByRole("button", { name: "Increase quantity" });
const placeBid = () => screen.getByRole("button", { name: "Place Bid" });
const callLiar = () => screen.getByRole("button", { name: "Call Liar!" });

describe("ActionBar", () => {
  it("shows each face as its pips, not a number", () => {
    renderBar({ currentBid: null, isPalifico: false, totalDiceInPlay: 10 });
    const names = ["Aces", "Twos", "Threes", "Fours", "Fives", "Sixes"];
    names.forEach((name, i) => {
      expect(face(name).textContent).toBe("");
      expect(face(name).querySelectorAll("[data-pip]")).toHaveLength(i + 1);
    });
  });

  it("stops raising the quantity at the dice in play", () => {
    const { onPlaceBid } = renderBar({ currentBid: { quantity: 3, face: 4 }, isPalifico: false, totalDiceInPlay: 5 });
    fireEvent.click(plus());
    expect(plus()).toHaveProperty("disabled", true);
    fireEvent.click(placeBid());
    expect(onPlaceBid).toHaveBeenCalledWith({ quantity: 5, face: 4 });
  });

  it("greys out faces with no legal bid, such as switching off Aces near the cap", () => {
    renderBar({ currentBid: { quantity: 3, face: 1 }, isPalifico: false, totalDiceInPlay: 5 });
    expect(face("Aces")).toHaveProperty("disabled", false);
    for (const name of ["Twos", "Threes", "Fours", "Fives", "Sixes"]) {
      expect(face(name)).toHaveProperty("disabled", true);
    }
  });

  it("moves to a legal face when the current bid's face can't be raised", () => {
    const { onPlaceBid } = renderBar({ currentBid: { quantity: 5, face: 6 }, isPalifico: false, totalDiceInPlay: 5 });
    expect(face("Aces").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(placeBid());
    expect(onPlaceBid).toHaveBeenCalledWith({ quantity: 3, face: 1 });
  });

  it("offers only the call when nothing can be raised", () => {
    const { onPlaceBid, onCall } = renderBar({ currentBid: { quantity: 5, face: 1 }, isPalifico: false, totalDiceInPlay: 5 });
    expect(screen.getByRole("status").textContent).toMatch(/can’t be raised/);
    expect(placeBid()).toHaveProperty("disabled", true);
    expect(plus()).toHaveProperty("disabled", true);
    fireEvent.click(placeBid());
    expect(onPlaceBid).not.toHaveBeenCalled();

    expect(callLiar()).toHaveProperty("disabled", false);
    fireEvent.click(callLiar());
    expect(onCall).toHaveBeenCalledTimes(1);
  });

  it("still allows any opening bid", () => {
    renderBar({ currentBid: null, isPalifico: false, totalDiceInPlay: 2 });
    expect(screen.queryByRole("status")).toBeNull();
    expect(placeBid()).toHaveProperty("disabled", false);
    for (const name of ["Aces", "Twos", "Threes", "Fours", "Fives", "Sixes"]) {
      expect(face(name)).toHaveProperty("disabled", false);
    }
  });

  it("plays the strong click for Place Bid and Call Liar, and the ordinary one elsewhere", () => {
    const { played, Wrapper } = fakeAudio();
    render(
      <ActionBar
        rules={{ currentBid: { quantity: 2, face: 3 }, isPalifico: false, totalDiceInPlay: 10 }}
        canCall
        disabled={false}
        onPlaceBid={() => {}}
        onCall={() => {}}
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(face("Fours"));
    fireEvent.click(placeBid());
    fireEvent.click(callLiar());
    expect(played).toEqual(["click", "clickStrong", "clickStrong"]);
  });
});
