'use client';

type WeatherRiskBadgeProps = {
  risk?: boolean;
  className?: string;
};

export function WeatherRiskBadge({ risk, className = '' }: WeatherRiskBadgeProps) {
  if (!risk) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ${className}`}>
      ⚠ Weather risk
    </span>
  );
}
