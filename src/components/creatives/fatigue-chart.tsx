'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface FatigueChartProps {
  data: Array<{
    date: string;
    ctr: number;
    cvr: number;
    impressions?: number;
  }>;
  peakDate?: string | null;
  className?: string;
}

export function FatigueChart({ data, peakDate, className }: FatigueChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 bg-gray-50 rounded-lg', className)}>
        <p className="text-gray-500">데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className={cn('h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)}%`,
              name === 'ctr' ? 'CTR' : 'CVR',
            ]}
            labelFormatter={(label) => {
              const date = new Date(label);
              return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            }}
          />
          {peakDate && (
            <ReferenceLine
              x={peakDate}
              stroke="#8b5cf6"
              strokeDasharray="5 5"
              label={{
                value: '피크',
                fill: '#8b5cf6',
                fontSize: 11,
              }}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ctr"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="ctr"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cvr"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name="cvr"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface FatigueGaugeProps {
  index: number;
  trend: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function FatigueGauge({
  index,
  trend,
  size = 'md',
  showLabel = true,
}: FatigueGaugeProps) {
  const sizes = {
    sm: { width: 80, height: 80, strokeWidth: 8, fontSize: 14 },
    md: { width: 120, height: 120, strokeWidth: 10, fontSize: 18 },
    lg: { width: 160, height: 160, strokeWidth: 12, fontSize: 24 },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (index / 100) * circumference;

  const getColor = (value: number) => {
    if (value >= 80) return '#ef4444'; // red
    if (value >= 60) return '#f97316'; // orange
    if (value >= 40) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const trendLabels: Record<string, { text: string; color: string }> = {
    RISING: { text: '상승', color: 'text-green-600' },
    STABLE: { text: '안정', color: 'text-gray-600' },
    DECLINING: { text: '하락', color: 'text-orange-600' },
    EXHAUSTED: { text: '소진', color: 'text-red-600' },
  };

  const trendInfo = trendLabels[trend] || { text: trend, color: 'text-gray-600' };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={getColor(index)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width, height }}
      >
        <span className="font-bold" style={{ fontSize }}>
          {index}
        </span>
        {showLabel && (
          <span className={cn('text-xs', trendInfo.color)}>
            {trendInfo.text}
          </span>
        )}
      </div>
    </div>
  );
}

export interface FatigueFactorsProps {
  factors: Array<{
    factor: string;
    weight: number;
    value: number;
    contribution: number;
  }>;
}

export function FatigueFactors({ factors }: FatigueFactorsProps) {
  const getBarColor = (value: number) => {
    if (value >= 70) return 'bg-red-500';
    if (value >= 50) return 'bg-orange-500';
    if (value >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-3">
      {factors.map((factor, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{factor.factor}</span>
            <span className="text-gray-500">
              {factor.value.toFixed(0)}점 (가중치 {factor.weight}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getBarColor(factor.value))}
              style={{ width: `${Math.min(factor.value, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
