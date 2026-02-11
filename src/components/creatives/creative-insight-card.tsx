'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BarChart3,
  Timer,
  GitCompare,
  Sparkles,
} from 'lucide-react';

export interface CreativeInsightData {
  id: string;
  type: 'PERFORMANCE' | 'FATIGUE' | 'OPTIMIZATION' | 'COMPARISON';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  details: {
    metrics?: {
      name: string;
      value: number;
      benchmark: number;
      status: 'ABOVE' | 'BELOW' | 'AVERAGE';
    }[];
    trends?: {
      metric: string;
      direction: 'UP' | 'DOWN' | 'STABLE';
      changePercent: number;
    }[];
    comparison?: {
      accountAverage: number;
      creativeValue: number;
      percentile: number;
    };
  };
  recommendations: string[];
  generatedAt?: string;
}

interface CreativeInsightCardProps {
  insight: CreativeInsightData;
  onDismiss?: () => void;
  onGenerateStrategy?: (insightId: string) => void;
  compact?: boolean;
}

const typeConfig = {
  PERFORMANCE: {
    icon: BarChart3,
    label: '성과 분석',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  FATIGUE: {
    icon: Timer,
    label: '피로도',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  OPTIMIZATION: {
    icon: Sparkles,
    label: '최적화',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  COMPARISON: {
    icon: GitCompare,
    label: '비교 분석',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
};

const severityConfig = {
  INFO: {
    icon: Info,
    label: '정보',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    cardBorder: 'border-blue-200',
  },
  WARNING: {
    icon: AlertTriangle,
    label: '주의',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cardBorder: 'border-yellow-200',
  },
  CRITICAL: {
    icon: AlertCircle,
    label: '긴급',
    color: 'bg-red-100 text-red-800 border-red-200',
    cardBorder: 'border-red-200',
  },
};

export function CreativeInsightCard({
  insight,
  onDismiss,
  onGenerateStrategy,
  compact = false,
}: CreativeInsightCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const typeInfo = typeConfig[insight.type];
  const severityInfo = severityConfig[insight.severity];
  const TypeIcon = typeInfo.icon;
  const SeverityIcon = severityInfo.icon;

  return (
    <Card className={cn('transition-all', severityInfo.cardBorder, compact && 'border-l-4')}>
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className={cn('p-1.5 rounded-md', typeInfo.bgColor)}>
              <TypeIcon className={cn('h-4 w-4', typeInfo.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {insight.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', severityInfo.color)}>
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {typeInfo.label}
                </span>
              </div>
            </div>
          </div>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {(expanded || !compact) && (
        <CardContent className={cn('pt-0', compact && 'pb-3')}>
          <p className="text-sm text-muted-foreground mb-3">
            {insight.summary}
          </p>

          {/* Metrics */}
          {insight.details.metrics && insight.details.metrics.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">지표 비교</p>
              <div className="space-y-1">
                {insight.details.metrics.map((metric, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium',
                        metric.status === 'ABOVE' && 'text-green-600',
                        metric.status === 'BELOW' && 'text-red-600',
                        metric.status === 'AVERAGE' && 'text-gray-600',
                      )}>
                        {typeof metric.value === 'number'
                          ? metric.value >= 100
                            ? metric.value.toLocaleString()
                            : metric.value.toFixed(2)
                          : metric.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (기준: {typeof metric.benchmark === 'number'
                          ? metric.benchmark >= 100
                            ? metric.benchmark.toLocaleString()
                            : metric.benchmark.toFixed(2)
                          : metric.benchmark})
                      </span>
                      {metric.status === 'ABOVE' && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {metric.status === 'BELOW' && <TrendingDown className="h-3 w-3 text-red-600" />}
                      {metric.status === 'AVERAGE' && <Minus className="h-3 w-3 text-gray-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends */}
          {insight.details.trends && insight.details.trends.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">추세</p>
              <div className="flex flex-wrap gap-2">
                {insight.details.trends.map((trend, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {trend.metric}
                    {trend.direction === 'UP' && <TrendingUp className="h-3 w-3 ml-1 text-green-600" />}
                    {trend.direction === 'DOWN' && <TrendingDown className="h-3 w-3 ml-1 text-red-600" />}
                    {trend.direction === 'STABLE' && <Minus className="h-3 w-3 ml-1" />}
                    <span className={cn(
                      'ml-1',
                      trend.changePercent > 0 && 'text-green-600',
                      trend.changePercent < 0 && 'text-red-600',
                    )}>
                      {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Comparison */}
          {insight.details.comparison && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">계정 내 위치</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${insight.details.comparison.percentile}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  상위 {100 - insight.details.comparison.percentile}%
                </span>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {insight.recommendations.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                권장 조치
              </p>
              <ul className="space-y-1">
                {insight.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {onGenerateStrategy && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateStrategy(insight.id)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                전략 생성
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                닫기
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface CreativeInsightListProps {
  insights: CreativeInsightData[];
  onGenerateStrategy?: (insightId: string) => void;
  loading?: boolean;
}

export function CreativeInsightList({
  insights,
  onGenerateStrategy,
  loading = false,
}: CreativeInsightListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>생성된 인사이트가 없습니다.</p>
          <p className="text-sm">인사이트 생성 버튼을 클릭하세요.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <CreativeInsightCard
          key={insight.id}
          insight={insight}
          onGenerateStrategy={onGenerateStrategy}
          compact
        />
      ))}
    </div>
  );
}
