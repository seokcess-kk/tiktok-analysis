'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CreativeCard } from '@/components/creatives/creative-card';
import { CreativeTable } from '@/components/creatives/creative-table';
import { FatigueChart, FatigueGauge } from '@/components/creatives/fatigue-chart';
import { ScoreBreakdown, GradeDistribution } from '@/components/creatives/score-breakdown';

// Mock data for demonstration
const mockCreatives = [
  {
    id: '1',
    tiktokCreativeId: 'creative_001_summer_sale',
    type: 'VIDEO' as const,
    thumbnailUrl: null,
    duration: 15,
    tags: ['세일', '여름', '할인'],
    metrics: {
      spend: 1250000,
      impressions: 850000,
      clicks: 12500,
      conversions: 380,
      ctr: 1.47,
      cvr: 3.04,
      cpc: 100,
      cpm: 1471,
      cpa: 3289,
      roas: 2.8,
    },
    score: {
      overall: 85,
      breakdown: { efficiency: 88, scale: 82, sustainability: 85, engagement: 80 },
      grade: 'A' as const,
      percentile: 92,
    },
    fatigue: {
      index: 25,
      trend: 'STABLE' as const,
      daysActive: 12,
      recommendedAction: null,
    },
  },
  {
    id: '2',
    tiktokCreativeId: 'creative_002_product_demo',
    type: 'VIDEO' as const,
    thumbnailUrl: null,
    duration: 30,
    tags: ['제품', '데모', '튜토리얼'],
    metrics: {
      spend: 980000,
      impressions: 620000,
      clicks: 8200,
      conversions: 210,
      ctr: 1.32,
      cvr: 2.56,
      cpc: 120,
      cpm: 1581,
      cpa: 4667,
      roas: 2.1,
    },
    score: {
      overall: 72,
      breakdown: { efficiency: 70, scale: 68, sustainability: 75, engagement: 78 },
      grade: 'B' as const,
      percentile: 75,
    },
    fatigue: {
      index: 45,
      trend: 'DECLINING' as const,
      daysActive: 21,
      recommendedAction: '대체 소재 준비 권장',
    },
  },
  {
    id: '3',
    tiktokCreativeId: 'creative_003_testimonial',
    type: 'VIDEO' as const,
    thumbnailUrl: null,
    duration: 20,
    tags: ['후기', '고객', 'UGC'],
    metrics: {
      spend: 450000,
      impressions: 280000,
      clicks: 5600,
      conversions: 195,
      ctr: 2.0,
      cvr: 3.48,
      cpc: 80,
      cpm: 1607,
      cpa: 2308,
      roas: 3.5,
    },
    score: {
      overall: 91,
      breakdown: { efficiency: 95, scale: 72, sustainability: 92, engagement: 88 },
      grade: 'S' as const,
      percentile: 98,
    },
    fatigue: {
      index: 15,
      trend: 'RISING' as const,
      daysActive: 7,
      recommendedAction: null,
    },
  },
  {
    id: '4',
    tiktokCreativeId: 'creative_004_brand_story',
    type: 'VIDEO' as const,
    thumbnailUrl: null,
    duration: 45,
    tags: ['브랜드', '스토리', '감성'],
    metrics: {
      spend: 750000,
      impressions: 520000,
      clicks: 4200,
      conversions: 85,
      ctr: 0.81,
      cvr: 2.02,
      cpc: 179,
      cpm: 1442,
      cpa: 8824,
      roas: 1.2,
    },
    score: {
      overall: 48,
      breakdown: { efficiency: 42, scale: 55, sustainability: 60, engagement: 45 },
      grade: 'D' as const,
      percentile: 25,
    },
    fatigue: {
      index: 72,
      trend: 'EXHAUSTED' as const,
      daysActive: 35,
      recommendedAction: '즉시 교체 필요',
    },
  },
  {
    id: '5',
    tiktokCreativeId: 'creative_005_flash_sale',
    type: 'IMAGE' as const,
    thumbnailUrl: null,
    duration: null,
    tags: ['플래시', '세일', '긴급'],
    metrics: {
      spend: 320000,
      impressions: 410000,
      clicks: 6150,
      conversions: 145,
      ctr: 1.5,
      cvr: 2.36,
      cpc: 52,
      cpm: 780,
      cpa: 2207,
      roas: 2.9,
    },
    score: {
      overall: 78,
      breakdown: { efficiency: 82, scale: 70, sustainability: 80, engagement: 50 },
      grade: 'B' as const,
      percentile: 80,
    },
    fatigue: {
      index: 38,
      trend: 'STABLE' as const,
      daysActive: 14,
      recommendedAction: null,
    },
  },
];

