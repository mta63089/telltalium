/** The Telltalium signal mark: a pulse interrupted by a strong anomalous peak. */
export function TelltaliumMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="telltalium-mark"
    >
      <path
        d="M5 33H14L21 23L29 45L38 12L46 36L51 29H59"
        stroke="currentColor"
        strokeWidth="5.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="12" r="4.6" className="telltalium-mark-node" />
    </svg>
  );
}
