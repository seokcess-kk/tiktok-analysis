'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/common/skeleton-loader';
import { RefreshCw, ChevronRight, ArrowLeft, Lightbulb, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Ad {
  id: string;
  tiktokAdId: string;
  name: string;
  status: string;
  creativeCount: number;
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
}

interface AdGroupData {
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  adGroup: {
    id: string;
    name: string;
    status: string;
  };
  ads: Ad[];
  total: number;
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

export default function AdGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;
  const adGroupId = params.adGroupId as string;

  const [data, setData] = useState<AdGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<{
    insightCount: number;
    pendingStrategyCount: number;
  } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}/ads?days=7`
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

      // 캠페인 AI 정보 fetch
      const campaignResponse = await fetch(
        `/api/accounts/${accountId}/campaigns/${campaignId}?days=7`
      );
      if (campaignResponse.ok) {
        const campaignResult = await campaignResponse.json();
        if (campaignResult.success && campaignResult.data.aiSummary) {
          setAiSummary(campaignResult.data.aiSummary);
        }
      }
    } catch (err) {
      console.error('Error fetching ad group data:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountId, campaignId, adGroupId]);

  // 전체 메트릭 합계 계산
  const totalMetrics = data?.ads.reduce(
    (acc, ad) => ({
      spend: acc.spend + ad.metrics.spend,
      impressions: acc.impressions + ad.metrics.impressions,
      clicks: acc.clicks + ad.metrics.clicks,
      conversions: acc.conversions + ad.metrics.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        <p className="text-muted-foreground">광고그룹을 찾을 수 없습니다</p>
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
          계정 대시보드
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}`} className="hover:text-foreground">
          {data.campaign.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">{data.adGroup.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push(`/accounts/${accountId}/campaigns/${campaignId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            캠페인으로 돌아가기
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{data.adGroup.name}</h1>
            <Badge variant={statusVariants[data.adGroup.status] || 'outline'}>
              {statusLabels[data.adGroup.status] || data.adGroup.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            캠페인: {data.campaign.name} · 광고 {data.total}개 · 기간: {data.period.startDate} ~ {data.period.endDate}
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Summary Cards */}
      {totalMetrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 지출</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMetrics.spend)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 노출</p>
              <p className="text-2xl font-bold">{totalMetrics.impressions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 클릭</p>
              <p className="text-2xl font-bold">{totalMetrics.clicks.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">총 전환</p>
              <p className="text-2xl font-bold">{totalMetrics.conversions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Summary Cards */}
      {aiSummary && (
        <div className="grid grid-cols-2 gap-4">
          <Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights`}>
            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Lightbulb className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">캠페인 AI 인사이트</p>
                  <p className="text-2xl font-bold">{aiSummary.insightCount}</p>
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
                  <p className="text-2xl font-bold">{aiSummary.pendingStrategyCount}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Ads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>광고 목록</CardTitle>
              <CardDescription>이 광고그룹의 광고 목록입니다 ({data.total}개)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">광고가 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">광고명</th>
                    <th className="text-left py-3 px-2 font-medium">상태</th>
                    <th className="text-right py-3 px-2 font-medium">크리에이티브</th>
                    <th className="text-right py-3 px-2 font-medium">지출</th>
                    <th className="text-right py-3 px-2 font-medium">노출</th>
                    <th className="text-right py-3 px-2 font-medium">클릭</th>
                    <th className="text-right py-3 px-2 font-medium">전환</th>
                    <th className="text-right py-3 px-2 font-medium">CTR</th>
                    <th className="text-right py-3 px-2 font-medium">CVR</th>
                    <th className="text-right py-3 px-2 font-medium">CPA</th>
                    <th className="text-right py-3 px-2 font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ads.map((ad) => (
                    <tr
                      key={ad.id}
                      className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(
                          `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}/ads/${ad.id}`
                        )
                      }
                    >
                      <td className="py-3 px-2">
                        <div
                          className="font-medium truncate max-w-[200px] text-primary hover:underline"
                          title={ad.name}
                        >
                          {ad.name}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusVariants[ad.status] || 'outline'}>
                          {statusLabels[ad.status] || ad.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">{ad.creativeCount}개</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(ad.metrics.spend)}</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.impressions.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.clicks.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.conversions}</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.ctr.toFixed(2)}%</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.cvr.toFixed(2)}%</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(ad.metrics.cpa)}</td>
                      <td className="py-3 px-2 text-right">{ad.metrics.roas.toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
