import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  calculateFatigueIndex,
  categorizeFatigueStatus,
  type DailyMetric,
} from '@/lib/analytics';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/creatives/:accountId/fatigue
 * 소재 피로도 분석 데이터 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    const days = parseInt(searchParams.get('days') || '30', 10);
    const minImpressions = parseInt(searchParams.get('minImpressions') || '1000', 10);

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

    // 소재별 일별 메트릭 조회
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
          orderBy: { date: 'asc' },
        },
      },
    });

    // 최소 노출수 필터링 및 피로도 계산
    const fatigueData = creatives
      .filter((creative) => {
        const totalImpressions = creative.metrics.reduce(
          (sum, m) => sum + m.impressions,
          0
        );
        return totalImpressions >= minImpressions;
      })
      .map((creative) => {
        // 일별 메트릭 데이터 변환
        const dailyMetrics: DailyMetric[] = creative.metrics.map((m) => ({
          date: m.date,
          impressions: m.impressions,
          ctr: m.ctr || 0,
          cvr: m.cvr || 0,
          frequency: m.impressions > 0 ? m.impressions / 1000 : 0, // 임시 빈도 계산
        }));

        // 소재 수명 계산
        const creativeAge = Math.floor(
          (Date.now() - new Date(creative.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        // 피로도 계산
        const fatigue = calculateFatigueIndex({
          dailyMetrics,
          creativeAge,
        });

        // 타임라인 데이터 생성
        const fatigueTimeline = dailyMetrics.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          ctr: m.ctr,
          cvr: m.cvr,
          impressions: m.impressions,
        }));

        return {
          id: creative.id,
          tiktokCreativeId: creative.tiktokCreativeId,
          type: creative.type,
          thumbnailUrl: creative.thumbnailUrl,
          createdAt: creative.createdAt,
          fatigueTimeline,
          currentFatigue: {
            index: fatigue.index,
            trend: fatigue.trend,
            peakDate: fatigue.peakDate?.toISOString().split('T')[0] || null,
            peakCtr: fatigue.peakCtr,
            currentCtr: fatigue.currentCtr,
            daysSincePeak: fatigue.daysFromPeak,
            estimatedExhaustion: fatigue.estimatedExhaustion?.toISOString().split('T')[0] || null,
          },
          factors: fatigue.factors.map((f) => ({
            factor: f.factor,
            weight: Math.round(f.weight * 100),
            value: Math.round(f.value),
            contribution: Math.round(f.contribution),
          })),
          recommendation: fatigue.recommendation,
        };
      });

    // 피로도 상태별 분류
    const statusCategories = categorizeFatigueStatus(
      fatigueData.map((d) => ({
        id: d.id,
        fatigueIndex: d.currentFatigue.index,
        trend: d.currentFatigue.trend as 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED',
      }))
    );

    // 피로도 순으로 정렬 (높은 순)
    fatigueData.sort((a, b) => b.currentFatigue.index - a.currentFatigue.index);

    // 평균 수명 계산
    const avgLifespan =
      fatigueData.length > 0
        ? Math.round(
            fatigueData.reduce((sum, d) => {
              const age = Math.floor(
                (Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + age;
            }, 0) / fatigueData.length
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        creatives: fatigueData,
        overview: {
          totalCreatives: fatigueData.length,
          healthyCount: statusCategories.healthy.length,
          warningCount: statusCategories.warning.length,
          criticalCount: statusCategories.critical.length,
          exhaustedCount: statusCategories.exhausted.length,
          avgLifespan,
        },
        urgentAttention: fatigueData
          .filter((d) => d.recommendation.urgency === 'CRITICAL' || d.recommendation.urgency === 'HIGH')
          .map((d) => ({
            id: d.id,
            tiktokCreativeId: d.tiktokCreativeId,
            fatigueIndex: d.currentFatigue.index,
            recommendation: d.recommendation,
          })),
        dateRange: {
          days,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error analyzing fatigue:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to analyze creative fatigue',
        },
      },
      { status: 500 }
    );
  }
}
