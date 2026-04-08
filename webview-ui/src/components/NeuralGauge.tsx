/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// No imports needed from react in this component.

interface NeuralGaugeProps {
  value: number;
  total: number;
  label: string;
  size?: number;
  color?: 'cyan' | 'magenta';
}

export function NeuralGauge({ value, total, label, size = 48, color = 'cyan' }: NeuralGaugeProps) {
  const percentage = Math.min(Math.round((value / total) * 100), 100);
  const radius = size * 0.4;
  const stroke = size * 0.08;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorHex = color === 'cyan' ? 'var(--accent-cyan)' : 'var(--accent-magenta)';

  return (
    <div className="neural-gauge-container" style={{ width: size, height: size }}>
      <svg height={size} width={size} className="neural-gauge-svg">
        <title>{label} Gauge: {percentage}%</title>
        <circle
          stroke="rgba(255, 255, 255, 0.05)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={colorHex}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
          className={percentage > 85 ? 'pulse-error' : ''}
        />
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          className="gauge-text"
          style={{ fontSize: size * 0.22, fill: colorHex }}
        >
          {percentage}%
        </text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  );
}
