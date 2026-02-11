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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/common/skeleton-loader';
import {
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { DateRangePicker } from '@/components/filters';
import { useDateRangeUrlState } from '@/hooks';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface CampaignData {
  campaign: {
    id: string;
    tiktokCampaignId: string;
    name: string;
    status: string;
    objective: string;
    budget: number;
    budgetMode: string;
    adGroupCount: number;
  };
  account: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      industry: string | null;
    };
  };
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
  changes: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
    roas: number;
  };
  aiSummary: {
    insightCount: number;
    pendingStrategyCount: number;
  };
}

interface MetricsData {
  daily: ChartDataPoint[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
  averages: {
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
}

interface AdGroup {
  id: string;
  name: string;
  status: string;
  bidStrategy: string;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
    roas: number;
  };
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  DELETED: 'destructive',
  PENDING: 'outline',
};

const statusLabels: Record<string, string> = {
  ACTIVE: '운영중',
  PAUSED: '일시정지',
  DELETED: '삭제됨',
  PENDING: '대기중',
};

export default function CampaignDashboardPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetrics, setChartMetrics] = useState(['spend', 'conversions']);

  // URL 기반 날짜 범위 상태
  const [dateRange, setDateRange] = useDateRangeUrlState();

  // URL 기반 비교 토글
  const [showComparison, setShowComparison] = useState(false);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      const startDate = formatDate(effectiveDateRange.from || subDays(new Date(), 6));
      const endDate = formatDate(effectiveDateRange.to || new Date());

      // 병렬로 데이터 조회
      const [campaignRes, metricsRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}/campaigns/${campaignId}?days=7`),
        fetch(`/api/accounts/${accountId}/campaigns/${campaignId}/metrics?startDate=${startDate}&endDate=${endDate}`),
      ]);

      if (!campaignRes.ok) {
        throw new Error('캠페인 정보를 불러올 수 없습니다');
      }

      const campaignResult = await campaignRes.json();
      const metricsResult = await metricsRes.json();

      if (campaignResult.success) {
        setCampaignData(campaignResult.data);
      }

      if (metricsResult.success) {
        setMetricsData(metricsResult.data);
      }
    } catch (err) {
      console.error('Error fetching campaign data:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId, campaignId, effectiveDateRange]);

  // 이전 기간 값 계산 (변화율을 기반으로 역산)
  const calculatePreviousValue = (current: number, changePercent: number): number => {
    if (changePercent === 0) return current;
    return current / (1 + changePercent / 100);
  };

  // KPI 데이터 변환
  const kpiData: KpiData[] = campaignData
    ? [
        {
          label: '지출',
          value: campaignData.metrics.spend,
          previousValue: calculatePreviousValue(campaignData.metrics.spend, campaignData.changes.spend),
          format: 'currency',
          icon: 'spend',
        },
        {
          label: '노출수',
          value: campaignData.metrics.impressions,
          previousValue: calculatePreviousValue(campaignData.metrics.impressions, campaignData.changes.impressions),
          format: 'number',
          icon: 'impressions',
        },
        {
          label: '클릭수',
          value: campaignData.metrics.clicks,
          previousValue: calculatePreviousValue(campaignData.metrics.clicks, campaignData.changes.clicks),
          format: 'number',
          icon: 'clicks',
        },
        {
          label: '전환수',
          value: campaignData.metrics.conversions,
          previousValue: calculatePreviousValue(campaignData.metrics.conversions, campaignData.changes.conversions),
          format: 'number',
          icon: 'conversions',
        },
        {
          label: 'CTR',
          value: campaignData.metrics.ctr,
          previousValue: calculatePreviousValue(campaignData.metrics.ctr, campaignData.changes.ctr),
          format: 'percent',
          icon: 'ctr',
        },
        {
          label: 'CVR',
          value: campaignData.metrics.cvr,
          format: 'percent',
          icon: 'cvr',
        },
        {
          label: 'CPA',
          value: campaignData.metrics.cpa,
          previousValue: calculatePreviousValue(campaignData.metrics.cpa, campaignData.changes.cpa),
          format: 'currency',
          icon: 'cpa',
        },
        {
          label: 'ROAS',
          value: campaignData.metrics.roas,
          previousValue: calculatePreviousValue(campaignData.metrics.roas, campaignData.changes.roas),
          format: 'decimal',
          suffix: 'x',
          icon: 'roas',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData}>다시 시도</Button>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">캠페인을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}`} className="hover:text-foreground">
          {campaignData.account.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">{campaignData.campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaignData.campaign.name}</h1>
            <Badge variant={statusVariants[campaignData.campaign.status] || 'outline'}>
              {statusLabels[campaignData.campaign.status] || campaignData.campaign.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {campaignData.campaign.objective} · 예산{' '}
            {formatCurrency(campaignData.campaign.budget)}/{campaignData.campaign.budgetMode === 'DAILY' ? '일' : '총'} ·
            광고그룹 {campaignData.campaign.adGroupCount}개
          </p>
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
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* AI Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights`}>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">AI 인사이트</p>
                <p className="text-2xl font-bold">{campaignData.aiSummary.insightCount}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}/strategies`}>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">대기 중인 전략</p>
                <p className="text-2xl font-bold">{campaignData.aiSummary.pendingStrategyCount}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPI Grid */}
      <KpiGrid kpis={kpiData} />

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>성과 추이</CardTitle>
              <CardDescription>캠페인 일별 성과 지표</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="compare-toggle"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                />
                <Label htmlFor="compare-toggle" className="text-sm text-muted-foreground cursor-pointer">
                  이전 기간 비교
                </Label>
              </div>
              <MetricSelector
                selected={chartMetrics}
                onChange={setChartMetrics}
                available={['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cvr', 'cpa', 'roas']}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metricsData?.daily && metricsData.daily.length > 0 ? (
            <PerformanceChart
              data={metricsData.daily}
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
        </CardContent>
      </Card>

      {/* Ad Groups Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>광고그룹</CardTitle>
              <CardDescription>이 캠페인의 광고그룹 목록입니다</CardDescription>
            </div>
            <Link href={`/accounts/${accountId}/campaigns/${campaignId}/adgroups`}>
              <Button variant="outline" size="sm">
                <Layers className="h-4 w-4 mr-2" />
                전체 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            광고그룹 {campaignData.campaign.adGroupCount}개
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
