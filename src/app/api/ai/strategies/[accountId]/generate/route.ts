import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import {
  generateBudgetStrategy,
  generateCreativeStrategy,
  generateComprehensiveStrategies,
  type StrategyContext,
} from '@/lib/ai/modules/strategy-advisor';
import {
  validateRequest,
  validationErrorResponse,
  aiRateLimiter,
  rateLimitExceededResponse,
} from '@/lib/api';

// 전략 생성 요청 스키마
const GenerateStrategyRequestSchema = z.object({
  type: z.enum(['BUDGET', 'CAMPAIGN', 'TARGETING', 'CREATIVE', 'BIDDING']).optional(),
  insightId: z.string().optional(),
  constraints: z.record(z.unknown()).optional(),
});

interface RouteParams {
  params: { accountId: string };
}

/**
 * POST /api/ai/strategies/:accountId/generate
 * AI 전략 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;

    // 1. Rate Limiting 체크
    const identifier = `ai-strategy:${accountId}`;
    const rateLimitResult = await aiRateLimiter(request, identifier);
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // 2. 입력 검증
    const validation = await validateRequest(request, GenerateStrategyRequestSchema);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const { type, insightId, constraints } = validation.data!;

    // 계정 조회
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        client: true,
        campaigns: {
          where: { status: 'ACTIVE' },
          take: 20,
        },
      },
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

    // 최근 메트릭 조회 (7일)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const campaignMetrics = await prisma.performanceMetric.groupBy({
      by: ['campaignId'],
      where: {
        accountId,
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

    // 소재 및 메트릭 조회
    const creatives = await prisma.creative.findMany({
      where: {
        metrics: {
          some: {
            accountId,
            date: { gte: startDate, lte: endDate },
          },
        },
      },
      include: {
        metrics: {
          where: {
            accountId,
            date: { gte: startDate, lte: endDate },
            level: 'CREATIVE',
          },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      take: 50,
    });

    // 컨텍스트 구성
    const context: StrategyContext = {
      account: {
        id: account.id,
        name: account.name,
        industry: account.client.industry || 'Unknown',
      },
      campaigns: account.campaigns.map((c) => {
        const metrics = campaignMetrics.find((m) => m.campaignId === c.id);
        return {
          id: c.id,
          name: c.name,
          objective: c.objective,
          budget: c.budget,
          budgetMode: c.budgetMode,
          status: c.status,
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
      // 종합 전략
      const result = await generateComprehensiveStrategies(context);
      strategies = result.all;
    }

    // DB에 저장
    const savedStrategies = await Promise.all(
      strategies.map((strategy) =>
        prisma.aIStrategy.create({
          data: {
            accountId,
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
    console.error('Error generating strategies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to generate strategies: ${errorMessage}`,
        },
      },
      { status: 500 }
    );
  }
}
