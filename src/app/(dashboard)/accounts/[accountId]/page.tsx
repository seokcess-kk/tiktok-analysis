'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { KpiGrid, type KpiData } from '@/components/dashboard/kpi-card';
import {
  PerformanceChart,
  MetricSelector,
  type ChartDataPoint,
} from '@/components/dashboard/performance-chart';
import { RecentInsights, type RecentInsight } from '@/components/dashboard/recent-insights';
import { PendingStrategies, type PendingStrategy } from '@/components/dashboard/pending-strategies';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DateRangePicker } from '@/components/filters';
import { useDateRangeUrlState, useUrlState } from '@/hooks';
import { DashboardSkeleton } from '@/components/common';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';

interface DashboardData {
  account: {
    id: string;
    name: string;
    clientName: string;
  };
  kpis: {
    current: {
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      cvr: number;
      cpa: number;
      roas: number;
    };
    previous: {
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      cvr: number;
      cpa: number;
      roas: number;
    };
  };
  chartData: ChartDataPoint[];
  compareChartData?: ChartDataPoint[];
  insights: RecentInsight[];
  strategies: PendingStrategy[];
}

// Mock data for development
const mockDashboardData: DashboardData = {
  account: {
    id: '1',
    name: '브랜드 A',
    clientName: '클라이언트 A · 이커머스',
  },
  kpis: {
    current: {
      spend: 15000000,
      impressions: 5200000,
      clicks: 156000,
      conversions: 1250,
      ctr: 3.0,
      cvr: 0.8,
      cpa: 12000,
      roas: 3.2,
    },
    previous: {
      spend: 14250000,
      impressions: 4810000,
      clicks: 139000,
      conversions: 1277,
      ctr: 2.89,
      cvr: 0.88,
      cpa: 11160,
      roas: 3.27,
    },
  },
  chartData: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString(),
    spend: 1000000 + Math.random() * 500000,
    impressions: 350000 + Math.random() * 100000,
    clicks: 10000 + Math.random() * 5000,
    conversions: 80 + Math.random() * 40,
    ctr: 2.5 + Math.random() * 1,
    cvr: 0.6 + Math.random() * 0.4,
    cpa: 10000 + Math.random() * 5000,
    roas: 2.5 + Math.random() * 1.5,
  })),
  insights: [
    {
      id: '1',
      type: 'ANOMALY',
      severity: 'CRITICAL',
      title: 'CPA 급등 감지',
      summary: '어제 대비 CPA가 32% 상승했습니다. 주요 원인은 소재 피로도 증가로 추정됩니다.',
      createdAt: new Date().toISOString(),
      isRead: false,
    },
    {
      id: '2',
      type: 'TREND',
      severity: 'HIGH',
      title: '전환율 하락 추세',
      summary: '최근 7일간 전환율이 지속적으로 하락하고 있습니다. 타겟팅 점검이 필요합니다.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
    },
    {
      id: '3',
      type: 'CREATIVE',
      severity: 'INFO',
      title: '고성과 소재 발견',
      summary: '"제품 리뷰 UGC" 소재가 평균 대비 2.5배 높은 전환율을 보이고 있습니다.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      isRead: true,
    },
  ],
  strategies: [
    {
      id: '1',
      type: 'BUDGET',
      priority: 'HIGH',
      title: '캠페인 A 예산 증액 권장',
      description: 'ROAS가 목표 대비 20% 높은 캠페인입니다. 예산 증액으로 더 많은 전환을 확보할 수 있습니다.',
      expectedImpact: { metric: 'ROAS', changePercent: 15 },
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'CREATIVE',
      priority: 'MEDIUM',
      title: '소재 3개 교체 필요',
      description: '피로도가 80% 이상인 소재를 신규 소재로 교체하여 성과를 개선할 수 있습니다.',
      expectedImpact: { metric: 'CPA', changePercent: -20 },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
};

export default function DashboardPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetrics, setChartMetrics] = useState(['spend', 'conversions']);

  // URL 기반 날짜 범위 상태
  const [dateRange, setDateRange] = useDateRangeUrlState();

  // URL 기반 비교 토글 상태
  const [compareParam, setCompareParam] = useUrlState<string>('compare', { defaultValue: 'false' });
  const showComparison = compareParam === 'true';

  // 기본값: 최근 7일
  const effectiveDateRange = useMemo<DateRange>(() => {
    if (dateRange.from && dateRange.to) {
      return { from: dateRange.from, to: dateRange.to };
    }
    return {
      from: subDays(new Date(), 6),
      to: new Date(),
    };
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 현재 기간과 이전 기간 날짜 계산
      const currentEndDate = effectiveDateRange.to || new Date();
      const currentStartDate = effectiveDateRange.from || subDays(currentEndDate, 6);

      const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();
      const previousEndDate = new Date(currentStartDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // 현재 기간 및 이전 기간 메트릭, 인사이트, 전략 데이터 병렬 호출
      const [
        currentMetricsRes,
        previousMetricsRes,
        insightsRes,
        strategiesRes
      ] = await Promise.allSettled([
        fetch(`/api/accounts/${accountId}/metrics?startDate=${formatDate(currentStartDate)}&endDate=${formatDate(currentEndDate)}`),
        fetch(`/api/accounts/${accountId}/metrics?startDate=${formatDate(previousStartDate)}&endDate=${formatDate(previousEndDate)}`),
        fetch(`/api/ai/insights/${accountId}?limit=5`),
        fetch(`/api/ai/strategies/${accountId}?status=PENDING&limit=5`),
      ]);

      let dashboardData = { ...mockDashboardData };

      // 현재 기간 메트릭 데이터 처리
      if (currentMetricsRes.status === 'fulfilled' && currentMetricsRes.value.ok) {
        const metricsData = await currentMetricsRes.value.json();
        if (metricsData.success && metricsData.data) {
          const { totals, averages, daily } = metricsData.data;
          dashboardData.kpis.current = {
            spend: totals.spend,
            impressions: totals.impressions,
            clicks: totals.clicks,
            conversions: totals.conversions,
            ctr: Number(averages.ctr.toFixed(2)),
            cvr: totals.clicks > 0 ? Number(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0,
            cpa: Math.round(averages.cpa),
            roas: Number(averages.roas.toFixed(2)),
          };
          // 차트 데이터의 소숫점 포맷팅
          dashboardData.chartData = daily
            ? daily.map((d: Record<string, unknown>) => ({
                ...d,
                ctr: d.ctr ? Number((d.ctr as number).toFixed(2)) : 0,
                cvr: d.cvr ? Number((d.cvr as number).toFixed(2)) : 0,
                cpa: d.cpa ? Math.round(d.cpa as number) : 0,
                roas: d.roas ? Number((d.roas as number).toFixed(2)) : 0,
              }))
            : dashboardData.chartData;
        }
      }

      // 이전 기간 메트릭 데이터 처리
      if (previousMetricsRes.status === 'fulfilled' && previousMetricsRes.value.ok) {
        const previousData = await previousMetricsRes.value.json();
        if (previousData.success && previousData.data) {
          const { totals, averages, daily } = previousData.data;
          dashboardData.kpis.previous = {
            spend: totals.spend,
            impressions: totals.impressions,
            clicks: totals.clicks,
            conversions: totals.conversions,
            ctr: Number(averages.ctr.toFixed(2)),
            cvr: totals.clicks > 0 ? Number(((totals.conversions / totals.clicks) * 100).toFixed(2)) : 0,
            cpa: Math.round(averages.cpa),
            roas: Number(averages.roas.toFixed(2)),
          };
          // 비교 차트 데이터
          if (daily) {
            dashboardData.compareChartData = daily.map((d: Record<string, unknown>) => ({
              ...d,
              ctr: d.ctr ? Number((d.ctr as number).toFixed(2)) : 0,
              cvr: d.cvr ? Number((d.cvr as number).toFixed(2)) : 0,
              cpa: d.cpa ? Math.round(d.cpa as number) : 0,
              roas: d.roas ? Number((d.roas as number).toFixed(2)) : 0,
            }));
          }
        }
      }

      // 인사이트 데이터 처리 (API 응답 -> 컴포넌트 인터페이스 변환)
      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const insightsData = await insightsRes.value.json();
        if (insightsData.success && insightsData.data?.insights) {
          dashboardData.insights = insightsData.data.insights.map((insight: Record<string, unknown>) => ({
            id: insight.id,
            type: insight.type,
            severity: insight.severity,
            title: insight.title,
            summary: insight.summary,
            createdAt: insight.generatedAt || insight.createdAt, // API는 generatedAt 사용
            isRead: insight.isRead,
          }));
        }
      }

      // 전략 데이터 처리 (API 응답 -> 컴포넌트 인터페이스 변환)
      if (strategiesRes.status === 'fulfilled' && strategiesRes.value.ok) {
        const strategiesData = await strategiesRes.value.json();
        if (strategiesData.success && strategiesData.data?.strategies) {
          dashboardData.strategies = strategiesData.data.strategies.map((strategy: Record<string, unknown>) => ({
            id: strategy.id,
            type: strategy.type,
            priority: strategy.priority,
            title: strategy.title,
            description: strategy.description,
            expectedImpact: strategy.expectedImpact || { metric: 'ROAS', changePercent: 0 },
            createdAt: strategy.createdAt,
          }));
        }
      }

      setData(dashboardData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // 에러 시에도 mock 데이터 표시
      setData(mockDashboardData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [accountId, effectiveDateRange]);

  // Strategy actions
  const handleAcceptStrategy = async (id: string) => {
    try {
      await fetch(`/api/ai/strategies/${accountId}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to accept strategy:', err);
    }
  };

  const handleRejectStrategy = async (id: string) => {
    try {
      await fetch(`/api/ai/strategies/${accountId}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to reject strategy:', err);
    }
  };

  // KPI 데이터 변환
  const kpiData: KpiData[] = data
    ? [
        {
          label: '지출',
          value: data.kpis.current.spend,
          previousValue: data.kpis.previous.spend,
          format: 'currency',
          icon: 'spend',
        },
        {
          label: '노출수',
          value: data.kpis.current.impressions,
          previousValue: data.kpis.previous.impressions,
          format: 'number',
          icon: 'impressions',
        },
        {
          label: '클릭수',
          value: data.kpis.current.clicks,
          previousValue: data.kpis.previous.clicks,
          format: 'number',
          icon: 'clicks',
        },
        {
          label: '전환수',
          value: data.kpis.current.conversions,
          previousValue: data.kpis.previous.conversions,
          format: 'number',
          icon: 'conversions',
        },
        {
          label: 'CTR',
          value: data.kpis.current.ctr,
          previousValue: data.kpis.previous.ctr,
          format: 'percent',
          icon: 'ctr',
        },
        {
          label: 'CVR',
          value: data.kpis.current.cvr,
          previousValue: data.kpis.previous.cvr,
          format: 'percent',
          icon: 'cvr',
        },
        {
          label: 'CPA',
          value: data.kpis.current.cpa,
          previousValue: data.kpis.previous.cpa,
          format: 'currency',
          icon: 'cpa',
        },
        {
          label: 'ROAS',
          value: data.kpis.current.roas,
          previousValue: data.kpis.previous.roas,
          format: 'decimal',
          suffix: 'x',
          icon: 'roas',
        },
      ]
    : [];

  // Critical alert check
  const criticalInsight = data?.insights.find((i) => i.severity === 'CRITICAL');

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data?.account.name || '대시보드'}</h1>
          <p className="text-muted-foreground">{data?.account.clientName}</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker
            value={effectiveDateRange}
            onChange={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />
          <Button
            variant="outline"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            새로고침
          </Button>
        </div>
      </div>

      {/* Critical Alert */}
      {criticalInsight && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">긴급 알림</p>
              <p className="text-sm text-muted-foreground">
                {criticalInsight.summary}
              </p>
            </div>
            <Link href={`/accounts/${accountId}/insights?severity=CRITICAL`}>
              <Button variant="destructive" size="sm">
                자세히 보기
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <KpiGrid kpis={kpiData} />

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">성과 추이</h2>
            <div className="flex items-center gap-2">
              <Switch
                id="compare-toggle"
                checked={showComparison}
                onCheckedChange={(checked) => setCompareParam(checked ? 'true' : 'false')}
              />
              <Label htmlFor="compare-toggle" className="text-sm text-muted-foreground cursor-pointer">
                이전 기간 비교
              </Label>
            </div>
          </div>
          <MetricSelector
            selected={chartMetrics}
            onChange={setChartMetrics}
            available={['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cvr', 'cpa', 'roas']}
          />
        </div>
        {data?.chartData && data.chartData.length > 0 ? (
          <PerformanceChart
            data={data.chartData}
            compareData={showComparison ? data.compareChartData : undefined}
            metrics={chartMetrics}
            title=""
            height={350}
            showComparison={showComparison}
          />
        ) : (
          <div className="bg-muted rounded-lg p-12 text-center text-muted-foreground">
            차트 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* Insights and Strategies Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <RecentInsights
          insights={data?.insights || []}
          accountId={accountId}
        />
        <PendingStrategies
          strategies={data?.strategies || []}
          accountId={accountId}
          onAccept={handleAcceptStrategy}
          onReject={handleRejectStrategy}
        />
      </div>
    </div>
  );
}
