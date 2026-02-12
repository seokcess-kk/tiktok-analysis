'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { InsightCard, InsightList } from '@/components/ai/insight-card';
import { AnomalyAlert, AnomalyBanner, AnomalySummary } from '@/components/ai/anomaly-alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, RefreshCw } from 'lucide-react';

type FilterType = 'ALL' | 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
type FilterSeverity = 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL';

export default function CampaignInsightsPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign info
  useEffect(() => {
    const fetchCampaignInfo = async () => {
      try {
        const response = await fetch(`/api/accounts/${accountId}/campaigns/${campaignId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCampaignName(result.data.campaign.name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch campaign info:', err);
      }
    };
    fetchCampaignInfo();
  }, [accountId, campaignId]);

  // Fetch insights from API
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterType !== 'ALL') params.append('type', filterType);
        if (filterSeverity !== 'ALL') params.append('severity', filterSeverity);
        if (showUnreadOnly) params.append('isRead', 'false');

        const response = await fetch(
          `/api/ai/insights/${accountId}/campaigns/${campaignId}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          const mappedInsights = (result.data.insights || []).map((insight: any) => ({
            id: insight.id,
            type: insight.type,
            severity: insight.severity,
            title: insight.title,
            summary: insight.summary,
            keyFindings: insight.details?.keyFindings || [],
            recommendations: insight.details?.recommendations || [],
            generatedAt: insight.generatedAt,
            isRead: insight.isRead,
            linkedStrategiesCount: insight.linkedStrategies?.length || 0,
            metrics: insight.metrics,
          }));

          setInsights(mappedInsights);

          // Extract anomalies
          const anomalyInsights = mappedInsights.filter((i: any) => i.type === 'ANOMALY');
          if (anomalyInsights.length > 0) {
            const mappedAnomalies = anomalyInsights.slice(0, 2).map((insight: any) => ({
              type: insight.metrics?.type || 'CPA_SPIKE',
              severity: insight.severity,
              metric: insight.metrics?.metric || 'CPA',
              currentValue: insight.metrics?.currentValue || 0,
              previousValue: insight.metrics?.previousValue || 0,
              changePercent: insight.metrics?.changePercent || 0,
            }));
            setAnomalies(mappedAnomalies);
          }

          if (mappedInsights.length === 0) {
            setError('인사이트가 아직 생성되지 않았습니다. "인사이트 새로고침"을 클릭하여 생성하세요.');
          }
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('데이터를 불러오는데 실패했습니다.');
        setInsights([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [accountId, campaignId, filterType, filterSeverity, showUnreadOnly]);

  // Generate insights handler
  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/insights/${accountId}/campaigns/${campaignId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      window.location.reload();
    } catch (err) {
      setError('인사이트 생성 실패. 나중에 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark insight as read
  const handleMarkAsRead = async (insightId: string) => {
    try {
      const response = await fetch(`/api/ai/insights/${accountId}/${insightId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((i) => (i.id === insightId ? { ...i, isRead: true } : i))
        );
      }
    } catch (error) {
      console.error('Failed to mark insight as read:', error);
    }
  };

  const handleDismissAnomaly = (index: number) => {
    setAnomalies((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredInsights = insights.filter((insight) => {
    if (filterType !== 'ALL' && insight.type !== filterType) return false;
    if (filterSeverity !== 'ALL' && insight.severity !== filterSeverity) return false;
    if (showUnreadOnly && insight.isRead) return false;
    return true;
  });

  const unreadCount = insights.filter((i) => !i.isRead).length;
  const criticalCount = insights.filter((i) => i.severity === 'CRITICAL' && !i.isRead).length;

  const selectedInsightData = selectedInsight
    ? insights.find((i) => i.id === selectedInsight)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}`} className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaignName || '캠페인'}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">AI 인사이트</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캠페인 AI 인사이트</h1>
          <p className="text-gray-500 mt-1">
            {campaignName} 캠페인의 AI 분석 인사이트입니다
          </p>
        </div>
        <Button onClick={handleGenerateInsights} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          인사이트 새로고침
        </Button>
      </div>

      {/* Anomaly Banner */}
      {anomalies.length > 0 && (
        <AnomalyBanner
          anomalyCount={anomalies.length}
          criticalCount={anomalies.filter((a) => a.severity === 'CRITICAL').length}
          onClick={() => setFilterType('ANOMALY')}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">전체 인사이트</p>
          <p className="text-2xl font-bold text-gray-900">{insights.length}</p>
          <p className="text-xs text-gray-400 mt-1">캠페인 레벨</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">읽지 않음</p>
          <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
          <p className="text-xs text-gray-400 mt-1">새로운 인사이트</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">긴급 알림</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          <p className="text-xs text-gray-400 mt-1">즉시 확인 필요</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">연결된 전략</p>
          <p className="text-2xl font-bold text-green-600">
            {insights.reduce((sum, i) => sum + (i.linkedStrategiesCount || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">실행 가능한 조치</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">유형:</span>
          <div className="flex flex-wrap gap-1">
            {(['ALL', 'DAILY_SUMMARY', 'ANOMALY', 'TREND', 'CREATIVE', 'PREDICTION'] as const).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full transition-colors',
                    filterType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {type === 'ALL'
                    ? '전체'
                    : type === 'DAILY_SUMMARY'
                    ? '일간'
                    : type === 'ANOMALY'
                    ? '이상'
                    : type === 'TREND'
                    ? '트렌드'
                    : type === 'CREATIVE'
                    ? '소재'
                    : '예측'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">심각도:</span>
          <div className="flex gap-1">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full transition-colors',
                  filterSeverity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-red-500 text-white'
                      : sev === 'WARNING'
                      ? 'bg-yellow-500 text-white'
                      : sev === 'INFO'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {sev === 'ALL' ? '전체' : sev === 'CRITICAL' ? '긴급' : sev === 'WARNING' ? '주의' : '정보'}
              </button>
            ))}
          </div>
        </div>

        {/* Unread Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">읽지 않은 것만</span>
        </label>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insight List */}
        <div className="lg:col-span-2">
          <InsightList
            insights={filteredInsights}
            onInsightClick={setSelectedInsight}
            onMarkRead={handleMarkAsRead}
            emptyMessage="이 캠페인에 대한 인사이트가 없습니다"
          />
        </div>

        {/* Detail Panel / Anomaly Summary */}
        <div className="lg:col-span-1 space-y-4">
          <AnomalySummary
            anomalies={anomalies.map((a) => ({
              type: a.type,
              severity: a.severity,
              metric: a.metric,
              changePercent: a.changePercent,
            }))}
          />

          {anomalies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">현재 이상 징후</h3>
              {anomalies.map((anomaly, i) => (
                <AnomalyAlert
                  key={i}
                  {...anomaly}
                  onViewDetails={() => setFilterType('ANOMALY')}
                  onDismiss={() => handleDismissAnomaly(i)}
                />
              ))}
            </div>
          )}

          {selectedInsightData && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">선택된 인사이트</h3>
              <InsightCard {...selectedInsightData} compact={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
