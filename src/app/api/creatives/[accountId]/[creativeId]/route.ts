import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  calculateFatigueIndex,
  scoreCreative,
  DEFAULT_BENCHMARKS,
  type DailyMetric,
} from '@/lib/analytics';

interface RouteParams {
  params: { accountId: string; creativeId: string };
}

/**
 * GET /api/creatives/:accountId/:creativeId
 * 단일 소재 상세 정보 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, creativeId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '30', 10);

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

    // 날짜 범위 설정
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    // 소재 상세 조회
    const creative = await prisma.creative.findUnique({
      where: { id: creativeId },
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
          orderBy: { date: 'asc' },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        ads: {
          include: {
            adGroup: {
              include: {
                campaign: true,
              },
            },
          },
        },
      },
    });

    if (!creative) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Creative not found' },
        },
        { status: 404 }
      );
    }

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
    const avgVideoPlayTime = aggregatedMetrics.videoViews > 0
      ? aggregatedMetrics.totalPlayTime / aggregatedMetrics.videoViews
      : 0;

    const metrics = {
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
    };

    // 일별 트렌드 데이터
    const dailyTrend = creative.metrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      spend: m.spend,
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
      ctr: m.ctr,
      cvr: m.cvr,
      cpa: m.cpa,
    }));

    // 피로도 계산
    const dailyMetrics: DailyMetric[] = creative.metrics.map((m) => ({
      date: m.date,
      impressions: m.impressions,
      ctr: m.ctr || 0,
      cvr: m.cvr || 0,
      frequency: m.impressions > 0 ? m.impressions / 1000 : 0,
    }));

    const creativeAge = Math.floor(
      (Date.now() - new Date(creative.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const fatigue = calculateFatigueIndex({
      dailyMetrics,
      creativeAge,
    });

    // 점수 계산
    const score = scoreCreative(
      {
        id: creative.id,
        type: creative.type as 'VIDEO' | 'IMAGE' | 'CAROUSEL',
        metrics,
        fatigue: {
          index: fatigue.index,
          trend: fatigue.trend,
        },
      },
      DEFAULT_BENCHMARKS
    );

    // 피로도 히스토리 (있는 경우)
    const fatigueHistory = creative.fatigue.map((f) => ({
      date: f.date.toISOString().split('T')[0],
      index: f.fatigueIndex,
      trend: f.performanceTrend,
      daysActive: f.daysActive,
    }));

    // 연결된 광고/캠페인 정보
    const linkedAds = creative.ads.map((ad) => ({
      adId: ad.id,
      adName: ad.name,
      adGroupId: ad.adGroup.id,
      adGroupName: ad.adGroup.name,
      campaignId: ad.adGroup.campaign.id,
      campaignName: ad.adGroup.campaign.name,
      status: ad.status,
    }));

    return NextResponse.json({
      success: true,
      data: {
        creative: {
          id: creative.id,
          tiktokCreativeId: creative.tiktokCreativeId,
          type: creative.type,
          thumbnailUrl: creative.thumbnailUrl,
          videoUrl: creative.videoUrl,
          imageUrl: creative.imageUrl,
          duration: creative.duration,
          tags: creative.tags || [],
          hookScore: creative.hookScore,
          createdAt: creative.createdAt,
          age: creativeAge,
        },
        metrics,
        dailyTrend,
        score: {
          overall: score.overall,
          breakdown: score.breakdown,
          grade: score.grade,
          recommendation: score.recommendation,
        },
        fatigue: {
          current: {
            index: fatigue.index,
            trend: fatigue.trend,
            peakDate: fatigue.peakDate?.toISOString().split('T')[0] || null,
            peakCtr: fatigue.peakCtr,
            currentCtr: fatigue.currentCtr,
            daysSincePeak: fatigue.daysFromPeak,
            estimatedExhaustion: fatigue.estimatedExhaustion?.toISOString().split('T')[0] || null,
          },
          factors: fatigue.factors,
          recommendation: fatigue.recommendation,
          history: fatigueHistory,
        },
        linkedAds,
        dateRange: {
          days,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching creative detail:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch creative detail',
        },
      },
      { status: 500 }
    );
  }
}
