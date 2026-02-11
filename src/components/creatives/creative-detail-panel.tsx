'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreativeInsightList,
  type CreativeInsightData,
} from './creative-insight-card';
import {
  CreativeStrategyList,
  type CreativeStrategyData,
} from './creative-strategy-list';
import {
  Sparkles,
  Loader2,
  BarChart3,
  Target,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  Video,
  Image,
  Layers,
} from 'lucide-react';

export interface CreativeDetailData {
  id: string;
  tiktokCreativeId: string;
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  duration?: number;
  tags?: string[];
  thumbnailUrl?: string;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
  fatigue: {
    index: number;
    trend: 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED';
    daysActive: number;
    recommendedAction?: string;
  };
  score?: {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    percentile: number;
  };
}

interface CreativeDetailPanelProps {
  creative: CreativeDetailData;
  insights: CreativeInsightData[];
  strategies: CreativeStrategyData[];
  onGenerateInsights?: () => void;
  onGenerateStrategies?: () => void;
  onAcceptStrategy?: (id: string) => void;
  onRejectStrategy?: (id: string, reason: string) => void;
  generatingInsights?: boolean;
  generatingStrategies?: boolean;
}

const typeIcons = {
  VIDEO: Video,
  IMAGE: Image,
  CAROUSEL: Layers,
};

const trendIcons = {
  RISING: TrendingUp,
  STABLE: Minus,
  DECLINING: TrendingDown,
  EXHAUSTED: TrendingDown,
};

const trendColors = {
  RISING: 'text-green-600',
  STABLE: 'text-gray-600',
  DECLINING: 'text-orange-600',
  EXHAUSTED: 'text-red-600',
};

const gradeColors = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

export function CreativeDetailPanel({
  creative,
  insights,
  strategies,
  onGenerateInsights,
  onGenerateStrategies,
  onAcceptStrategy,
  onRejectStrategy,
  generatingInsights = false,
  generatingStrategies = false,
}: CreativeDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const TypeIcon = typeIcons[creative.type];
  const TrendIcon = trendIcons[creative.fatigue.trend];

  const fatigueColor =
    creative.fatigue.index >= 80 ? 'text-red-600' :
    creative.fatigue.index >= 60 ? 'text-orange-600' :
    creative.fatigue.index >= 40 ? 'text-yellow-600' :
    'text-green-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <TypeIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {creative.tiktokCreativeId}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{creative.type}</Badge>
                  {creative.duration && (
                    <Badge variant="secondary">{creative.duration}초</Badge>
                  )}
                  {creative.score && (
                    <Badge className={cn('text-white', gradeColors[creative.score.grade])}>
                      {creative.score.grade}등급
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateInsights}
                disabled={generatingInsights}
              >
                {generatingInsights ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-1" />
                )}
                인사이트 생성
              </Button>
              <Button
                size="sm"
                onClick={onGenerateStrategies}
                disabled={generatingStrategies || insights.length === 0}
              >
                {generatingStrategies ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                전략 생성
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="text-xl font-bold">{creative.metrics.ctr.toFixed(2)}%</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">ROAS</p>
              <p className="text-xl font-bold">{creative.metrics.roas.toFixed(2)}x</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CPA</p>
              <p className="text-xl font-bold">{creative.metrics.cpa.toLocaleString()}원</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">피로도</p>
              <div className="flex items-center justify-center gap-1">
                <p className={cn('text-xl font-bold', fatigueColor)}>
                  {creative.fatigue.index}%
                </p>
                <TrendIcon className={cn('h-4 w-4', trendColors[creative.fatigue.trend])} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="insights" className="relative">
            인사이트
            {insights.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {insights.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="strategies" className="relative">
            전략
            {strategies.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {strategies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fatigue">피로도</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">성과 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">지출</p>
                  <p className="text-lg font-medium">
                    {creative.metrics.spend.toLocaleString()}원
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">노출</p>
                  <p className="text-lg font-medium">
                    {creative.metrics.impressions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">클릭</p>
                  <p className="text-lg font-medium">
                    {creative.metrics.clicks.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">전환</p>
                  <p className="text-lg font-medium">
                    {creative.metrics.conversions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-medium">{creative.metrics.ctr.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CVR</p>
                  <p className="text-lg font-medium">{creative.metrics.cvr.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <p className="text-lg font-medium">
                    {Math.round(creative.metrics.spend / (creative.metrics.clicks || 1)).toLocaleString()}원
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPM</p>
                  <p className="text-lg font-medium">
                    {Math.round((creative.metrics.spend / (creative.metrics.impressions || 1)) * 1000).toLocaleString()}원
                  </p>
                </div>
              </div>

              {creative.tags && creative.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">태그</p>
                  <div className="flex flex-wrap gap-1">
                    {creative.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <CreativeInsightList
            insights={insights}
            onGenerateStrategy={() => onGenerateStrategies?.()}
            loading={generatingInsights}
          />
        </TabsContent>

        <TabsContent value="strategies" className="mt-4">
          <CreativeStrategyList
            strategies={strategies}
            onAccept={onAcceptStrategy}
            onReject={onRejectStrategy}
            loading={generatingStrategies}
          />
        </TabsContent>

        <TabsContent value="fatigue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-5 w-5" />
                피로도 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Fatigue Gauge */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>피로도 지수</span>
                      <span className={cn('font-bold', fatigueColor)}>
                        {creative.fatigue.index}%
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          creative.fatigue.index >= 80 ? 'bg-red-500' :
                          creative.fatigue.index >= 60 ? 'bg-orange-500' :
                          creative.fatigue.index >= 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        )}
                        style={{ width: `${creative.fatigue.index}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">운영 기간</p>
                    <p className="text-lg font-medium">{creative.fatigue.daysActive}일</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">성과 추세</p>
                    <div className="flex items-center gap-1">
                      <TrendIcon className={cn('h-4 w-4', trendColors[creative.fatigue.trend])} />
                      <p className="text-lg font-medium">
                        {creative.fatigue.trend === 'RISING' ? '상승' :
                         creative.fatigue.trend === 'STABLE' ? '안정' :
                         creative.fatigue.trend === 'DECLINING' ? '하락' : '소진'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                {creative.fatigue.recommendedAction && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium mb-1">권장 조치</p>
                    <p className="text-sm">{creative.fatigue.recommendedAction}</p>
                  </div>
                )}

                {/* Status Message */}
                <div className={cn(
                  'p-3 rounded-lg border',
                  creative.fatigue.index >= 80 ? 'bg-red-50 border-red-200' :
                  creative.fatigue.index >= 60 ? 'bg-orange-50 border-orange-200' :
                  creative.fatigue.index >= 40 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                )}>
                  <p className="text-sm">
                    {creative.fatigue.index >= 80 ? (
                      '이 소재는 수명이 거의 다했습니다. 즉시 새로운 소재로 교체하세요.'
                    ) : creative.fatigue.index >= 60 ? (
                      '피로도가 높아지고 있습니다. 2주 내 대체 소재를 준비하세요.'
                    ) : creative.fatigue.index >= 40 ? (
                      '아직 여유가 있지만, 대체 소재 기획을 시작하세요.'
                    ) : (
                      '소재가 건강합니다. 현재 상태를 유지하세요.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
