'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { InsightCard, InsightList } from '@/components/ai/insight-card';
import { AnomalyAlert, AnomalyBanner, AnomalySummary } from '@/components/ai/anomaly-alert';
import { cn } from '@/lib/utils';

// Fallback mock data
const mockInsights = [
  {
    id: '1',
    type: 'ANOMALY' as const,
    severity: 'CRITICAL' as const,
    title: 'CPA 급등 감지 - 즉시 확인 필요',
    summary:
      '지난 24시간 동안 CPA가 45% 급등했습니다. 주요 원인으로 캠페인 "Summer Sale 2026"의 전환율 급락이 확인되었습니다.',
    keyFindings: [
      {
        finding: '캠페인 "Summer Sale 2026" 전환율 급락',
        impact: 'NEGATIVE' as const,
        metric: 'CVR',
        change: -38,
      },
      {
        finding: '클릭수는 유지되나 전환 감소',
        impact: 'NEGATIVE' as const,
        metric: 'Conversions',
        change: -42,
      },
      {
        finding: '랜딩페이지 로딩 속도 저하 의심',
        impact: 'NEGATIVE' as const,
        metric: 'Bounce Rate',
        change: 25,
      },
    ],
    recommendations: [
      '랜딩페이지 서버 상태 및 로딩 속도 점검',
      '전환 추적 픽셀 정상 작동 여부 확인',
      '캠페인 예산 일시 감액 검토',
    ],
    generatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead: false,
    linkedStrategiesCount: 2,
  },
  {
    id: '2',
    type: 'DAILY_SUMMARY' as const,
    severity: 'INFO' as const,
    title: '일간 성과 요약 - 2026년 2월 5일',
    summary:
      '전일 대비 전체 성과가 소폭 상승했습니다. 특히 신규 소재 "Product Demo v3"가 높은 CTR을 기록하며 성과를 견인했습니다.',
    keyFindings: [
      {
        finding: '전체 ROAS 상승',
        impact: 'POSITIVE' as const,
        metric: 'ROAS',
        change: 12,
      },
      {
        finding: '신규 소재 성과 우수',
        impact: 'POSITIVE' as const,
        metric: 'CTR',
        change: 35,
      },
      {
        finding: '예산 효율 개선',
        impact: 'POSITIVE' as const,
        metric: 'CPA',
        change: -8,
      },
    ],
    recommendations: [
      '고성과 소재 "Product Demo v3" 예산 증액 검토',
      '저성과 캠페인 "Brand Awareness" 최적화 필요',
    ],
    generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    linkedStrategiesCount: 3,
  },
  {
    id: '3',
    type: 'CREATIVE' as const,
    severity: 'WARNING' as const,
    title: '소재 피로도 경고 - 3개 소재 교체 권장',
    summary:
      '현재 활성 소재 중 3개가 피로도 70% 이상으로 교체가 필요합니다. 성과 하락 전 신규 소재 준비를 권장합니다.',
    keyFindings: [
      {
        finding: 'creative_001 피로도 높음',
        impact: 'NEGATIVE' as const,
        metric: 'Fatigue Index',
        change: 78,
      },
      {
        finding: 'creative_004 성과 급락 중',
        impact: 'NEGATIVE' as const,
        metric: 'CTR',
        change: -25,
      },
    ],
    recommendations: [
      '신규 소재 제작 착수 (예상 소요: 3-5일)',
      '피로도 높은 소재 예산 점진적 감액',
    ],
    generatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    linkedStrategiesCount: 1,
  },
  {
    id: '4',
    type: 'TREND' as const,
    severity: 'INFO' as const,
    title: '주간 트렌드 분석 - 전환율 상승세',
    summary:
      '지난 7일간 전반적인 전환율이 상승 추세를 보이고 있습니다. 특히 18-24세 연령대에서 두드러진 성과 개선이 확인됩니다.',
    keyFindings: [
      {
        finding: '18-24세 타겟 전환율 상승',
        impact: 'POSITIVE' as const,
        metric: 'CVR',
        change: 18,
      },
      {
        finding: '주말 성과 개선',
        impact: 'POSITIVE' as const,
        metric: 'ROAS',
        change: 22,
      },
    ],
    recommendations: [
      '18-24세 타겟 예산 증액 검토',
      '주말 집중 캠페인 운영 고려',
    ],
    generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    linkedStrategiesCount: 0,
  },
  {
    id: '5',
    type: 'PREDICTION' as const,
    severity: 'WARNING' as const,
    title: '예측: 다음 주 CPA 상승 예상',
    summary:
      '현재 트렌드와 계절성을 분석한 결과, 다음 주 CPA가 15-20% 상승할 것으로 예측됩니다. 선제적 대응을 권장합니다.',
    keyFindings: [
      {
        finding: '경쟁 강도 증가 예상',
        impact: 'NEGATIVE' as const,
        metric: 'Competition',
        change: 20,
      },
      {
        finding: '소재 피로도 누적',
        impact: 'NEGATIVE' as const,
        metric: 'Creative Health',
        change: -15,
      },
    ],
    recommendations: [
      '신규 소재 사전 준비',
      '입찰 전략 조정 검토',
      '예산 버퍼 확보',
    ],
    generatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    linkedStrategiesCount: 2,
  },
];

