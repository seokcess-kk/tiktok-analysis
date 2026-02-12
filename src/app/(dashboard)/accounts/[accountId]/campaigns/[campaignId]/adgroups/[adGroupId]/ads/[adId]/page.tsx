'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/common/skeleton-loader';
import { RefreshCw, ChevronRight, ArrowLeft, Play, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  PerformanceChart,
  MetricSelector,
  type ChartDataPoint,
} from '@/components/dashboard/performance-chart';

interface Creative {
  id: string;
  tiktokCreativeId: string;
  type: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string[] | null;
  hookScore: number | null;
  createdAt: string;
}

interface AdData {
  ad: {
    id: string;
    tiktokAdId: string;
    name: string;
    status: string;
    creativeCount: number;
    createdAt: string;
    updatedAt: string;
  };
  adGroup: {
    id: string;
    name: string;
    status: string;
  };
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    roas: number;
  };
  daily: ChartDataPoint[];
  creatives: Creative[];
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ENABLE: 'default',
  ACTIVE: 'default',
  PAUSED: 'secondary',
  DISABLE: 'secondary',
  DELETED: 'destructive',
  PENDING: 'outline',
};

const statusLabels: Record<string, string> = {
  ENABLE: '운영중',
  ACTIVE: '운영중',
  PAUSED: '일시정지',
  DISABLE: '비활성',
  DELETED: '삭제됨',
  PENDING: '대기중',
};

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;
  const adGroupId = params.adGroupId as string;
  const adId = params.adId as string;

  const [data, setData] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetrics, setChartMetrics] = useState(['spend', 'conversions']);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}/ads/${adId}?days=30`
      );

      if (!response.ok) {
        throw new Error('광고 정보를 불러올 수 없습니다');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || '데이터를 불러오는데 실패했습니다');
      }
    } catch (err) {
      console.error('Error fetching ad data:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId, campaignId, adGroupId, adId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">광고를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground flex-wrap">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}`} className="hover:text-foreground">
          계정 대시보드
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}`} className="hover:text-foreground">
          {data.campaign.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href={`/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}`}
          className="hover:text-foreground"
        >
          {data.adGroup.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">{data.ad.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() =>
              router.push(`/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            광고그룹으로 돌아가기
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{data.ad.name}</h1>
            <Badge variant={statusVariants[data.ad.status] || 'outline'}>
              {statusLabels[data.ad.status] || data.ad.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            광고그룹: {data.adGroup.name} · 크리에이티브 {data.ad.creativeCount}개 · 기간:{' '}
            {data.period.startDate} ~ {data.period.endDate}
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">지출</p>
            <p className="text-2xl font-bold">{formatCurrency(data.metrics.spend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">노출</p>
            <p className="text-2xl font-bold">{data.metrics.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">클릭</p>
            <p className="text-2xl font-bold">{data.metrics.clicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">전환</p>
            <p className="text-2xl font-bold">{data.metrics.conversions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">ROAS</p>
            <p className="text-2xl font-bold">{data.metrics.roas.toFixed(2)}x</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CTR</p>
            <p className="text-xl font-semibold">{data.metrics.ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CVR</p>
            <p className="text-xl font-semibold">{data.metrics.cvr.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPC</p>
            <p className="text-xl font-semibold">{formatCurrency(data.metrics.cpc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPM</p>
            <p className="text-xl font-semibold">{formatCurrency(data.metrics.cpm)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPA</p>
            <p className="text-xl font-semibold">{formatCurrency(data.metrics.cpa)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>성과 추이</CardTitle>
              <CardDescription>광고 일별 성과 지표 (최근 30일)</CardDescription>
            </div>
            <MetricSelector
              selected={chartMetrics}
              onChange={setChartMetrics}
              available={['spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cvr', 'cpa', 'roas']}
            />
          </div>
        </CardHeader>
        <CardContent>
          {data.daily && data.daily.length > 0 ? (
            <PerformanceChart data={data.daily} metrics={chartMetrics} title="" height={350} />
          ) : (
            <div className="bg-muted rounded-lg p-12 text-center text-muted-foreground">
              차트 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Creatives */}
      <Card>
        <CardHeader>
          <CardTitle>크리에이티브</CardTitle>
          <CardDescription>이 광고에 연결된 크리에이티브 ({data.creatives.length}개)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.creatives.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">크리에이티브가 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.creatives.map((creative) => (
                <div
                  key={creative.id}
                  className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-video bg-muted relative">
                    {creative.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creative.thumbnailUrl}
                        alt="크리에이티브"
                        className="w-full h-full object-cover"
                      />
                    ) : creative.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creative.imageUrl}
                        alt="크리에이티브"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {creative.type === 'VIDEO' ? (
                          <Play className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {creative.type}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground">
                      ID: {creative.tiktokCreativeId}
                    </p>
                    {creative.duration && (
                      <p className="text-sm text-muted-foreground">
                        길이: {creative.duration}초
                      </p>
                    )}
                    {creative.hookScore !== null && (
                      <div className="mt-2">
                        <Badge variant="outline">
                          Hook Score: {creative.hookScore.toFixed(1)}
                        </Badge>
                      </div>
                    )}
                    {creative.tags && Array.isArray(creative.tags) && creative.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {creative.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
