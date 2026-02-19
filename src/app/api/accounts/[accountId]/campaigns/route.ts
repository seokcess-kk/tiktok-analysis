import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { computeAllMetrics, metricsWithDefaults } from '@/lib/analytics/metrics-calculator';

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

    // 캠페인별 소재 수 집계 (Campaign → AdGroup → Ad → Creative)
    const campaignIds = campaigns.map((c) => c.id);
    const creativeCountMap = new Map<string, number>();

    if (campaignIds.length > 0) {
      const creativeCounts = await prisma.$queryRaw<Array<{ campaignId: string; creativeCount: bigint }>>`
        SELECT
          ag."campaignId",
          COUNT(DISTINCT a."creativeId") as "creativeCount"
        FROM "Ad" a
        INNER JOIN "AdGroup" ag ON a."adGroupId" = ag.id
        WHERE ag."campaignId" IN (${Prisma.join(campaignIds)})
          AND a."creativeId" IS NOT NULL
        GROUP BY ag."campaignId"
      `;

      creativeCounts.forEach((row) => {
        creativeCountMap.set(row.campaignId, Number(row.creativeCount));
      });
    }

    // 캠페인 데이터 가공
    const campaignsWithMetrics = campaigns.map((campaign) => {
      const rawMetrics = metricsMap.get(campaign.id);
      const spend = rawMetrics?._sum.spend || 0;
      const impressions = rawMetrics?._sum.impressions || 0;
      const clicks = rawMetrics?._sum.clicks || 0;
      const conversions = rawMetrics?._sum.conversions || 0;

      // 공통 모듈로 지표 계산 (계정별 conversionValue 적용)
      const calculated = computeAllMetrics(
        { spend, impressions, clicks, conversions },
        { conversionValue: account.conversionValue ?? undefined }
      );
      const metrics = metricsWithDefaults(calculated);

      return {
        id: campaign.id,
        tiktokCampaignId: campaign.tiktokCampaignId,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        budget: campaign.budget,
        budgetMode: campaign.budgetMode,
        adGroupCount: campaign._count.adGroups,
        creativeCount: creativeCountMap.get(campaign.id) || 0,
        metrics: {
          spend: metrics.spend,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          conversions: metrics.conversions,
          ctr: Number(metrics.ctr.toFixed(2)),
          cvr: Number(metrics.cvr.toFixed(2)),
          cpa: Math.round(metrics.cpa),
          roas: Number(metrics.roas.toFixed(2)),
          valueSource: calculated.valueSource,
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
