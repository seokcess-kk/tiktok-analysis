'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingUp,
  Palette,
  Sparkles,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';

export interface RecentInsight {
  id: string;
  type: 'ANOMALY' | 'TREND' | 'CREATIVE' | 'DAILY_SUMMARY' | 'PREDICTION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  summary: string;
  createdAt: string;
  isRead: boolean;
}

interface RecentInsightsProps {
  insights: RecentInsight[];
  accountId: string;
  limit?: number;
}

const typeConfig = {
  ANOMALY: { icon: AlertTriangle, label: '이상 감지', color: 'text-red-600' },
  TREND: { icon: TrendingUp, label: '트렌드', color: 'text-blue-600' },
  CREATIVE: { icon: Palette, label: '소재 분석', color: 'text-pink-600' },
  DAILY_SUMMARY: { icon: Sparkles, label: '일일 요약', color: 'text-purple-600' },
  PREDICTION: { icon: Lightbulb, label: '예측', color: 'text-yellow-600' },
};

const severityConfig = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-800',
};

export function RecentInsights({ insights, accountId, limit = 5 }: RecentInsightsProps) {
  const displayInsights = insights.slice(0, limit);

  if (displayInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            최근 인사이트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>아직 생성된 인사이트가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          최근 인사이트
        </CardTitle>
        <Link href={`/accounts/${accountId}/insights`}>
          <Button variant="ghost" size="sm">
            전체 보기
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayInsights.map((insight) => {
          const type = typeConfig[insight.type];
          const TypeIcon = type.icon;

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                !insight.isRead ? 'bg-blue-50/50 border-blue-200' : ''
              }`}
            >
              <TypeIcon className={`h-5 w-5 mt-0.5 ${type.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{insight.title}</span>
                  <Badge className={severityConfig[insight.severity]} variant="outline">
                    {insight.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {insight.summary}
                </p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {new Date(insight.createdAt).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
