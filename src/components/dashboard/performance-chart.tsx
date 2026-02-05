'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ChartDataPoint {
  date: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number;
  cvr?: number;
  cpa?: number;
  roas?: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  metrics?: string[];
  title?: string;
  type?: 'line' | 'bar';
  height?: number;
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

export function PerformanceChart({
  data,
  metrics = ['spend', 'conversions'],
  title = '성과 추이',
  type = 'line',
  height = 300,
}: PerformanceChartProps) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {type === 'line' ? (
            <LineChart data={formattedData}>
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
              {metrics.map((metric) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  name={metricConfig[metric]?.label || metric}
                  stroke={metricConfig[metric]?.color || '#8884d8'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={formattedData}>
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {metrics.map((metric) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  name={metricConfig[metric]?.label || metric}
                  fill={metricConfig[metric]?.color || '#8884d8'}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Metric Selector component for interactive charts
interface MetricSelectorProps {
  selected: string[];
  onChange: (metrics: string[]) => void;
  available?: string[];
}

export function MetricSelector({
  selected,
  onChange,
  available = ['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cvr', 'cpa', 'roas'],
}: MetricSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((metric) => (
        <button
          key={metric}
          onClick={() => {
            if (selected.includes(metric)) {
              onChange(selected.filter((m) => m !== metric));
            } else {
              onChange([...selected, metric]);
            }
          }}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selected.includes(metric)
              ? 'text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          style={{
            backgroundColor: selected.includes(metric)
              ? metricConfig[metric]?.color
              : undefined,
          }}
        >
          {metricConfig[metric]?.label || metric}
        </button>
      ))}
    </div>
  );
}
