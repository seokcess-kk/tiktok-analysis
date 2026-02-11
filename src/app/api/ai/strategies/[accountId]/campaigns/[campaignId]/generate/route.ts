import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  generateBudgetStrategy,
  generateCreativeStrategy,
  generateComprehensiveStrategies,
  type StrategyContext,
} from '@/lib/ai/modules/strategy-advisor';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * POST /api/ai/strategies/:accountId/campaigns/:campaignId/generate
 * 캠페인별 AI 전략 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const body = await request.json();
    const { type, insightId, constraints } = body;

    // 캠페인 조회
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
      include: {
        account: {
          include: { client: true },
        },
        adGroups: {
          where: { status: 'ACTIVE' },
          take: 20,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        },
        { status: 404 }
      );
    }

    // 최근 메트릭 조회 (7일)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 캠페인 메트릭
    const campaignMetrics = await prisma.performanceMetric.aggregate({
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
      _avg: {
        ctr: true,
        cvr: true,
        cpa: true,
        roas: true,
      },
    });

    // 광고그룹별 메트릭
    const adGroupIds = campaign.adGroups.map((ag) => ag.id);
    const adGroupMetrics = await prisma.performanceMetric.groupBy({
      by: ['adGroupId'],
      where: {
        adGroupId: { in: adGroupIds },
        level: 'ADGROUP',
        date: { gte: startDate, lte: endDate },
      },
      _sum: {
        spend: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
      _avg: {
        ctr: true,
        cvr: true,
        cpa: true,
        roas: true,
      },
    });

    // 소재 및 메트릭 조회
    const creatives = await prisma.creative.findMany({
      where: {
        metrics: {
          some: {
            campaignId,
            date: { gte: startDate, lte: endDate },
          },
        },
      },
      include: {
        metrics: {
          where: {
            campaignId,
            date: { gte: startDate, lte: endDate },
            level: 'CREATIVE',
          },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      take: 30,
    });

    // 컨텍스트 구성
    const context: StrategyContext = {
      account: {
        id: campaign.account.id,
        name: campaign.account.name,
        industry: campaign.account.client.industry || 'Unknown',
      },
      campaigns: [
        {
          id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          budget: campaign.budget,
          budgetMode: campaign.budgetMode,
          status: campaign.status,
          metrics: {
            spend: campaignMetrics._sum.spend || 0,
            impressions: campaignMetrics._sum.impressions || 0,
            clicks: campaignMetrics._sum.clicks || 0,
            conversions: campaignMetrics._sum.conversions || 0,
            ctr: campaignMetrics._avg.ctr || 0,
            cvr: campaignMetrics._avg.cvr || 0,
            cpa: campaignMetrics._avg.cpa || 0,
            roas: campaignMetrics._avg.roas || 0,
          },
        },
        // 광고그룹을 하위 캠페인처럼 처리
        ...campaign.adGroups.map((ag) => {
          const metrics = adGroupMetrics.find((m) => m.adGroupId === ag.id);
          return {
            id: ag.id,
            name: `[AdGroup] ${ag.name}`,
            objective: campaign.objective,
            budget: ag.bidAmount || 0,
            budgetMode: ag.bidStrategy,
            status: ag.status,
            metrics: {
              spend: metrics?._sum.spend || 0,
              impressions: metrics?._sum.impressions || 0,
              clicks: metrics?._sum.clicks || 0,
              conversions: metrics?._sum.conversions || 0,
              ctr: metrics?._avg.ctr || 0,
              cvr: metrics?._avg.cvr || 0,
              cpa: metrics?._avg.cpa || 0,
              roas: metrics?._avg.roas || 0,
            },
          };
        }),
      ],
      creatives: creatives.map((c) => {
        const aggregated = c.metrics.reduce(
          (acc, m) => ({
            spend: acc.spend + m.spend,
            impressions: acc.impressions + m.impressions,
            clicks: acc.clicks + m.clicks,
            conversions: acc.conversions + m.conversions,
          }),
          { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
        );

        return {
          id: c.id,
          name: c.tiktokCreativeId,
          type: c.type,
          tags: (c.tags as string[]) || [],
          metrics: {
            spend: aggregated.spend,
            impressions: aggregated.impressions,
            clicks: aggregated.clicks,
            conversions: aggregated.conversions,
            ctr:
              aggregated.impressions > 0
                ? (aggregated.clicks / aggregated.impressions) * 100
                : 0,
            cvr:
              aggregated.clicks > 0
                ? (aggregated.conversions / aggregated.clicks) * 100
                : 0,
            cpa:
              aggregated.conversions > 0
                ? aggregated.spend / aggregated.conversions
                : 0,
          },
          fatigue: c.fatigue[0]
            ? {
                index: c.fatigue[0].fatigueIndex,
                trend: c.fatigue[0].performanceTrend,
              }
            : undefined,
        };
      }),
      constraints,
    };

    // 전략 생성
    let strategies;
    if (type === 'BUDGET') {
      strategies = await generateBudgetStrategy(context);
    } else if (type === 'CREATIVE') {
      strategies = await generateCreativeStrategy(context);
    } else {
      const result = await generateComprehensiveStrategies(context);
      strategies = result.all;
    }

    // DB에 저장
    const savedStrategies = await Promise.all(
      strategies.map((strategy) =>
        prisma.aIStrategy.create({
          data: {
            accountId,
            campaignId,
            insightId: insightId || null,
            type: strategy.type,
            priority: strategy.priority,
            title: strategy.title,
            description: strategy.description,
            actionItems: strategy.actionItems,
            expectedImpact: strategy.expectedImpact,
            difficulty: strategy.difficulty,
            status: 'PENDING',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
        },
        strategies: savedStrategies.map((s) => ({
          id: s.id,
          type: s.type,
          priority: s.priority,
          title: s.title,
          description: s.description,
          actionItems: s.actionItems,
          expectedImpact: s.expectedImpact,
          difficulty: s.difficulty,
          status: s.status,
          createdAt: s.createdAt,
        })),
        summary: {
          total: savedStrategies.length,
          byPriority: {
            HIGH: savedStrategies.filter((s) => s.priority === 'HIGH').length,
            MEDIUM: savedStrategies.filter((s) => s.priority === 'MEDIUM').length,
            LOW: savedStrategies.filter((s) => s.priority === 'LOW').length,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error generating campaign strategies:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate campaign strategies',
        },
      },
      { status: 500 }
    );
  }
}
