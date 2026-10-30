import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictWrapper } from "../test/strictMode";
import { ContinueButton, LONG_PRESS_MS, type ContinueButtonProps } from "./ContinueButton";

const COUNTDOWN = 2000;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function renderButton(props: Partial<ContinueButtonProps> = {}) {
  const onContinue = vi.fn();
  const view = render(<ContinueButton onContinue={onContinue} autoContinueMs={COUNTDOWN} {...props} />, {
    wrapper: StrictWrapper,
  });
  const rerender = (next: Partial<ContinueButtonProps>) =>
    view.rerender(<ContinueButton onContinue={onContinue} autoContinueMs={COUNTDOWN} {...props} {...next} />);
  return { onContinue, rerender, button: () => screen.getByRole("button", { name: "Continue" }) };
}

/** A pointer event of the given kind; jsdom has no PointerEvent, so `pointerType` is set by hand. */
function press(target: Element, type: "pointerdown" | "pointerup", pointerType: "touch" | "mouse") {
  fireEvent(target, Object.assign(new MouseEvent(type, { bubbles: true }), { pointerType }));
}

const barWidth = () => screen.getByTestId("countdown-bar").style.width;

function setPageHidden(hidden: boolean) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: hidden ? "hidden" : "visible" });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("ContinueButton", () => {
  it("presses itself once its bar has run out", () => {
    const { onContinue } = renderButton();
    expect(barWidth()).toBe("100%");

    act(() => vi.advanceTimersByTime(COUNTDOWN / 2));
    expect(barWidth()).toBe("50%");
    act(() => vi.advanceTimersByTime(COUNTDOWN / 2));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("is named just Continue and describes the countdown separately", () => {
    const { button } = renderButton();
    expect(button()).toHaveProperty("textContent", "Continue");
    const hint = document.getElementById(button().getAttribute("aria-describedby")!);
    expect(hint?.textContent).toMatch(/by itself after 2 seconds/);
  });

  it("pauses while hovered and resumes when the pointer leaves", () => {
    const { onContinue, button } = renderButton();
    act(() => vi.advanceTimersByTime(500));
    fireEvent.mouseEnter(button());
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();
    expect(barWidth()).toBe("75%");

    fireEvent.mouseLeave(button());
    act(() => vi.advanceTimersByTime(1500));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("pauses when touched and held, without the release pressing it, until it's tapped", () => {
    const { onContinue, button } = renderButton();
    act(() => vi.advanceTimersByTime(500));
    press(button(), "pointerdown", "touch");
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    press(button(), "pointerup", "touch");
    fireEvent.click(button());
    expect(onContinue).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    press(button(), "pointerdown", "touch");
    press(button(), "pointerup", "touch");
    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("presses at once for a quick tap", () => {
    const { onContinue, button } = renderButton();
    press(button(), "pointerdown", "touch");
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 100));
    press(button(), "pointerup", "touch");
    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("treats a long mouse press as an ordinary click", () => {
    const { onContinue, button } = renderButton();
    press(button(), "pointerdown", "mouse");
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 2));
    press(button(), "pointerup", "mouse");
    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("pauses while focused, for keyboard users", () => {
    const { onContinue, button } = renderButton();
    act(() => button().focus());
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    act(() => button().blur());
    act(() => vi.advanceTimersByTime(COUNTDOWN));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("pauses while the page is hidden and while paused is set", () => {
    const { onContinue, rerender } = renderButton();
    setPageHidden(true);
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    setPageHidden(false);

    rerender({ paused: true });
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    rerender({ paused: false });
    act(() => vi.advanceTimersByTime(COUNTDOWN));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shows greyed out and doesn't count down or press while disabled", () => {
    const { onContinue, rerender, button } = renderButton({ disabled: true });
    expect(button()).toHaveProperty("disabled", true);
    expect(button().style.visibility).toBe("visible");
    expect(screen.queryByTestId("countdown-bar")).toBeNull();
    fireEvent.click(button());
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    rerender({ disabled: false });
    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("waits for a click when it has no countdown", () => {
    const { onContinue, button } = renderButton({ autoContinueMs: null });
    expect(screen.queryByTestId("countdown-bar")).toBeNull();
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("doesn't count down while hidden, and starts afresh when shown again", () => {
    const { onContinue, rerender, button } = renderButton({ hidden: true });
    act(() => vi.advanceTimersByTime(COUNTDOWN * 5));
    expect(onContinue).not.toHaveBeenCalled();

    rerender({ hidden: false });
    expect(barWidth()).toBe("100%");
    act(() => vi.advanceTimersByTime(COUNTDOWN));
    expect(onContinue).toHaveBeenCalledTimes(1);

    // Clicked while hovered and focused, then hidden: the next countdown must not stay paused.
    fireEvent.mouseEnter(button());
    act(() => button().focus());
    rerender({ hidden: true });
    rerender({ hidden: false });
    act(() => vi.advanceTimersByTime(COUNTDOWN));
    expect(onContinue).toHaveBeenCalledTimes(2);
  });
});
