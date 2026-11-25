export function VeyraMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="veyra-mark"
    >
      <path
        d="M6 11H20L32 42L44 11H58L36.7 56H27.3L6 11Z"
        fill="currentColor"
      />
      <path d="M22 11H34L40.6 24.5L34.2 37.8L22 11Z" fill="#10110F" />
      <path d="M43 8H60L55.5 18H38.5L43 8Z" fill="currentColor" opacity=".65" />
    </svg>
  );
}
