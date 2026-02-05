import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  scoreCreatives,
  getCreativesSummary,
  DEFAULT_BENCHMARKS,
  type CreativeWithMetrics,
} from '@/lib/analytics';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/creatives/:accountId
 * 소재 목록 + 성과 데이터 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') as 'VIDEO' | 'IMAGE' | 'CAROUSEL' | null;
    const sortBy = searchParams.get('sortBy') || 'spend';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 계정 존재 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
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

    // 날짜 범위 설정 (기본: 최근 7일)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 소재 목록 조회 (메트릭과 함께)
    const creativesWithMetrics = await prisma.creative.findMany({
      where: {
        ...(type && { type }),
        metrics: {
          some: {
            accountId,
            date: {
              gte: start,
              lte: end,
            },
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

    // 메트릭 집계 및 점수 계산을 위한 데이터 준비
    const creativesForScoring: CreativeWithMetrics[] = creativesWithMetrics.map((creative) => {
      // 메트릭 집계
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

      // 비율 계산
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
      const roas = aggregatedMetrics.spend > 0
        ? 0 // ROAS는 revenue 데이터 필요
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
          roas,
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
    const summary = getCreativesSummary(scores);

    // 응답 데이터 생성
    const responseData = creativesWithMetrics.map((creative) => {
      const scoring = scores.get(creative.id);
      const creativesData = creativesForScoring.find((c) => c.id === creative.id);

      return {
        id: creative.id,
        tiktokCreativeId: creative.tiktokCreativeId,
        type: creative.type,
        thumbnailUrl: creative.thumbnailUrl,
        videoUrl: creative.videoUrl,
        duration: creative.duration,
        tags: creative.tags || [],
        hookScore: creative.hookScore,
        metrics: creativesData?.metrics,
        fatigue: creative.fatigue[0]
          ? {
              index: creative.fatigue[0].fatigueIndex,
              trend: creative.fatigue[0].performanceTrend,
              daysActive: creative.fatigue[0].daysActive,
              recommendedAction: creative.fatigue[0].recommendedAction,
            }
          : null,
        score: scoring
          ? {
              overall: scoring.overall,
              breakdown: scoring.breakdown,
              grade: scoring.grade,
              rank: scoring.rank,
              percentile: scoring.percentile,
            }
          : null,
      };
    });

    // 정렬
    responseData.sort((a, b) => {
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
        case 'roas':
          aVal = a.metrics?.roas || 0;
          bVal = b.metrics?.roas || 0;
          break;
        case 'fatigueIndex':
          aVal = a.fatigue?.index || 0;
          bVal = b.fatigue?.index || 0;
          break;
        case 'score':
          aVal = a.score?.overall || 0;
          bVal = b.score?.overall || 0;
          break;
        default:
          aVal = a.metrics?.spend || 0;
          bVal = b.metrics?.spend || 0;
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // 페이지네이션
    const paginatedData = responseData.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        creatives: paginatedData,
        pagination: {
          total: responseData.length,
          limit,
          offset,
        },
        summary: {
          totalCreatives: summary.totalCreatives,
          avgScore: summary.avgScore,
          gradeDistribution: summary.gradeDistribution,
          topPerformers: summary.topPerformersCount,
          needsAttention: summary.needsAttentionCount,
        },
        dateRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch creatives',
        },
      },
      { status: 500 }
    );
  }
}
