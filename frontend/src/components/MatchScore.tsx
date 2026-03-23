import { motion } from "framer-motion";

interface MatchScoreProps {
  score: number;
  size?: number;
}

export function MatchScore({ score, size = 48 }: MatchScoreProps) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18" cy="18" r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth="2.5"
        />
        <motion.circle
          cx="18" cy="18" r={radius}
          fill="none"
          className="stroke-accent"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-accent">
        {score}%
      </span>
    </div>
  );
}
