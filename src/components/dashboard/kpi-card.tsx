'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  Percent,
  ArrowRightLeft,
} from 'lucide-react';

export interface KpiData {
  label: string;
  value: number;
  previousValue?: number;
  format: 'number' | 'currency' | 'percent' | 'decimal';
  prefix?: string;
  suffix?: string;
  icon?: 'spend' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'cvr' | 'cpa' | 'roas';
}

interface KpiCardProps {
  data: KpiData;
  className?: string;
}

const iconMap = {
  spend: DollarSign,
  impressions: Eye,
  clicks: MousePointer,
  conversions: Target,
  ctr: Percent,
  cvr: ArrowRightLeft,
  cpa: DollarSign,
  roas: TrendingUp,
};

function formatValue(value: number, format: KpiData['format'], prefix?: string, suffix?: string): string {
  let formatted: string;

  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
      }).format(value);
      break;
    case 'percent':
      formatted = `${value.toFixed(2)}%`;
      break;
    case 'decimal':
      formatted = value.toFixed(2);
      break;
    default:
      formatted = new Intl.NumberFormat('ko-KR').format(Math.round(value));
  }

  if (prefix) formatted = `${prefix}${formatted}`;
  if (suffix) formatted = `${formatted}${suffix}`;

  return formatted;
}

function calculateChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0) return { value: 0, direction: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'neutral',
  };
}

export function KpiCard({ data, className }: KpiCardProps) {
  const Icon = data.icon ? iconMap[data.icon] : null;
  const change = data.previousValue !== undefined
    ? calculateChange(data.value, data.previousValue)
    : null;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.label}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(data.value, data.format, data.prefix, data.suffix)}
        </div>
        {change && (
          <div className="flex items-center text-xs mt-1">
            {change.direction === 'up' && (
              <>
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                <span className="text-green-600">+{change.value.toFixed(1)}%</span>
              </>
            )}
            {change.direction === 'down' && (
              <>
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                <span className="text-red-600">-{change.value.toFixed(1)}%</span>
              </>
            )}
            {change.direction === 'neutral' && (
              <>
                <Minus className="h-3 w-3 text-muted-foreground mr-1" />
                <span className="text-muted-foreground">변동 없음</span>
              </>
            )}
            <span className="text-muted-foreground ml-1">vs 이전 기간</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KpiGridProps {
  kpis: KpiData[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KpiCard key={index} data={kpi} />
      ))}
    </div>
  );
}
