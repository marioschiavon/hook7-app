import { SVGProps } from "react";
import { motion } from "framer-motion";

interface SparklineProps extends SVGProps<SVGSVGElement> {
  data: number[];
  color?: string;
  strokeWidth?: number;
}

export const Sparkline = ({ 
  data, 
  color = "hsl(217 91% 60%)", // Default electric blue
  strokeWidth = 2,
  className,
  ...props 
}: SparklineProps) => {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Prevent division by zero

  const width = 100;
  const height = 40;
  const padding = strokeWidth;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" L ");

  const pathD = `M ${points}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full overflow-visible ${className || ""}`}
      preserveAspectRatio="none"
      {...props}
    >
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      {/* Glow effect */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth * 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-20 blur-[2px]"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </svg>
  );
};
