'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiGrid, type KpiData } from '@/components/dashboard/kpi-card';
import {
  PerformanceChart,
  MetricSelector,
  type ChartDataPoint,
} from '@/components/dashboard/performance-chart';
import { CampaignsTable } from '@/components/dashboard/campaigns-table';
import { RecentInsights, type RecentInsight } from '@/components/dashboard/recent-insights';
import { PendingStrategies, type PendingStrategy } from '@/components/dashboard/pending-strategies';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertTriangle, LayoutGrid, LineChart } from 'lucide-react';
import { DateRangePicker } from '@/components/filters';
import { useDateRangeUrlState, useUrlState } from '@/hooks';
import { DashboardSkeleton, NoDataFound, ErrorState } from '@/components/common';
import { Label } from '@/components/ui/label';
import { SetupGuide } from '@/components/onboarding/setup-guide';
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

// 기본 빈 대시보드 데이터 (초기 상태용)
const emptyDashboardData: DashboardData = {
  account: { id: '', name: '', clientName: '' },
  kpis: {
    current: { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, cpa: 0, roas: 0 },
    previous: { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, cpa: 0, roas: 0 },
  },
  chartData: [],
  insights: [],
  strategies: [],
};

export default function DashboardPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetrics, setChartMetrics] = useState(['spend', 'conversions']);
  const [campaignCount, setCampaignCount] = useState(0);

  // URL 기반 날짜 범위 상태
  const [dateRange, setDateRange] = useDateRangeUrlState();

  // URL 기반 탭 상태
  const [activeTab, setActiveTab] = useUrlState<string>('tab', { defaultValue: 'campaigns' });

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

      // 현재 기간 및 이전 기간 메트릭, 인사이트, 전략, 캠페인 데이터 병렬 호출
      const [
        currentMetricsRes,
        previousMetricsRes,
        insightsRes,
        strategiesRes,
        campaignsRes
      ] = await Promise.allSettled([
        fetch(`/api/accounts/${accountId}/metrics?startDate=${formatDate(currentStartDate)}&endDate=${formatDate(currentEndDate)}`),
        fetch(`/api/accounts/${accountId}/metrics?startDate=${formatDate(previousStartDate)}&endDate=${formatDate(previousEndDate)}`),
        fetch(`/api/ai/insights/${accountId}?limit=5`),
        fetch(`/api/ai/strategies/${accountId}?status=PENDING&limit=5`),
        fetch(`/api/accounts/${accountId}/campaigns?limit=1`), // 캠페인 수만 확인
      ]);

      let dashboardData = { ...emptyDashboardData };

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

      // 캠페인 수 처리
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
        const campaignsData = await campaignsRes.value.json();
        if (campaignsData.success && campaignsData.data?.pagination) {
          setCampaignCount(campaignsData.data.pagination.total);
        }
      }

      setData(dashboardData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 인사이트 생성 핸들러
  const handleGenerateInsights = async () => {
    try {
      const res = await fetch(`/api/seed/insights?accountId=${accountId}&count=5`, {
        method: 'POST',
      });
      if (res.ok) {
        // 데이터 새로고침
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
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
      <div className="min-h-[400px] flex items-center justify-center">
        <ErrorState
          title="데이터를 불러올 수 없습니다"
          description={error}
          onRetry={fetchDashboardData}
        />
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

      {/* Setup Guide - 온보딩 안내 */}
      <SetupGuide
        accountId={accountId}
        campaignCount={campaignCount}
        insightCount={data?.insights?.length || 0}
        strategyCount={data?.strategies?.length || 0}
        onGenerateInsights={handleGenerateInsights}
      />

      {/* KPI Grid */}
      <KpiGrid kpis={kpiData} />

      {/* Tabs: Campaigns / Performance */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            캠페인
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            성과 추이
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>캠페인 목록</CardTitle>
              <CardDescription>
                이 계정의 모든 캠페인과 성과를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignsTable accountId={accountId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
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
        </TabsContent>
      </Tabs>

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
