'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  CreativeDetailPanel,
  type CreativeDetailData,
} from '@/components/creatives/creative-detail-panel';
import type { CreativeInsightData } from '@/components/creatives/creative-insight-card';
import type { CreativeStrategyData } from '@/components/creatives/creative-strategy-list';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type MessageType = 'success' | 'error' | 'info';

interface StatusMessage {
  type: MessageType;
  text: string;
}

export default function CreativeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const creativeId = params.creativeId as string;

  const [creative, setCreative] = useState<CreativeDetailData | null>(null);
  const [insights, setInsights] = useState<CreativeInsightData[]>([]);
  const [strategies, setStrategies] = useState<CreativeStrategyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [generatingStrategies, setGeneratingStrategies] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const showMessage = (type: MessageType, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 소재 데이터 조회
  const fetchCreativeData = useCallback(async () => {
    try {
      const response = await fetch(`/api/creatives/${accountId}/${creativeId}`);
      if (!response.ok) throw new Error('Failed to fetch creative');
      const data = await response.json();
      if (data.success) {
        // API 응답을 CreativeDetailData 형식으로 매핑
        const apiData = data.data;
        const mapped: CreativeDetailData = {
          id: apiData.creative.id,
          tiktokCreativeId: apiData.creative.tiktokCreativeId,
          type: apiData.creative.type,
          duration: apiData.creative.duration,
          tags: apiData.creative.tags || [],
          thumbnailUrl: apiData.creative.thumbnailUrl,
          metrics: {
            spend: apiData.metrics.spend,
            impressions: apiData.metrics.impressions,
            clicks: apiData.metrics.clicks,
            conversions: apiData.metrics.conversions,
            ctr: apiData.metrics.ctr,
            cvr: apiData.metrics.cvr,
            cpa: apiData.metrics.cpa,
            roas: apiData.metrics.roas || 0,
          },
          fatigue: {
            index: apiData.fatigue.current.index,
            trend: apiData.fatigue.current.trend,
            daysActive: apiData.creative.age,
            recommendedAction: apiData.fatigue.recommendation,
          },
          score: apiData.score ? {
            overall: apiData.score.overall,
            grade: apiData.score.grade,
            percentile: 50,
          } : undefined,
        };
        setCreative(mapped);
      }
    } catch (error) {
      console.error('Creative fetch error:', error);
      showMessage('error', '소재 정보를 불러오는데 실패했습니다.');
    }
  }, [accountId, creativeId]);

  // 인사이트 조회
  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(`/api/creatives/${accountId}/${creativeId}/insights`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      if (data.success) {
        setInsights(data.data.insights || []);
      }
    } catch (error) {
      console.error('Insights fetch error:', error);
    }
  }, [accountId, creativeId]);

  // 전략 조회
  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetch(`/api/creatives/${accountId}/${creativeId}/strategies`);
      if (!response.ok) throw new Error('Failed to fetch strategies');
      const data = await response.json();
      if (data.success) {
        setStrategies(data.data.strategies || []);
      }
    } catch (error) {
      console.error('Strategies fetch error:', error);
    }
  }, [accountId, creativeId]);

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCreativeData(), fetchInsights(), fetchStrategies()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCreativeData, fetchInsights, fetchStrategies]);

  // 인사이트 생성
  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const response = await fetch(`/api/creatives/${accountId}/${creativeId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: true }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchInsights();
        showMessage('success', '인사이트가 생성되었습니다.');
      } else {
        throw new Error(data.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Generate insights error:', error);
      showMessage('error', '인사이트 생성에 실패했습니다.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  // 전략 생성
  const handleGenerateStrategies = async () => {
    if (insights.length === 0) {
      showMessage('error', '먼저 인사이트를 생성해주세요.');
      return;
    }

    setGeneratingStrategies(true);
    try {
      const response = await fetch(`/api/creatives/${accountId}/${creativeId}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightIds: insights.map(i => i.id),
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchStrategies();
        showMessage('success', '전략이 생성되었습니다.');
      } else {
        throw new Error(data.error || 'Failed to generate strategies');
      }
    } catch (error) {
      console.error('Generate strategies error:', error);
      showMessage('error', '전략 생성에 실패했습니다.');
    } finally {
      setGeneratingStrategies(false);
    }
  };

  // 전략 수락
  const handleAcceptStrategy = async (strategyId: string) => {
    try {
      const response = await fetch(`/api/strategies/${strategyId}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchStrategies();
        showMessage('success', '전략이 수락되었습니다.');
      }
    } catch (error) {
      console.error('Accept strategy error:', error);
      showMessage('error', '전략 수락에 실패했습니다.');
    }
  };

  // 전략 거절
  const handleRejectStrategy = async (strategyId: string, reason: string) => {
    try {
      const response = await fetch(`/api/strategies/${strategyId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        await fetchStrategies();
        showMessage('success', '전략이 거절되었습니다.');
      }
    } catch (error) {
      console.error('Reject strategy error:', error);
      showMessage('error', '전략 거절에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">소재를 찾을 수 없습니다.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Status Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {message.type === 'error' && <XCircle className="h-4 w-4" />}
          {message.type === 'info' && <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">소재 상세</h1>
            <p className="text-sm text-muted-foreground">
              {creative.tiktokCreativeId}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchCreativeData();
            fetchInsights();
            fetchStrategies();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Detail Panel */}
      <CreativeDetailPanel
        creative={creative}
        insights={insights}
        strategies={strategies}
        onGenerateInsights={handleGenerateInsights}
        onGenerateStrategies={handleGenerateStrategies}
        onAcceptStrategy={handleAcceptStrategy}
        onRejectStrategy={handleRejectStrategy}
        generatingInsights={generatingInsights}
        generatingStrategies={generatingStrategies}
      />
    </div>
  );
}
