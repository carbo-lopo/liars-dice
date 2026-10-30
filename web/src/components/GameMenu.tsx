import { useEffect, useId, useRef, useState } from "react";

export interface GameMenuProps {
  onRules: () => void;
  onOptions: () => void;
  onQuit: () => void;
}

/**
 * The phone layout's one header button, standing in for Rules, Options and
 * Quit Game. It opens a short list of the three; choosing one, pressing
 * Escape, pressing anywhere else, or moving focus out of it closes it.
 */
export function GameMenu({ onRules, onOptions, onQuit }: GameMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const pressOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", pressOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", pressOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "relative" }}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        style={menuButtonStyle}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
      {open && (
        <div id={listId} style={menuListStyle}>
          <button type="button" onClick={choose(onRules)} style={menuItemStyle}>
            Rules
          </button>
          <button type="button" onClick={choose(onOptions)} style={menuItemStyle}>
            Options
          </button>
          <button type="button" onClick={choose(onQuit)} style={menuItemStyle}>
            Quit Game
          </button>
        </div>
      )}
    </div>
  );
}

const menuButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--panel-border)",
  background: "var(--panel-bg)",
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
} as const;

const menuListStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  // Above the table, but below the LIAR! splash, which covers it if a bot calls while the menu is open.
  zIndex: 5,
  minWidth: 180,
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  background: "#163f2f",
  border: "1px solid var(--panel-border)",
  borderRadius: 12,
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.45)",
} as const;

const menuItemStyle = {
  minHeight: 44,
  padding: "0 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
} as const;
