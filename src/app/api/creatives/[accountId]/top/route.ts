import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  scoreCreatives,
  getTopCreatives,
  getBottomCreatives,
  DEFAULT_BENCHMARKS,
  type CreativeWithMetrics,
} from '@/lib/analytics';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/creatives/:accountId/top
 * Top/Bottom 성과 소재 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '7', 10);
    const topN = parseInt(searchParams.get('topN') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'score'; // score, spend, ctr, cvr, roas

    // 계정 존재 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { client: true },
    });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Account not found' },
        },
        { status: 404 }
      );
    }

    // 날짜 범위 설정
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // 소재 및 메트릭 조회
    const creatives = await prisma.creative.findMany({
      where: {
        metrics: {
          some: {
            accountId,
            date: {
              gte: start,
              lte: end,
            },
            level: 'CREATIVE',
          },
        },
      },
      include: {
        metrics: {
          where: {
            accountId,
            date: {
              gte: start,
              lte: end,
            },
            level: 'CREATIVE',
          },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    // 메트릭 집계 및 점수 계산 데이터 준비
    const creativesForScoring: CreativeWithMetrics[] = creatives.map((creative) => {
      const aggregatedMetrics = creative.metrics.reduce(
        (acc, m) => ({
          spend: acc.spend + m.spend,
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
          videoViews: acc.videoViews + (m.videoViews || 0),
          videoWatched2s: acc.videoWatched2s + (m.videoWatched2s || 0),
          videoWatched6s: acc.videoWatched6s + (m.videoWatched6s || 0),
          totalPlayTime: acc.totalPlayTime + ((m.avgVideoPlayTime || 0) * (m.videoViews || 0)),
        }),
        {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          videoViews: 0,
          videoWatched2s: 0,
          videoWatched6s: 0,
          totalPlayTime: 0,
        }
      );

      const ctr = aggregatedMetrics.impressions > 0
        ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
        : 0;
      const cvr = aggregatedMetrics.clicks > 0
        ? (aggregatedMetrics.conversions / aggregatedMetrics.clicks) * 100
        : 0;
      const cpc = aggregatedMetrics.clicks > 0
        ? aggregatedMetrics.spend / aggregatedMetrics.clicks
        : 0;
      const cpm = aggregatedMetrics.impressions > 0
        ? (aggregatedMetrics.spend / aggregatedMetrics.impressions) * 1000
        : 0;
      const cpa = aggregatedMetrics.conversions > 0
        ? aggregatedMetrics.spend / aggregatedMetrics.conversions
        : 0;
      const avgVideoPlayTime = aggregatedMetrics.videoViews > 0
        ? aggregatedMetrics.totalPlayTime / aggregatedMetrics.videoViews
        : 0;

      return {
        id: creative.id,
        type: creative.type as 'VIDEO' | 'IMAGE' | 'CAROUSEL',
        metrics: {
          spend: aggregatedMetrics.spend,
          impressions: aggregatedMetrics.impressions,
          clicks: aggregatedMetrics.clicks,
          conversions: aggregatedMetrics.conversions,
          ctr,
          cvr,
          cpc,
          cpm,
          cpa,
          roas: 0,
          videoViews: aggregatedMetrics.videoViews,
          videoWatched2s: aggregatedMetrics.videoWatched2s,
          videoWatched6s: aggregatedMetrics.videoWatched6s,
          avgVideoPlayTime,
        },
        fatigue: creative.fatigue[0]
          ? {
              index: creative.fatigue[0].fatigueIndex,
              trend: creative.fatigue[0].performanceTrend,
            }
          : null,
      };
    });

    // 점수 계산
    const scores = scoreCreatives(creativesForScoring, DEFAULT_BENCHMARKS);

    // Top/Bottom 소재 추출
    const topCreativeScores = getTopCreatives(scores, topN);
    const bottomCreativeScores = getBottomCreatives(scores, topN);

    // 상세 정보 매핑 함수
    const mapCreativeDetails = (scoreItem: { id: string; score: ReturnType<typeof scores.get> }) => {
      const creative = creatives.find((c) => c.id === scoreItem.id);
      const metrics = creativesForScoring.find((c) => c.id === scoreItem.id)?.metrics;

      return {
        id: scoreItem.id,
        tiktokCreativeId: creative?.tiktokCreativeId,
        type: creative?.type,
        thumbnailUrl: creative?.thumbnailUrl,
        videoUrl: creative?.videoUrl,
        duration: creative?.duration,
        tags: creative?.tags || [],
        hookScore: creative?.hookScore,
        metrics,
        score: scoreItem.score,
        fatigue: creative?.fatigue[0]
          ? {
              index: creative.fatigue[0].fatigueIndex,
              trend: creative.fatigue[0].performanceTrend,
              recommendedAction: creative.fatigue[0].recommendedAction,
            }
          : null,
      };
    };

    const topCreatives = topCreativeScores.map(mapCreativeDetails);
    const bottomCreatives = bottomCreativeScores.map(mapCreativeDetails);

    // 정렬 기준에 따른 재정렬
    const sortFn = (a: typeof topCreatives[0], b: typeof topCreatives[0]) => {
      switch (sortBy) {
        case 'spend':
          return (b.metrics?.spend || 0) - (a.metrics?.spend || 0);
        case 'ctr':
          return (b.metrics?.ctr || 0) - (a.metrics?.ctr || 0);
        case 'cvr':
          return (b.metrics?.cvr || 0) - (a.metrics?.cvr || 0);
        case 'roas':
          return (b.metrics?.roas || 0) - (a.metrics?.roas || 0);
        case 'score':
        default:
          return (b.score?.overall || 0) - (a.score?.overall || 0);
      }
    };

    topCreatives.sort(sortFn);

    // 성공 요인 추출 (Top 소재들의 공통 특성)
    const successFactors = extractSuccessFactors(topCreatives);

    // 개선 포인트 추출 (Bottom 소재들의 문제점)
    const improvementPoints = extractImprovementPoints(bottomCreatives);

    return NextResponse.json({
      success: true,
      data: {
        topCreatives,
        bottomCreatives,
        analysis: {
          successFactors,
          improvementPoints,
          avgTopScore: Math.round(
            topCreatives.reduce((sum, c) => sum + (c.score?.overall || 0), 0) / topCreatives.length
          ),
          avgBottomScore: Math.round(
            bottomCreatives.reduce((sum, c) => sum + (c.score?.overall || 0), 0) /
              bottomCreatives.length
          ),
        },
        dateRange: {
          days,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching top creatives:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch top creatives',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Top 소재들의 성공 요인 추출
 */
function extractSuccessFactors(topCreatives: Array<{ score?: { breakdown?: { efficiency: number; scale: number; sustainability: number; engagement: number } } | null }>): string[] {
  const factors: string[] = [];

  if (topCreatives.length === 0) return factors;

  const avgBreakdown = topCreatives.reduce(
    (acc, c) => ({
      efficiency: acc.efficiency + (c.score?.breakdown?.efficiency || 0),
      scale: acc.scale + (c.score?.breakdown?.scale || 0),
      sustainability: acc.sustainability + (c.score?.breakdown?.sustainability || 0),
      engagement: acc.engagement + (c.score?.breakdown?.engagement || 0),
    }),
    { efficiency: 0, scale: 0, sustainability: 0, engagement: 0 }
  );

  const count = topCreatives.length;
  avgBreakdown.efficiency /= count;
  avgBreakdown.scale /= count;
  avgBreakdown.sustainability /= count;
  avgBreakdown.engagement /= count;

  if (avgBreakdown.efficiency >= 70) {
    factors.push('높은 클릭률과 전환율을 보이는 효율적인 소재');
  }
  if (avgBreakdown.scale >= 70) {
    factors.push('대규모 노출과 전환 볼륨 달성');
  }
  if (avgBreakdown.sustainability >= 70) {
    factors.push('낮은 피로도로 지속 가능한 성과');
  }
  if (avgBreakdown.engagement >= 70) {
    factors.push('높은 영상 시청 완료율');
  }

  return factors;
}

/**
 * Bottom 소재들의 개선 포인트 추출
 */
function extractImprovementPoints(bottomCreatives: Array<{ score?: { breakdown?: { efficiency: number; scale: number; sustainability: number; engagement: number } } | null }>): string[] {
  const points: string[] = [];

  if (bottomCreatives.length === 0) return points;

  const avgBreakdown = bottomCreatives.reduce(
    (acc, c) => ({
      efficiency: acc.efficiency + (c.score?.breakdown?.efficiency || 0),
      scale: acc.scale + (c.score?.breakdown?.scale || 0),
      sustainability: acc.sustainability + (c.score?.breakdown?.sustainability || 0),
      engagement: acc.engagement + (c.score?.breakdown?.engagement || 0),
    }),
    { efficiency: 0, scale: 0, sustainability: 0, engagement: 0 }
  );

  const count = bottomCreatives.length;
  avgBreakdown.efficiency /= count;
  avgBreakdown.scale /= count;
  avgBreakdown.sustainability /= count;
  avgBreakdown.engagement /= count;

  if (avgBreakdown.efficiency < 50) {
    points.push('클릭률/전환율 개선이 필요합니다. 소재 메시지와 CTA를 점검하세요.');
  }
  if (avgBreakdown.scale < 50) {
    points.push('노출 볼륨이 부족합니다. 타겟팅 범위를 확대하거나 예산을 조정하세요.');
  }
  if (avgBreakdown.sustainability < 50) {
    points.push('소재 피로도가 높습니다. 새로운 소재로 교체를 권장합니다.');
  }
  if (avgBreakdown.engagement < 50) {
    points.push('영상 시청 이탈이 높습니다. 첫 3초의 훅(Hook)을 강화하세요.');
  }

  return points;
}
