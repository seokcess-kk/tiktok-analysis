import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  analyzeCreativeMatrix,
  summarizeByQuadrant,
  sortByReplacementPriority,
  computePerformanceScore,
  type CreativeMatrixInput,
} from '@/lib/analytics/creative-matrix';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/creatives/:accountId/matrix
 * 소재 성과×피로도 매트릭스 분석
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '14', 10);
    const campaignId = searchParams.get('campaignId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // 계정 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 소재 조회 조건 (캠페인 필터 적용)
    let creativeIds: string[] | undefined;

    if (campaignId) {
      // 특정 캠페인의 소재만 조회
      const ads = await prisma.ad.findMany({
        where: {
          adGroup: {
            campaignId,
            campaign: { accountId },
          },
          creativeId: { not: null },
        },
        select: { creativeId: true },
        distinct: ['creativeId'],
      });
      creativeIds = ads.map((a) => a.creativeId!).filter(Boolean);
    }

    // 소재 목록 조회 (최근 피로도 데이터 포함)
    const creativesWithFatigue = await prisma.creative.findMany({
      where: creativeIds ? { id: { in: creativeIds } } : undefined,
      include: {
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        metrics: {
          where: {
            accountId,
            date: { gte: startDate, lte: endDate },
            level: 'CREATIVE',
          },
        },
      },
      take: limit,
    });

    if (creativesWithFatigue.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days,
          },
          summary: [],
          creatives: [],
          replacementQueue: [],
          total: 0,
        },
      });
    }

    // 메트릭 집계 및 성과 점수 계산
    const creativeInputs: CreativeMatrixInput[] = creativesWithFatigue.map((creative) => {
      // 메트릭 집계
      const aggregatedMetrics = creative.metrics.reduce(
        (acc, m) => ({
          spend: acc.spend + m.spend,
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      );

      // CTR, ROAS 계산
      const ctr = aggregatedMetrics.impressions > 0
        ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
        : null;
      const cvr = aggregatedMetrics.clicks > 0
        ? (aggregatedMetrics.conversions / aggregatedMetrics.clicks) * 100
        : null;
      const conversionValue = account.conversionValue ?? 50000;
      const roas = aggregatedMetrics.spend > 0
        ? (aggregatedMetrics.conversions * conversionValue) / aggregatedMetrics.spend
        : null;

      // 성과 점수 계산
      const performanceScore = computePerformanceScore({ ctr, cvr, roas });

      // 피로도 (최신 데이터 사용, 없으면 0)
      const latestFatigue = creative.fatigue[0];
      const fatigueIndex = latestFatigue?.fatigueIndex ?? 0;

      return {
        id: creative.id,
        name: creative.tiktokCreativeId,
        type: creative.type,
        thumbnailUrl: creative.thumbnailUrl,
        performanceScore,
        fatigueIndex,
        metrics: {
          spend: aggregatedMetrics.spend,
          impressions: aggregatedMetrics.impressions,
          clicks: aggregatedMetrics.clicks,
          conversions: aggregatedMetrics.conversions,
          ctr,
          roas,
        },
        fatigueData: latestFatigue
          ? {
              daysActive: latestFatigue.daysActive,
              performanceTrend: latestFatigue.performanceTrend,
              peakPerformanceDate: latestFatigue.peakPerformanceDate,
            }
          : undefined,
      };
    });

    // 매트릭스 분석
    const matrixResults = analyzeCreativeMatrix(creativeInputs);

    // 분면별 요약
    const summary = summarizeByQuadrant(matrixResults);

    // 교체 우선순위 큐 (REFRESH + KILL, 우선순위순)
    const replacementQueue = sortByReplacementPriority(
      matrixResults.filter(
        (r) => r.position.quadrant === 'REFRESH' || r.position.quadrant === 'KILL'
      )
    ).slice(0, 10);

    // 응답 구성
    const creativesResponse = matrixResults.map((result) => ({
      id: result.id,
      name: result.name,
      type: result.type,
      thumbnailUrl: result.thumbnailUrl,
      quadrant: result.position.quadrant,
      performanceScore: result.position.x,
      fatigueIndex: result.position.y,
      priority: result.position.priority,
      urgency: result.position.urgency,
      recommendation: result.position.recommendation,
      metrics: result.metrics,
      fatigueData: result.fatigueData
        ? {
            daysActive: result.fatigueData.daysActive,
            performanceTrend: result.fatigueData.performanceTrend,
            peakPerformanceDate: result.fatigueData.peakPerformanceDate?.toISOString().split('T')[0],
          }
        : null,
    }));

    const summaryResponse = summary.map((s) => ({
      quadrant: s.quadrant,
      count: s.count,
      avgPerformance: Number(s.avgPerformance.toFixed(1)),
      avgFatigue: Number(s.avgFatigue.toFixed(1)),
    }));

    const replacementQueueResponse = replacementQueue.map((r) => ({
      id: r.id,
      name: r.name,
      quadrant: r.position.quadrant,
      priority: r.position.priority,
      urgency: r.position.urgency,
      recommendation: r.position.recommendation,
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
        summary: summaryResponse,
        creatives: creativesResponse,
        replacementQueue: replacementQueueResponse,
        total: creativesResponse.length,
      },
    });
  } catch (error) {
    console.error('Error analyzing creative matrix:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze creative matrix',
        },
      },
      { status: 500 }
    );
  }
}
