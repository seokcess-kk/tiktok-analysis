'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
  showTrend = true,
  className,
}: SparklineProps) {
  const { path, trend, trendColor } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', trend: 'neutral' as const, trendColor: 'text-muted-foreground' };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    // 트렌드 계산 (첫 번째 절반 vs 두 번째 절반)
    const halfIndex = Math.floor(data.length / 2);
    const firstHalfAvg = data.slice(0, halfIndex).reduce((a, b) => a + b, 0) / halfIndex;
    const secondHalfAvg = data.slice(halfIndex).reduce((a, b) => a + b, 0) / (data.length - halfIndex);

    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    let trendColor = 'text-muted-foreground';

    if (changePercent > 5) {
      trend = 'up';
      trendColor = 'text-green-600';
    } else if (changePercent < -5) {
      trend = 'down';
      trendColor = 'text-red-600';
    }

    return { path: pathD, trend, trendColor };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Minus className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">데이터 없음</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showTrend && (
        <span className={trendColor}>
          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
          {trend === 'neutral' && <Minus className="h-4 w-4" />}
        </span>
      )}
    </div>
  );
}

// 미니 바 차트 (볼륨 표시용)
interface MiniBarChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function MiniBarChart({
  data,
  width = 60,
  height = 20,
  color = '#3b82f6',
  className,
}: MiniBarChartProps) {
  const bars = useMemo(() => {
    if (data.length === 0) return [];

    const max = Math.max(...data);
    const barWidth = (width - (data.length - 1) * 2) / data.length;

    return data.map((value, index) => {
      const barHeight = max > 0 ? (value / max) * height : 0;
      const x = index * (barWidth + 2);
      const y = height - barHeight;

      return { x, y, width: barWidth, height: barHeight };
    });
  }, [data, width, height]);

  return (
    <svg width={width} height={height} className={className}>
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          fill={color}
          rx={1}
        />
      ))}
    </svg>
  );
}
