import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

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

    // 캠페인 확인
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
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

    // 집계 계산
    const totals = dailyMetrics.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const avgCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const roas = totals.spend > 0 ? (totals.conversions * 50000) / totals.spend : 0;

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

      const prevTotals = prevMetrics.reduce(
        (acc, m) => ({
          spend: acc.spend + m.spend,
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      );

      const prevCtr = prevTotals.impressions > 0 ? (prevTotals.clicks / prevTotals.impressions) * 100 : 0;
      const prevCpc = prevTotals.clicks > 0 ? prevTotals.spend / prevTotals.clicks : 0;
      const prevCpa = prevTotals.conversions > 0 ? prevTotals.spend / prevTotals.conversions : 0;
      const prevRoas = prevTotals.spend > 0 ? (prevTotals.conversions * 50000) / prevTotals.spend : 0;

      comparison = {
        period: {
          startDate: prevStartDate.toISOString().split('T')[0],
          endDate: prevEndDate.toISOString().split('T')[0],
        },
        totals: prevTotals,
        averages: {
          ctr: prevCtr,
          cpc: prevCpc,
          cpa: prevCpa,
          roas: prevRoas,
        },
        changes: {
          spend: prevTotals.spend > 0 ? ((totals.spend - prevTotals.spend) / prevTotals.spend) * 100 : 0,
          impressions: prevTotals.impressions > 0 ? ((totals.impressions - prevTotals.impressions) / prevTotals.impressions) * 100 : 0,
          clicks: prevTotals.clicks > 0 ? ((totals.clicks - prevTotals.clicks) / prevTotals.clicks) * 100 : 0,
          conversions: prevTotals.conversions > 0 ? ((totals.conversions - prevTotals.conversions) / prevTotals.conversions) * 100 : 0,
          ctr: prevCtr > 0 ? ((avgCtr - prevCtr) / prevCtr) * 100 : 0,
          cpc: prevCpc > 0 ? ((avgCpc - prevCpc) / prevCpc) * 100 : 0,
          cpa: prevCpa > 0 ? ((avgCpa - prevCpa) / prevCpa) * 100 : 0,
          roas: prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : 0,
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
          ctr: avgCtr,
          cpc: avgCpc,
          cpa: avgCpa,
          roas: roas,
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
