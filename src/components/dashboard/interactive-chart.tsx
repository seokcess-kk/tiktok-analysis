'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChartDataPoint } from './performance-chart';

interface InteractiveChartProps {
  data: ChartDataPoint[];
  metrics?: string[];
  title?: string;
  height?: number;
  onDataPointClick?: (dataPoint: ChartDataPoint, metric: string) => void;
  showBrush?: boolean;
  showTrendLine?: boolean;
  highlightAnomalies?: boolean;
}

const metricConfig: Record<string, { label: string; color: string; format: (v: number) => string }> = {
  spend: {
    label: '지출',
    color: '#2563eb',
    format: (v) => `₩${(v / 1000).toFixed(0)}K`,
  },
  impressions: {
    label: '노출수',
    color: '#7c3aed',
    format: (v) => `${(v / 1000).toFixed(0)}K`,
  },
  clicks: {
    label: '클릭수',
    color: '#059669',
    format: (v) => v.toLocaleString(),
  },
  conversions: {
    label: '전환수',
    color: '#dc2626',
    format: (v) => v.toLocaleString(),
  },
  ctr: {
    label: 'CTR',
    color: '#ea580c',
    format: (v) => `${v.toFixed(2)}%`,
  },
  cvr: {
    label: 'CVR',
    color: '#0891b2',
    format: (v) => `${v.toFixed(2)}%`,
  },
  cpa: {
    label: 'CPA',
    color: '#be185d',
    format: (v) => `₩${v.toLocaleString()}`,
  },
  roas: {
    label: 'ROAS',
    color: '#4f46e5',
    format: (v) => `${v.toFixed(2)}x`,
  },
};

export function InteractiveChart({
  data,
  metrics = ['spend', 'conversions'],
  title = '성과 추이',
  height = 350,
  onDataPointClick,
  showBrush = true,
  showTrendLine = false,
  highlightAnomalies = true,
}: InteractiveChartProps) {
  const [zoomDomain, setZoomDomain] = useState<{ start: number; end: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formattedData = useMemo(() => {
    return data.map((d, index) => ({
      ...d,
      index,
      date: new Date(d.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
      fullDate: d.date,
    }));
  }, [data]);

  // 이상치 감지 (평균에서 2 표준편차 이상 벗어난 값)
  const anomalies = useMemo(() => {
    if (!highlightAnomalies) return new Set<number>();

    const anomalyIndices = new Set<number>();

    metrics.forEach((metric) => {
      const values = data.map((d) => d[metric as keyof ChartDataPoint] as number || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );

      values.forEach((value, index) => {
        if (Math.abs(value - mean) > 2 * stdDev) {
          anomalyIndices.add(index);
        }
      });
    });

    return anomalyIndices;
  }, [data, metrics, highlightAnomalies]);

  // 트렌드 계산
  const trends = useMemo(() => {
    const result: Record<string, 'up' | 'down' | 'stable'> = {};

    metrics.forEach((metric) => {
      const values = data.map((d) => d[metric as keyof ChartDataPoint] as number || 0);
      if (values.length < 2) {
        result[metric] = 'stable';
        return;
      }

      const halfIndex = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, halfIndex);
      const secondHalf = values.slice(halfIndex);

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (change > 5) result[metric] = 'up';
      else if (change < -5) result[metric] = 'down';
      else result[metric] = 'stable';
    });

    return result;
  }, [data, metrics]);

  const handleZoomIn = () => {
    const currentStart = zoomDomain?.start ?? 0;
    const currentEnd = zoomDomain?.end ?? formattedData.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.max(Math.floor(range * 0.7), 3);
    const center = Math.floor((currentStart + currentEnd) / 2);

    setZoomDomain({
      start: Math.max(0, center - Math.floor(newRange / 2)),
      end: Math.min(formattedData.length - 1, center + Math.ceil(newRange / 2)),
    });
  };

  const handleZoomOut = () => {
    const currentStart = zoomDomain?.start ?? 0;
    const currentEnd = zoomDomain?.end ?? formattedData.length - 1;
    const range = currentEnd - currentStart;
    const newRange = Math.min(range * 1.5, formattedData.length - 1);
    const center = Math.floor((currentStart + currentEnd) / 2);

    setZoomDomain({
      start: Math.max(0, center - Math.floor(newRange / 2)),
      end: Math.min(formattedData.length - 1, center + Math.ceil(newRange / 2)),
    });
  };

  const handleReset = () => {
    setZoomDomain(null);
    setSelectedPoint(null);
  };

  const handleClick = useCallback(
    (data: any) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        setSelectedPoint(payload.index);
        if (onDataPointClick) {
          onDataPointClick(payload, data.activePayload[0].dataKey);
        }
      }
    },
    [onDataPointClick]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataIndex = payload[0]?.payload?.index;
      const isAnomaly = anomalies.has(dataIndex);

      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-medium">{label}</p>
            {isAnomaly && (
              <Badge variant="destructive" className="text-xs">
                이상치
              </Badge>
            )}
          </div>
          {payload.map((entry: any, index: number) => {
            const config = metricConfig[entry.dataKey];
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span style={{ color: entry.color }}>{config?.label || entry.dataKey}</span>
                <span className="font-medium">
                  {config?.format(entry.value) || entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const displayData = zoomDomain
    ? formattedData.slice(zoomDomain.start, zoomDomain.end + 1)
    : formattedData;

  return (
    <Card className={cn(isFullscreen && 'fixed inset-4 z-50')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {metrics.map((metric) => {
              const trend = trends[metric];
              return (
                <Badge
                  key={metric}
                  variant="outline"
                  className="gap-1"
                  style={{ borderColor: metricConfig[metric]?.color }}
                >
                  {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                  {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                  {metricConfig[metric]?.label}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="확대">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="축소">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} title="초기화">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? '닫기' : '전체화면'}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={isFullscreen ? 500 : height}>
          <LineChart data={displayData} onClick={handleClick}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return v.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* 이상치 하이라이트 영역 */}
            {highlightAnomalies &&
              Array.from(anomalies).map((index) => {
                const dataPoint = formattedData[index];
                if (!dataPoint) return null;
                return (
                  <ReferenceArea
                    key={index}
                    x1={dataPoint.date}
                    x2={dataPoint.date}
                    fill="#fee2e2"
                    fillOpacity={0.5}
                  />
                );
              })}

            {/* 선택된 포인트 하이라이트 */}
            {selectedPoint !== null && formattedData[selectedPoint] && (
              <ReferenceLine
                x={formattedData[selectedPoint].date}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}

            {metrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metricConfig[metric]?.label || metric}
                stroke={metricConfig[metric]?.color || '#8884d8'}
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, index, key } = props;
                  const isAnomaly = anomalies.has(index);
                  const isSelected = selectedPoint === index;

                  if (isAnomaly || isSelected) {
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={isAnomaly ? '#dc2626' : metricConfig[metric]?.color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={key} cx={cx} cy={cy} r={0} fill="transparent" />;
                }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}

            {showBrush && !zoomDomain && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#8884d8"
                onChange={(range: any) => {
                  if (range.startIndex !== undefined && range.endIndex !== undefined) {
                    setZoomDomain({ start: range.startIndex, end: range.endIndex });
                  }
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
