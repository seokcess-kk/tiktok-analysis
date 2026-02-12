'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { CreativeCard } from '@/components/creatives/creative-card';
import { CreativeTable } from '@/components/creatives/creative-table';
import { FatigueGauge } from '@/components/creatives/fatigue-chart';
import { GradeDistribution } from '@/components/creatives/score-breakdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Creative {
  id: string;
  tiktokCreativeId: string;
  type: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: unknown;
  hookScore: number | null;
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
    trend: string;
    daysActive: number;
    recommendedAction: string | null;
  } | null;
  score: {
    overall: number;
    grade: string;
  } | null;
}

type GradeDistributionType = Record<string, number>;

type ViewMode = 'grid' | 'table';
type SortOption = 'spend' | 'ctr' | 'cvr' | 'score' | 'fatigueIndex';

export default function CampaignCreativesPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistributionType>({
    S: 0, A: 0, B: 0, C: 0, D: 0, F: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');

  // 캠페인 정보 조회
  useEffect(() => {
    const fetchCampaignInfo = async () => {
      try {
        const response = await fetch(`/api/accounts/${accountId}/campaigns/${campaignId}`);
        const data = await response.json();
        if (data.success && data.data?.campaign) {
          setCampaignName(data.data.campaign.name);
        }
      } catch (err) {
        console.error('Failed to fetch campaign info:', err);
      }
    };
    fetchCampaignInfo();
  }, [accountId, campaignId]);

  // 소재 목록 조회
  useEffect(() => {
    const fetchCreatives = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/accounts/${accountId}/campaigns/${campaignId}/creatives`
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setCreatives(result.data.creatives || []);
          if (result.data.summary?.gradeDistribution) {
            setGradeDistribution(result.data.summary.gradeDistribution);
          }
        } else {
          setCreatives([]);
          setError('소재 데이터를 불러올 수 없습니다.');
        }
      } catch (err) {
        console.error('Failed to fetch creatives:', err);
        setError('데이터를 불러오는데 실패했습니다.');
        setCreatives([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatives();
  }, [accountId, campaignId]);

  // 소재 정렬
  const sortedCreatives = [...creatives].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'spend':
        aVal = a.metrics?.spend || 0;
        bVal = b.metrics?.spend || 0;
        break;
      case 'ctr':
        aVal = a.metrics?.ctr || 0;
        bVal = b.metrics?.ctr || 0;
        break;
      case 'cvr':
        aVal = a.metrics?.cvr || 0;
        bVal = b.metrics?.cvr || 0;
        break;
      case 'score':
        aVal = a.score?.overall || 0;
        bVal = b.score?.overall || 0;
        break;
      case 'fatigueIndex':
        aVal = a.fatigue?.index || 0;
        bVal = b.fatigue?.index || 0;
        break;
      default:
        aVal = a.score?.overall || 0;
        bVal = b.score?.overall || 0;
    }

    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (column: string) => {
    if (column === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column as SortOption);
      setSortOrder('desc');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetch(`/api/accounts/${accountId}/campaigns/${campaignId}/creatives`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setCreatives(result.data.creatives || []);
          if (result.data.summary?.gradeDistribution) {
            setGradeDistribution(result.data.summary.gradeDistribution);
          }
        }
      })
      .finally(() => setIsLoading(false));
  };

  const selectedCreativeData = selectedCreative
    ? creatives.find((c) => c.id === selectedCreative)
    : null;

  // 피로도 통계 계산
  const fatigueStats = {
    healthyCount: creatives.filter((c) => c.fatigue && c.fatigue.index < 40).length,
    warningCount: creatives.filter((c) => c.fatigue && c.fatigue.index >= 40 && c.fatigue.index < 70).length,
    criticalCount: creatives.filter((c) => c.fatigue && c.fatigue.index >= 70 && c.fatigue.trend !== 'EXHAUSTED').length,
    exhaustedCount: creatives.filter((c) => c.fatigue && c.fatigue.trend === 'EXHAUSTED').length,
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          계정
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}`} className="hover:text-foreground">
          캠페인 목록
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaignName || '...'}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground font-medium">소재 분석</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">소재 분석</h1>
          <p className="text-muted-foreground mt-1">이 캠페인의 광고 소재 성과와 피로도를 분석합니다</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="score">점수순</option>
            <option value="spend">지출순</option>
            <option value="ctr">CTR순</option>
            <option value="cvr">CVR순</option>
            <option value="fatigueIndex">피로도순</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">소재 불러오는 중...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && creatives.length === 0 && !error && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">소재가 없습니다</h3>
            <p className="text-muted-foreground">
              이 캠페인에 연결된 소재가 없습니다
            </p>
          </div>
        </Card>
      )}

      {/* Content */}
      {!isLoading && creatives.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">전체 소재</p>
                  <p className="text-2xl font-bold">{creatives.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">등급 분포</p>
                <GradeDistribution distribution={gradeDistribution} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">건강한 소재</p>
                  <p className="text-2xl font-bold text-green-600">{fatigueStats.healthyCount}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">피로도 40 미만</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">주의 필요</p>
                  <p className="text-2xl font-bold text-orange-600">{fatigueStats.warningCount}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">피로도 40-70</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">교체 필요</p>
                  <p className="text-2xl font-bold text-red-600">{fatigueStats.exhaustedCount}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">피로도 70 이상</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Creative List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200">
                {viewMode === 'grid' ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedCreatives.map((creative) => (
                      <CreativeCard
                        key={creative.id}
                        id={creative.id}
                        tiktokCreativeId={creative.tiktokCreativeId}
                        thumbnailUrl={creative.thumbnailUrl || undefined}
                        type={creative.type as 'VIDEO' | 'IMAGE' | 'CAROUSEL'}
                        duration={creative.duration || undefined}
                        metrics={creative.metrics}
                        score={creative.score ? {
                          overall: creative.score.overall,
                          grade: creative.score.grade as 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
                          percentile: 0,
                        } : undefined}
                        fatigue={creative.fatigue ? {
                          index: creative.fatigue.index,
                          trend: creative.fatigue.trend as 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED',
                        } : undefined}
                        onClick={() => setSelectedCreative(creative.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <CreativeTable
                    data={sortedCreatives.map((c) => ({
                      id: c.id,
                      tiktokCreativeId: c.tiktokCreativeId,
                      thumbnailUrl: c.thumbnailUrl || undefined,
                      type: c.type as 'VIDEO' | 'IMAGE' | 'CAROUSEL',
                      duration: c.duration || undefined,
                      metrics: c.metrics,
                      score: c.score ? {
                        overall: c.score.overall,
                        grade: c.score.grade as 'S' | 'A' | 'B' | 'C' | 'D' | 'F',
                        percentile: 0,
                      } : undefined,
                      fatigue: c.fatigue ? {
                        index: c.fatigue.index,
                        trend: c.fatigue.trend as 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED',
                      } : undefined,
                    }))}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    onRowClick={setSelectedCreative}
                  />
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedCreativeData ? (
                <div className="space-y-4 sticky top-4">
                  {/* Score Summary */}
                  {selectedCreativeData.score && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`flex items-center justify-center w-16 h-16 rounded-full font-bold text-2xl border-4 ${
                            selectedCreativeData.score.grade === 'S' ? 'bg-purple-100 text-purple-700 border-purple-500' :
                            selectedCreativeData.score.grade === 'A' ? 'bg-blue-100 text-blue-700 border-blue-500' :
                            selectedCreativeData.score.grade === 'B' ? 'bg-green-100 text-green-700 border-green-500' :
                            selectedCreativeData.score.grade === 'C' ? 'bg-yellow-100 text-yellow-700 border-yellow-500' :
                            selectedCreativeData.score.grade === 'D' ? 'bg-orange-100 text-orange-700 border-orange-500' :
                            'bg-red-100 text-red-700 border-red-500'
                          }`}
                        >
                          {selectedCreativeData.score.grade}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">종합 점수</p>
                          <p className="text-3xl font-bold">{selectedCreativeData.score.overall}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        selectedCreativeData.score.overall >= 80 ? 'bg-purple-50 text-purple-700' :
                        selectedCreativeData.score.overall >= 60 ? 'bg-blue-50 text-blue-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        <p className="text-sm">
                          <strong>권장 조치:</strong> {
                            selectedCreativeData.score.overall >= 80
                              ? '우수한 성과입니다. 예산 증액을 고려하세요.'
                              : selectedCreativeData.score.overall >= 60
                              ? '양호한 성과입니다. 지속적인 모니터링을 권장합니다.'
                              : '성과 개선이 필요합니다. 소재 교체를 검토하세요.'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fatigue Info */}
                  {selectedCreativeData.fatigue && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">피로도 분석</h3>
                      <div className="flex items-center justify-center mb-4">
                        <FatigueGauge
                          index={selectedCreativeData.fatigue.index}
                          trend={selectedCreativeData.fatigue.trend as 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED'}
                          size="lg"
                        />
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">활성 기간</span>
                          <span className="font-medium">{selectedCreativeData.fatigue.daysActive}일</span>
                        </div>
                        {selectedCreativeData.fatigue.recommendedAction && (
                          <div className="p-2 bg-yellow-50 rounded text-yellow-700">
                            {selectedCreativeData.fatigue.recommendedAction}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics Summary */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-medium mb-3">성과 요약</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">지출</p>
                          <p className="font-semibold">₩{selectedCreativeData.metrics.spend.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">전환</p>
                          <p className="font-semibold">{selectedCreativeData.metrics.conversions}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CTR</p>
                          <p className="font-semibold">{selectedCreativeData.metrics.ctr}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">CVR</p>
                          <p className="font-semibold">{selectedCreativeData.metrics.cvr}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>소재를 선택하면 상세 분석을 볼 수 있습니다</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
