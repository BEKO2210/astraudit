import type { Grade } from "../types/audit";

interface ScoreRingProps {
  score: number;
  max: number;
  grade: Grade;
}

function colorForScore(score: number): { from: string; to: string; ring: string } {
  if (score >= 80) {
    return { from: "#42e8c8", to: "#3a7bff", ring: "#42e8c8" };
  }
  if (score >= 60) {
    return { from: "#7a5cff", to: "#3ad6ff", ring: "#7a5cff" };
  }
  if (score >= 45) {
    return { from: "#ffb547", to: "#ff7a48", ring: "#ffb547" };
  }
  return { from: "#ff7a48", to: "#ff4d6d", ring: "#ff4d6d" };
}

export function ScoreRing({ score, max, grade }: ScoreRingProps) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, score / max)) : 0;
  const dash = circumference * ratio;
  const colors = colorForScore(score);

  return (
    <div className="relative flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={14}
          fill="none"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={14}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[2.6rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Score
        </span>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-semibold leading-none text-white tabular-nums">
          {score}
        </span>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[1.6rem] text-[11px] text-slate-500">
          / {max}
        </span>
      </div>
      <div
        className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
        style={{
          borderColor: `${colors.ring}66`,
          color: colors.ring,
          background: `${colors.ring}11`,
        }}
      >
        {grade}
      </div>
    </div>
  );
}
