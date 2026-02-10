import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/accounts/:accountId/campaigns
 * 캠페인 목록 조회 (with metrics)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'spend';
    const order = searchParams.get('order') || 'desc';
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    // 캠페인 조회 조건
    const where: Record<string, unknown> = { accountId };
    if (status && status !== 'all') {
      where.status = status;
    }

    // 캠페인 목록 조회
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        _count: {
          select: { adGroups: true },
        },
      },
      take: limit,
      skip: offset,
    });

    // 각 캠페인의 성과 지표 조회
    const campaignMetrics = await prisma.performanceMetric.groupBy({
      by: ['campaignId'],
      where: {
        accountId,
        campaignId: { in: campaigns.map((c) => c.id) },
        date: { gte: startDate, lte: endDate },
        level: 'CAMPAIGN',
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    // 메트릭 맵 생성
    const metricsMap = new Map<string, typeof campaignMetrics[0]>();
    campaignMetrics.forEach((m) => {
      if (m.campaignId) {
        metricsMap.set(m.campaignId, m);
      }
    });

    // 캠페인 데이터 가공
    const campaignsWithMetrics = campaigns.map((campaign) => {
      const metrics = metricsMap.get(campaign.id);
      const spend = metrics?._sum.spend || 0;
      const impressions = metrics?._sum.impressions || 0;
      const clicks = metrics?._sum.clicks || 0;
      const conversions = metrics?._sum.conversions || 0;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;
      const roas = spend > 0 ? (conversions * 50000) / spend : 0;

      return {
        id: campaign.id,
        tiktokCampaignId: campaign.tiktokCampaignId,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        budget: campaign.budget,
        adGroupCount: campaign._count.adGroups,
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
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      };
    });

    // 정렬
    campaignsWithMetrics.sort((a, b) => {
      let comparison = 0;
      switch (sort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'spend':
          comparison = a.metrics.spend - b.metrics.spend;
          break;
        case 'roas':
          comparison = a.metrics.roas - b.metrics.roas;
          break;
        case 'ctr':
          comparison = a.metrics.ctr - b.metrics.ctr;
          break;
        case 'cpa':
          comparison = a.metrics.cpa - b.metrics.cpa;
          break;
        case 'conversions':
          comparison = a.metrics.conversions - b.metrics.conversions;
          break;
        default:
          comparison = a.metrics.spend - b.metrics.spend;
      }
      return order === 'desc' ? -comparison : comparison;
    });

    // 총 개수
    const total = await prisma.campaign.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignsWithMetrics,
        pagination: {
          total,
          limit,
          offset,
        },
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch campaigns',
        },
      },
      { status: 500 }
    );
  }
}
