import type { Face } from "@engine/types/face.js";
import { Die } from "./Die.js";
import { useEffect, useRef } from "react";
import { useSound } from "../audio/SoundProvider.js";
import { useDiceRoll } from "../hooks/useDiceRoll.js";
import { prefersReducedMotion } from "../lib/motion.js";

export interface HandRowProps {
  dice: readonly Face[];
  selectedFace?: Face | null;
  onesWild: boolean;
  label?: string;
  size?: number;
  /** Play the start-of-round roll; `onRolled` fires once every die has landed. */
  rolling?: boolean;
  onRolled?: () => void;
}

export function HandRow({
  dice,
  selectedFace,
  onesWild,
  label = "Your hand",
  size = 52,
  rolling = false,
  onRolled,
}: HandRowProps) {
  const { landed, spinFaces } = useDiceRoll(dice.length, rolling, () => onRolled?.());
  const { playSound, playShake } = useSound();

  // One shake as a roll starts, then a landing sound for each die. The refs keep
  // StrictMode's second run of these effects from playing anything twice.
  const shookRef = useRef(false);
  const landedSoFarRef = useRef(0);
  const animated = rolling && dice.length > 0 && !prefersReducedMotion();
  useEffect(() => {
    if (!animated) {
      shookRef.current = false;
      landedSoFarRef.current = 0;
      return;
    }
    if (!shookRef.current) {
      shookRef.current = true;
      playShake();
    }
  }, [animated, playShake]);
  useEffect(() => {
    if (!animated) return;
    // Several dice can land in one render if their timers fire together.
    for (let die = landedSoFarRef.current; die < landed; die++) playSound("dieLand");
    landedSoFarRef.current = Math.max(landedSoFarRef.current, landed);
  }, [animated, landed, playSound]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#E7D9B8" }}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        {dice.map((face, i) => {
          if (rolling && i >= landed) {
            return <Die key={i} face={spinFaces[i] ?? face} size={size} spinning className="die-rolling" />;
          }
          const counts =
            selectedFace != null && (face === selectedFace || (onesWild && face === 1 && selectedFace !== 1));
          return (
            <Die
              key={i}
              face={face}
              size={size}
              countsToward={counts ? selectedFace : undefined}
              className={rolling ? "die-landed" : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
