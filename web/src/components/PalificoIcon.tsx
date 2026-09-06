export function PalificoIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="34" height="34" rx="7" fill="#FBF6E8" stroke="#B8A96F" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="#2B2118" />
      <line x1="6" y1="34" x2="34" y2="6" stroke="#9A3A2C" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
