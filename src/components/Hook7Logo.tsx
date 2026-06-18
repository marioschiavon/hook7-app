interface Hook7LogoProps {
  /** Width and height in pixels (rendered as a square) */
  size?: number;
  className?: string;
}

/**
 * Hook7 brand logo — inline SVG so it always renders correctly
 * regardless of static asset availability.
 */
export function Hook7Logo({ size = 32, className = "" }: Hook7LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hook7"
      role="img"
    >
      <defs>
        <linearGradient id="hook7-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#hook7-grad)" />
      <line x1="24" y1="24" x2="76" y2="24" stroke="white" strokeWidth="11" strokeLinecap="round" />
      <line x1="76" y1="24" x2="40" y2="78" stroke="white" strokeWidth="11" strokeLinecap="round" />
      <path d="M40 78 Q30 90 20 78" stroke="white" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export default Hook7Logo;
