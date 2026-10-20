import type { Face } from "@engine/types/face.js";
import { Die } from "./Die.js";

export interface HandRowProps {
  dice: readonly Face[];
  selectedFace?: Face | null;
  onesWild: boolean;
  label?: string;
  size?: number;
}

export function HandRow({ dice, selectedFace, onesWild, label = "Your hand", size = 52 }: HandRowProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#E7D9B8" }}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        {dice.map((face, i) => {
          const counts =
            selectedFace != null && (face === selectedFace || (onesWild && face === 1 && selectedFace !== 1));
          return <Die key={i} face={face} size={size} countsToward={counts ? selectedFace : undefined} />;
        })}
      </div>
    </div>
  );
}
