interface Hook7LogoProps {
  /** Width and height in pixels (rendered as a square) */
  size?: number;
  className?: string;
}

/**
 * Hook7 brand logo — uses the same artwork as the favicon (/logo-512.png)
 * so the in-app logo and the browser favicon always match.
 */
export function Hook7Logo({ size = 32, className = "" }: Hook7LogoProps) {
  return (
    <img
      src="/logo-512.png"
      width={size}
      height={size}
      className={className}
      alt="Hook7"
    />
  );
}

export default Hook7Logo;