const mockAnomalies = [
  {
    type: 'CPA_SPIKE' as const,
    severity: 'CRITICAL' as const,
    metric: 'CPA',
    currentValue: 14500,
    previousValue: 10000,
    changePercent: 45,
  },
  {
    type: 'CTR_DROP' as const,
    severity: 'WARNING' as const,
    metric: 'CTR',
    currentValue: 0.8,
    previousValue: 1.2,
    changePercent: -33,
  },
];

type FilterType = 'ALL' | 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
type FilterSeverity = 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL';

export default function InsightsPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>(mockInsights);
  const [anomalies, setAnomalies] = useState<any[]>(mockAnomalies);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch insights from API
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (filterType !== 'ALL') params.append('type', filterType);
        if (filterSeverity !== 'ALL') params.append('severity', filterSeverity);
        if (showUnreadOnly) params.append('isRead', 'false');

        const response = await fetch(`/api/ai/insights/${accountId}?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Map API data to component format
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
          }));

          if (mappedInsights.length > 0) {
            setInsights(mappedInsights);
          } else {
            // No insights yet, but don't fallback to mock immediately
            setInsights([]);
            setError('인사이트가 아직 생성되지 않았습니다. "인사이트 새로고침"을 클릭하여 생성하세요.');
          }

          // Extract anomalies from insights
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
        } else {
          console.warn('API returned unsuccessful response');
          setInsights([]);
          setError('인사이트를 불러올 수 없습니다. 새로고침 버튼을 클릭하세요.');
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('데이터를 불러오는데 실패했습니다. 네트워크 연결을 확인하세요.');
        setInsights([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [accountId, filterType, filterSeverity, showUnreadOnly]);

  // Generate insights handler
  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/insights/${accountId}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      // Reload insights after generation
      window.location.reload();
    } catch (err) {
      setError('인사이트 생성 실패. 나중에 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter insights (client-side filtering for immediate feedback)
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

  // Mark insight as read handler
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

  // Dismiss anomaly handler
  const handleDismissAnomaly = async (index: number) => {
    // Remove from local state (anomalies are transient)
    setAnomalies((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">AI 인사이트</h1>
          <p className="text-gray-500 mt-1">
            AI가 분석한 광고 성과 인사이트와 이상 탐지 결과입니다
          </p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          인사이트 새로고침
        </button>
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
          <p className="text-xs text-gray-400 mt-1">최근 7일</p>
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
            emptyMessage="조건에 맞는 인사이트가 없습니다"
          />
        </div>

        {/* Detail Panel / Anomaly Summary */}
        <div className="lg:col-span-1 space-y-4">
          {/* Anomaly Summary */}
          <AnomalySummary
            anomalies={anomalies.map((a) => ({
              type: a.type,
              severity: a.severity,
              metric: a.metric,
              changePercent: a.changePercent,
            }))}
          />

          {/* Current Anomalies */}
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

          {/* Selected Insight Detail */}
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
