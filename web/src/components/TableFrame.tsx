import type { ReactNode } from "react";

export function TableFrame({ children }: { children: ReactNode }) {
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
