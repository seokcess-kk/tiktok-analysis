'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, ChevronRight, Sparkles } from 'lucide-react';

interface AIHubCardProps {
  insightCount: number;
  newInsightCount?: number;
  strategyCount: number;
  pendingStrategyCount?: number;
  insightsHref: string;
  strategiesHref: string;
}

export function AIHubCard({
  insightCount,
  newInsightCount = 0,
  strategyCount,
  pendingStrategyCount = 0,
  insightsHref,
  strategiesHref,
}: AIHubCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI 분석 허브
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 인사이트 */}
        <Link href={insightsHref}>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">AI 인사이트</p>
                <p className="text-sm text-muted-foreground">{insightCount}개 생성됨</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {newInsightCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {newInsightCount} 새로운
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Link>

        {/* 전략 */}
        <Link href={strategiesHref}>
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">AI 전략</p>
                <p className="text-sm text-muted-foreground">{strategyCount}개 제안됨</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingStrategyCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                >
                  {pendingStrategyCount} 대기중
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
