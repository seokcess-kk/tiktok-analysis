import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns/:campaignId
 * 캠페인 상세 정보 조회 (with KPI)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 캠페인 조회
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        accountId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
                industry: true,
              },
            },
          },
        },
        _count: {
          select: { adGroups: true },
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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 캠페인 성과 지표 조회
    const metrics = await prisma.performanceMetric.aggregate({
      where: {
        campaignId,
        level: 'CAMPAIGN',
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 이전 기간 메트릭 (비교용)
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const prevMetrics = await prisma.performanceMetric.aggregate({
      where: {
        campaignId,
        level: 'CAMPAIGN',
        date: { gte: prevStartDate, lte: prevEndDate },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 메트릭 계산
    const spend = metrics._sum.spend || 0;
    const impressions = metrics._sum.impressions || 0;
    const clicks = metrics._sum.clicks || 0;
    const conversions = metrics._sum.conversions || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? (conversions * 50000) / spend : 0;

    // 변화율 계산
    const prevSpend = prevMetrics._sum.spend || 0;
    const prevImpressions = prevMetrics._sum.impressions || 0;
    const prevClicks = prevMetrics._sum.clicks || 0;
    const prevConversions = prevMetrics._sum.conversions || 0;
    const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
    const prevCpa = prevConversions > 0 ? prevSpend / prevConversions : 0;
    const prevRoas = prevSpend > 0 ? (prevConversions * 50000) / prevSpend : 0;

    const changes = {
      spend: prevSpend > 0 ? ((spend - prevSpend) / prevSpend) * 100 : 0,
      impressions: prevImpressions > 0 ? ((impressions - prevImpressions) / prevImpressions) * 100 : 0,
      clicks: prevClicks > 0 ? ((clicks - prevClicks) / prevClicks) * 100 : 0,
      conversions: prevConversions > 0 ? ((conversions - prevConversions) / prevConversions) * 100 : 0,
      ctr: prevCtr > 0 ? ((ctr - prevCtr) / prevCtr) * 100 : 0,
      cpa: prevCpa > 0 ? ((cpa - prevCpa) / prevCpa) * 100 : 0,
      roas: prevRoas > 0 ? ((roas - prevRoas) / prevRoas) * 100 : 0,
    };

    // 최근 인사이트/전략 카운트
    const [insightCount, strategyCount] = await Promise.all([
      prisma.aIInsight.count({
        where: { accountId, campaignId },
      }),
      prisma.aIStrategy.count({
        where: { accountId, campaignId, status: 'PENDING' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          tiktokCampaignId: campaign.tiktokCampaignId,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          budget: campaign.budget,
          budgetMode: campaign.budgetMode,
          adGroupCount: campaign._count.adGroups,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
        account: campaign.account,
        metrics: {
          spend,
          impressions,
          clicks,
          conversions,
          ctr: Number(ctr.toFixed(2)),
          cvr: Number(cvr.toFixed(2)),
          cpa: Math.round(cpa),
          roas: Number(roas.toFixed(2)),
        },
        changes: {
          spend: Number(changes.spend.toFixed(1)),
          impressions: Number(changes.impressions.toFixed(1)),
          clicks: Number(changes.clicks.toFixed(1)),
          conversions: Number(changes.conversions.toFixed(1)),
          ctr: Number(changes.ctr.toFixed(1)),
          cpa: Number(changes.cpa.toFixed(1)),
          roas: Number(changes.roas.toFixed(1)),
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
        aiSummary: {
          insightCount,
          pendingStrategyCount: strategyCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch campaign',
        },
      },
      { status: 500 }
    );
  }
}
