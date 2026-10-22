import { forwardRef } from "react";

/** A small toggle that speeds up the dice reveal; lit while on. */
export const FastForwardButton = forwardRef<HTMLButtonElement, { on: boolean; onToggle: () => void }>(
  function FastForwardButton({ on, onToggle }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={on}
        aria-label="Fast forward"
        title={on ? "Fast forward is on" : "Fast forward"}
        onClick={onToggle}
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: on ? "var(--parchment)" : "var(--panel-bg)",
          border: on ? "2px solid var(--gold)" : "1px solid var(--panel-border)",
          color: on ? "var(--ink)" : "var(--text-secondary)",
        }}
      >
        <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
          <path d="M1 1 L9 7 L1 13 Z M10 1 L18 7 L10 13 Z" fill="currentColor" />
        </svg>
      </button>
    );
  },
);
