'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FilterBar, SearchInput, FilterDropdown } from '@/components/filters';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  _count?: {
    adGroups: number;
  };
}

interface CampaignMetrics {
  spend: number;
  conversions: number;
  roas: number;
}

const statusOptions = [
  { value: 'all', label: '전체 상태' },
  { value: 'ENABLE', label: '운영중' },
  { value: 'DISABLE', label: '일시정지' },
];

const objectiveOptions = [
  { value: 'all', label: '전체 목표' },
  { value: 'TRAFFIC', label: '트래픽' },
  { value: 'CONVERSIONS', label: '전환' },
  { value: 'APP_INSTALL', label: '앱 설치' },
  { value: 'VIDEO_VIEWS', label: '영상 조회' },
  { value: 'REACH', label: '도달' },
];

const statusLabels: Record<string, string> = {
  ENABLE: '운영중',
  DISABLE: '일시정지',
  DELETE: '삭제됨',
};

const objectiveLabels: Record<string, string> = {
  TRAFFIC: '트래픽',
  CONVERSIONS: '전환',
  APP_INSTALL: '앱 설치',
  VIDEO_VIEWS: '영상 조회',
  REACH: '도달',
};

export default function CampaignListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const accountId = params.accountId as string;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, CampaignMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [accountName, setAccountName] = useState('');

  // URL 기반 필터 상태
  const searchQuery = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const objectiveFilter = searchParams.get('objective') || 'all';

  // URL 파라미터 업데이트 함수
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const setSearchQuery = (value: string) => updateUrlParams({ q: value });
  const setStatusFilter = (value: string) => updateUrlParams({ status: value });
  const setObjectiveFilter = (value: string) => updateUrlParams({ objective: value });

  // 캠페인 목록 조회
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/accounts/${accountId}/campaigns`);
        const data = await response.json();
        if (data.success && data.data?.campaigns) {
          setCampaigns(data.data.campaigns);
          // 캠페인 메트릭 조회
          fetchCampaignMetrics(data.data.campaigns);
        }

        // 계정 이름 조회
        const accountRes = await fetch(`/api/accounts/${accountId}`);
        const accountData = await accountRes.json();
        if (accountData.success && accountData.data) {
          setAccountName(accountData.data.name);
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [accountId]);

  // 캠페인별 메트릭 조회
  const fetchCampaignMetrics = async (campaignList: Campaign[]) => {
    setLoadingMetrics(true);
    const newMetrics: Record<string, CampaignMetrics> = {};

    await Promise.all(
      campaignList.map(async (campaign) => {
        try {
          const res = await fetch(`/api/accounts/${accountId}/campaigns/${campaign.id}/metrics?days=7`);
          const data = await res.json();
          if (data.success && data.data) {
            newMetrics[campaign.id] = {
              spend: data.data.totals?.spend || 0,
              conversions: data.data.totals?.conversions || 0,
              roas: data.data.averages?.roas || 0,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch metrics for campaign ${campaign.id}:`, error);
          newMetrics[campaign.id] = { spend: 0, conversions: 0, roas: 0 };
        }
      })
    );

    setMetricsMap(newMetrics);
    setLoadingMetrics(false);
  };

  // 필터링된 캠페인 목록
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((campaign) =>
        campaign.name.toLowerCase().includes(query)
      );
    }

    // 상태 필터
    if (statusFilter !== 'all') {
      result = result.filter((campaign) => campaign.status === statusFilter);
    }

    // 목표 필터
    if (objectiveFilter !== 'all') {
      result = result.filter((campaign) => campaign.objective === objectiveFilter);
    }

    return result;
  }, [campaigns, searchQuery, statusFilter, objectiveFilter]);

  // 새로고침
  const handleRefresh = () => {
    setLoading(true);
    fetch(`/api/accounts/${accountId}/campaigns`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.campaigns) {
          setCampaigns(data.data.campaigns);
          fetchCampaignMetrics(data.data.campaigns);
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">{accountName || '...'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">캠페인 목록</h1>
          <p className="text-muted-foreground">
            캠페인을 선택하여 상세 성과를 확인하세요
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="캠페인 검색..."
        />
        <FilterDropdown
          label="상태"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="목표"
          options={objectiveOptions}
          value={objectiveFilter}
          onChange={setObjectiveFilter}
        />
      </FilterBar>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">캠페인 불러오는 중...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">캠페인이 없습니다</h3>
            <p className="text-muted-foreground">
              TikTok Ads Manager에서 캠페인을 생성한 후 동기화하세요
            </p>
          </div>
        </Card>
      )}

      {/* Campaign List */}
      {!loading && campaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.length === 0 ? (
            <Card className="col-span-full p-8">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setObjectiveFilter('all');
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            </Card>
          ) : (
            filteredCampaigns.map((campaign) => {
              const metrics = metricsMap[campaign.id] || { spend: 0, conversions: 0, roas: 0 };
              return (
                <Link key={campaign.id} href={`/accounts/${accountId}/campaigns/${campaign.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{campaign.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {objectiveLabels[campaign.objective] || campaign.objective} · 예산 {formatCurrency(campaign.budget)}/{campaign.budgetMode === 'DAILY' ? '일' : '총'}
                          </CardDescription>
                        </div>
                        <Badge variant={campaign.status === 'ENABLE' ? 'default' : 'secondary'}>
                          {statusLabels[campaign.status] || campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground text-xs">지출</p>
                          <p className="font-semibold">
                            {loadingMetrics ? '...' : formatCurrency(metrics.spend)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">전환</p>
                          <p className="font-semibold">
                            {loadingMetrics ? '...' : metrics.conversions}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">ROAS</p>
                          <p className="font-semibold">
                            {loadingMetrics ? '...' : `${metrics.roas.toFixed(2)}x`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Layers className="h-3 w-3 mr-1" />
                        광고그룹 {campaign._count?.adGroups || 0}개
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
