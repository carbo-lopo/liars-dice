import type { ReactNode } from "react";
import { usePhoneLayout } from "../hooks/usePhoneLayout.js";

/** Padding inside the phone layout's felt; the game table's dock reaches past it to the screen's edges. */
export const PHONE_FELT_PADDING = 12;

/**
 * The felt the game is played on. On a wide screen it sits in a wooden rail;
 * on a phone it fills the screen edge to edge, as the rail would cost too much width.
 */
export function TableFrame({ children }: { children: ReactNode }) {
  const phone = usePhoneLayout();
  if (phone) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          position: "relative",
          // Clips without becoming a scroll container, which would stop the table's dock sticking to the screen.
          overflow: "clip",
          background: "var(--felt)",
          padding: PHONE_FELT_PADDING,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c130b",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          background: "var(--wood-rail)",
          borderRadius: 14,
          padding: 16,
          boxSizing: "border-box",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: "100%",
            minHeight: "min(680px, 80vh)",
            position: "relative",
            overflow: "hidden",
            borderRadius: 10,
            background: "var(--felt)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
