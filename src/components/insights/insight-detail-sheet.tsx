'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from './sparkline';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  Image,
  ExternalLink,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface InsightMetric {
  label: string;
  value: number;
  change: number;
  data?: number[];
}

interface RelatedItem {
  id: string;
  type: 'campaign' | 'adgroup' | 'creative';
  name: string;
  href: string;
}

export interface InsightDetail {
  id: string;
  type: string;
  severity: string;
  title: string;
  summary: string;
  details?: string;
  metrics?: InsightMetric[];
  relatedItems?: RelatedItem[];
  recommendations?: string[];
  createdAt: string;
  isRead: boolean;
}

interface InsightDetailSheetProps {
  insight: InsightDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onMarkAsRead?: (id: string) => void;
  onConvertToStrategy?: (id: string) => void;
}

const severityConfig = {
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Lightbulb },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Lightbulb },
  INFO: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: Lightbulb },
};

const typeLabels: Record<string, string> = {
  ANOMALY: '이상 감지',
  TREND: '트렌드',
  OPPORTUNITY: '기회 발견',
  CREATIVE: '소재 분석',
  BUDGET: '예산 관리',
  AUDIENCE: '타겟 분석',
};

const itemTypeIcons = {
  campaign: Target,
  adgroup: Target,
  creative: Image,
};

export function InsightDetailSheet({
  insight,
  open,
  onOpenChange,
  accountId,
  onMarkAsRead,
  onConvertToStrategy,
}: InsightDetailSheetProps) {
  if (!insight) return null;

  const config = severityConfig[insight.severity as keyof typeof severityConfig] || severityConfig.INFO;
  const SeverityIcon = config.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.bg}`}>
              <SeverityIcon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">{insight.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{typeLabels[insight.type] || insight.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(insight.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div>
            <p className="text-sm leading-relaxed">{insight.summary}</p>
            {insight.details && (
              <p className="text-sm text-muted-foreground mt-2">{insight.details}</p>
            )}
          </div>

          {/* Metrics */}
          {insight.metrics && insight.metrics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">주요 지표</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insight.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                      {metric.data && <Sparkline data={metric.data} width={60} height={20} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{metric.value.toLocaleString()}</span>
                      <span
                        className={`text-xs ${
                          metric.change > 0
                            ? 'text-green-600'
                            : metric.change < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {metric.change > 0 ? '+' : ''}
                        {metric.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Related Items */}
          {insight.relatedItems && insight.relatedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">관련 항목</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insight.relatedItems.map((item) => {
                  const ItemIcon = itemTypeIcons[item.type];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ItemIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {insight.recommendations && insight.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">권장 액션</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insight.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            {onConvertToStrategy && (
              <Button
                className="flex-1"
                onClick={() => onConvertToStrategy(insight.id)}
              >
                <Target className="h-4 w-4 mr-2" />
                전략으로 전환
              </Button>
            )}
            {onMarkAsRead && !insight.isRead && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onMarkAsRead(insight.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                읽음으로 표시
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
