import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { compareMetrics, metricsWithDefaults } from '@/lib/analytics/metrics-calculator';

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
            conversionValue: true,
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

    // 공통 모듈로 지표 계산 및 비교 (계정별 conversionValue 적용)
    const conversionValue = campaign.account.conversionValue ?? undefined;
    const comparison = compareMetrics(
      {
        spend: metrics._sum.spend || 0,
        impressions: metrics._sum.impressions || 0,
        clicks: metrics._sum.clicks || 0,
        conversions: metrics._sum.conversions || 0,
      },
      {
        spend: prevMetrics._sum.spend || 0,
        impressions: prevMetrics._sum.impressions || 0,
        clicks: prevMetrics._sum.clicks || 0,
        conversions: prevMetrics._sum.conversions || 0,
      },
      { conversionValue }
    );
    const currentMetrics = metricsWithDefaults(comparison.current);

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
          spend: currentMetrics.spend,
          impressions: currentMetrics.impressions,
          clicks: currentMetrics.clicks,
          conversions: currentMetrics.conversions,
          ctr: Number(currentMetrics.ctr.toFixed(2)),
          cvr: Number(currentMetrics.cvr.toFixed(2)),
          cpa: Math.round(currentMetrics.cpa),
          roas: Number(currentMetrics.roas.toFixed(2)),
          valueSource: comparison.current.valueSource,
        },
        changes: {
          spend: comparison.changes.spend !== null ? Number(comparison.changes.spend.toFixed(1)) : 0,
          impressions: comparison.changes.impressions !== null ? Number(comparison.changes.impressions.toFixed(1)) : 0,
          clicks: comparison.changes.clicks !== null ? Number(comparison.changes.clicks.toFixed(1)) : 0,
          conversions: comparison.changes.conversions !== null ? Number(comparison.changes.conversions.toFixed(1)) : 0,
          ctr: comparison.changes.ctr !== null ? Number(comparison.changes.ctr.toFixed(1)) : 0,
          cpa: comparison.changes.cpa !== null ? Number(comparison.changes.cpa.toFixed(1)) : 0,
          roas: comparison.changes.roas !== null ? Number(comparison.changes.roas.toFixed(1)) : 0,
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