const mockFatigueOverview = {
  healthyCount: 3,
  warningCount: 1,
  criticalCount: 0,
  exhaustedCount: 1,
  avgLifespan: 18,
};

const mockGradeDistribution = {
  S: 1,
  A: 1,
  B: 2,
  C: 0,
  D: 1,
  F: 0,
};

type ViewMode = 'grid' | 'table';
type SortOption = 'spend' | 'ctr' | 'cvr' | 'score' | 'fatigueIndex';

export default function CreativesPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);

  // Sort creatives
  const sortedCreatives = [...mockCreatives].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'spend':
        aVal = a.metrics.spend;
        bVal = b.metrics.spend;
        break;
      case 'ctr':
        aVal = a.metrics.ctr;
        bVal = b.metrics.ctr;
        break;
      case 'cvr':
        aVal = a.metrics.cvr;
        bVal = b.metrics.cvr;
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

  const selectedCreativeData = selectedCreative
    ? mockCreatives.find((c) => c.id === selectedCreative)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">소재 분석</h1>
          <p className="text-gray-500 mt-1">광고 소재별 성과와 피로도를 분석합니다</p>
        </div>
        <div className="flex items-center gap-4">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 소재</p>
              <p className="text-2xl font-bold text-gray-900">{mockCreatives.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">등급 분포</p>
            <GradeDistribution distribution={mockGradeDistribution} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">건강한 소재</p>
              <p className="text-2xl font-bold text-green-600">{mockFatigueOverview.healthyCount}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">피로도 40 미만</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">주의 필요</p>
              <p className="text-2xl font-bold text-orange-600">{mockFatigueOverview.warningCount}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">피로도 40-70</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">교체 필요</p>
              <p className="text-2xl font-bold text-red-600">{mockFatigueOverview.exhaustedCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">피로도 70 이상</p>
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
                    {...creative}
                    onClick={() => setSelectedCreative(creative.id)}
                  />
                ))}
              </div>
            ) : (
              <CreativeTable
                data={sortedCreatives.map((c) => ({
                  ...c,
                  score: c.score ? {
                    overall: c.score.overall,
                    grade: c.score.grade,
                    percentile: c.score.percentile,
                  } : null,
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
              {/* Score Breakdown */}
              {selectedCreativeData.score && (
                <ScoreBreakdown
                  overall={selectedCreativeData.score.overall}
                  breakdown={selectedCreativeData.score.breakdown}
                  grade={selectedCreativeData.score.grade}
                  recommendation={
                    selectedCreativeData.score.overall >= 80
                      ? '우수한 성과입니다. 예산 증액을 고려하세요.'
                      : selectedCreativeData.score.overall >= 60
                      ? '양호한 성과입니다. 지속적인 모니터링을 권장합니다.'
                      : '성과 개선이 필요합니다. 소재 교체를 검토하세요.'
                  }
                />
              )}

              {/* Fatigue Info */}
              {selectedCreativeData.fatigue && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">피로도 분석</h3>
                  <div className="flex items-center justify-center mb-4">
                    <FatigueGauge
                      index={selectedCreativeData.fatigue.index}
                      trend={selectedCreativeData.fatigue.trend}
                      size="lg"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">활성 기간</span>
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

              {/* Performance Trend Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">성과 추이</h3>
                <FatigueChart
                  data={[
                    { date: '2026-01-29', ctr: 1.2, cvr: 2.8 },
                    { date: '2026-01-30', ctr: 1.4, cvr: 3.0 },
                    { date: '2026-01-31', ctr: 1.5, cvr: 3.1 },
                    { date: '2026-02-01', ctr: 1.6, cvr: 3.2 },
                    { date: '2026-02-02', ctr: 1.5, cvr: 3.0 },
                    { date: '2026-02-03', ctr: 1.4, cvr: 2.9 },
                    { date: '2026-02-04', ctr: 1.3, cvr: 2.8 },
                  ]}
                  peakDate="2026-02-01"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p>소재를 선택하면 상세 분석을 볼 수 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
