import { forwardRef, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { COUNTDOWN_TICK_MS, useCountdown } from "../hooks/useCountdown.js";
import { usePageVisible } from "../hooks/usePageVisible.js";
import { prefersReducedMotion } from "../lib/motion.js";

/** How long a counting-down Continue waits before pressing itself. */
export const AUTO_CONTINUE_MS = 10_000;

/** How long a touch on a counting-down Continue must last to pause it rather than press it. */
export const LONG_PRESS_MS = 500;

export interface ContinueButtonProps {
  onContinue: () => void;
  /** Keep the button's space but hide and disable it. */
  hidden?: boolean;
  /** Show the button greyed out and unpressable. */
  disabled?: boolean;
  /** Press itself after this long, shown as a shrinking bar; null to wait for a click. */
  autoContinueMs?: number | null;
  /** Hold the countdown, e.g. while another screen covers the game. */
  paused?: boolean;
  /** Fill the width of its container, larger, as on a phone. */
  block?: boolean;
}

/**
 * The gold Continue button. With a countdown, a highlight bar inside it
 * shrinks to nothing and then the button presses itself; hovering or focusing
 * it, a hidden page, or `paused` all hold the countdown where it is. On a
 * touchscreen, where there's no hovering, touching and holding it pauses the
 * countdown until it's tapped.
 */
export const ContinueButton = forwardRef<HTMLButtonElement, ContinueButtonProps>(function ContinueButton(
  { onContinue, hidden = false, disabled = false, autoContinueMs = null, paused = false, block = false },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [heldByTouch, setHeldByTouch] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  // The release that ends a long press still sends a click; this swallows it.
  const swallowClick = useRef(false);
  const pageVisible = usePageVisible();
  const hintId = useId();

  const unavailable = hidden || disabled;

  // A disabled button can lose the pointer or focus without mouseleave or blur
  // firing, which would leave the next countdown paused for good.
  useEffect(() => {
    if (!unavailable) return;
    setHovered(false);
    setFocused(false);
    setHeldByTouch(false);
  }, [unavailable]);

  const counting = !unavailable && autoContinueMs !== null;
  const held = paused || hovered || focused || heldByTouch || !pageVisible;
  const remaining = useCountdown(counting ? autoContinueMs : null, held, onContinue);
  const seconds = Math.round((autoContinueMs ?? 0) / 1000);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };
  useEffect(() => cancelLongPress, []);

  const startPress = (event: PointerEvent<HTMLButtonElement>) => {
    swallowClick.current = false;
    if (event.pointerType === "mouse" || !counting) return;
    cancelLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      swallowClick.current = true;
      setHeldByTouch(true);
    }, LONG_PRESS_MS);
  };

  const click = () => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    onContinue();
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={click}
        onPointerDown={startPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        // A long press would otherwise open the browser's own menu or select the label.
        onContextMenu={counting ? (event) => event.preventDefault() : undefined}
        disabled={unavailable}
        aria-describedby={counting ? hintId : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...continueButtonStyle,
          ...(block && blockStyle),
          visibility: hidden ? "hidden" : "visible",
          ...(disabled && { opacity: 0.45, cursor: "not-allowed", filter: "grayscale(0.6)" }),
        }}
      >
        {counting && (
          <span
            data-testid="countdown-bar"
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: `${remaining * 100}%`,
              background: "rgba(255, 246, 214, 0.45)",
              transition: prefersReducedMotion() ? "none" : `width ${COUNTDOWN_TICK_MS}ms linear`,
              pointerEvents: "none",
            }}
          />
        )}
        <span style={{ position: "relative" }}>Continue</span>
      </button>
      {counting && (
        <span id={hintId} className="visually-hidden">
          Continues by itself after {seconds} seconds; hovering over or focusing it, or touching and holding it,
          pauses the countdown.
        </span>
      )}
    </>
  );
});

const continueButtonStyle = {
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(var(--gold-strong), var(--gold-deep))",
  color: "var(--ink)",
  border: "1px solid var(--gold-border)",
  borderRadius: 8,
  padding: "12px 24px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
} as const;

const blockStyle = {
  width: "100%",
  minHeight: 56,
  borderRadius: 12,
  fontSize: 18,
} as const;
