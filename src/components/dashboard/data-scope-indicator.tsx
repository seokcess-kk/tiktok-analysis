'use client';

import { Building2, Megaphone, Layers, FileImage, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DataScopeIndicatorProps {
  scope: 'account' | 'campaign' | 'adgroup' | 'ad';
  scopeName: string;
  dateRange?: { from: string; to: string };
  className?: string;
}

const scopeConfig = {
  account: {
    icon: Building2,
    label: '전체 계정',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  campaign: {
    icon: Megaphone,
    label: '캠페인',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  adgroup: {
    icon: Layers,
    label: '광고그룹',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  ad: {
    icon: FileImage,
    label: '광고',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
};

export function DataScopeIndicator({
  scope,
  scopeName,
  dateRange,
  className,
}: DataScopeIndicatorProps) {
  const config = scopeConfig[scope];
  const Icon = config.icon;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${className || ''}`}>
      {/* 데이터 범위 */}
      <Badge variant="secondary" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}: {scopeName}
      </Badge>

      {/* 기간 표시 */}
      {dateRange && (
        <Badge variant="outline" className="text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(dateRange.from), 'M/d', { locale: ko })} -{' '}
          {format(new Date(dateRange.to), 'M/d', { locale: ko })}
        </Badge>
      )}
    </div>
  );
}
