import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  aggregateAndCompute,
  computeChange,
  metricsWithDefaults,
  type RawMetrics,
} from '@/lib/analytics/metrics-calculator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId/metrics
 * 캠페인 레벨 일별 메트릭 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 30);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 캠페인 및 계정 확인
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
      include: {
        account: {
          select: { conversionValue: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    // 날짜 범위 계산
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // 일별 메트릭 조회
    const dailyMetrics = await prisma.performanceMetric.findMany({
      where: {
        campaignId,
        level: 'CAMPAIGN',
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // 공통 모듈로 집계 계산 (계정별 conversionValue 적용)
    const conversionValue = campaign.account.conversionValue ?? undefined;
    const rawList: RawMetrics[] = dailyMetrics.map((m) => ({
      spend: m.spend,
      impressions: m.impressions,
      clicks: m.clicks,
      conversions: m.conversions,
    }));
    const aggregated = aggregateAndCompute(rawList, { conversionValue });
    const totals = {
      spend: aggregated.spend,
      impressions: aggregated.impressions,
      clicks: aggregated.clicks,
      conversions: aggregated.conversions,
    };
    const avgMetrics = metricsWithDefaults(aggregated);

    // 이전 기간 비교
    const comparePeriod = searchParams.get('compare') === 'true';
    let comparison: {
      period: { startDate: string; endDate: string };
      totals: { spend: number; impressions: number; clicks: number; conversions: number };
      averages: { ctr: number; cpc: number; cpa: number; roas: number };
      changes: { spend: number; impressions: number; clicks: number; conversions: number; ctr: number; cpc: number; cpa: number; roas: number };
    } | null = null;

    if (comparePeriod) {
      const periodDuration = endDate.getTime() - startDate.getTime();
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - periodDuration);

      const prevMetrics = await prisma.performanceMetric.findMany({
        where: {
          campaignId,
          level: 'CAMPAIGN',
          date: { gte: prevStartDate, lte: prevEndDate },
        },
      });

      // 공통 모듈로 이전 기간 집계
      const prevRawList: RawMetrics[] = prevMetrics.map((m) => ({
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
      }));
      const prevAggregated = aggregateAndCompute(prevRawList, { conversionValue });
      const prevAvgMetrics = metricsWithDefaults(prevAggregated);

      comparison = {
        period: {
          startDate: prevStartDate.toISOString().split('T')[0],
          endDate: prevEndDate.toISOString().split('T')[0],
        },
        totals: {
          spend: prevAggregated.spend,
          impressions: prevAggregated.impressions,
          clicks: prevAggregated.clicks,
          conversions: prevAggregated.conversions,
        },
        averages: {
          ctr: prevAvgMetrics.ctr,
          cpc: prevAvgMetrics.cpc,
          cpa: prevAvgMetrics.cpa,
          roas: prevAvgMetrics.roas,
        },
        changes: {
          spend: computeChange(totals.spend, prevAggregated.spend) ?? 0,
          impressions: computeChange(totals.impressions, prevAggregated.impressions) ?? 0,
          clicks: computeChange(totals.clicks, prevAggregated.clicks) ?? 0,
          conversions: computeChange(totals.conversions, prevAggregated.conversions) ?? 0,
          ctr: computeChange(avgMetrics.ctr, prevAvgMetrics.ctr) ?? 0,
          cpc: computeChange(avgMetrics.cpc, prevAvgMetrics.cpc) ?? 0,
          cpa: computeChange(avgMetrics.cpa, prevAvgMetrics.cpa) ?? 0,
          roas: computeChange(avgMetrics.roas, prevAvgMetrics.roas) ?? 0,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
        totals: {
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
        },
        averages: {
          ctr: avgMetrics.ctr,
          cpc: avgMetrics.cpc,
          cpa: avgMetrics.cpa,
          roas: avgMetrics.roas,
          valueSource: aggregated.valueSource,
        },
        daily: dailyMetrics.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          spend: m.spend,
          impressions: m.impressions,
          clicks: m.clicks,
          conversions: m.conversions,
          ctr: m.ctr || 0,
          cpc: m.cpc || 0,
          cpa: m.cpa || 0,
          roas: m.roas || 0,
        })),
        comparison,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch campaign metrics',
        },
      },
      { status: 500 }
    );
  }
}
