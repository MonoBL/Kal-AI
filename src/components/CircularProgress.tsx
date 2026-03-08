"use client";

type Props = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export default function CircularProgress({ value, max, size = 200, strokeWidth = 14, color = "#007AFF" }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const remaining = Math.max(0, max - value);
  const over = value > max;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#F2F2F7" strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={over ? "#FF3B30" : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</span>
        <span className="text-sm text-[#8E8E93] font-medium">kcal</span>
        <span className={`text-sm font-semibold mt-1 ${over ? "text-[#FF3B30]" : "text-[#007AFF]"}`}>
          {over ? `+${(value - max).toLocaleString()}` : `${remaining.toLocaleString()} left`}
        </span>
      </div>
    </div>
  );
}
