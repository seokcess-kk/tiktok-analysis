import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  generateCreativeStrategies,
  generateFallbackStrategies,
  type CreativeStrategyContext,
} from '@/lib/ai/modules/creative-strategy-advisor';
import type { CreativeAnalysisContext } from '@/lib/ai/modules/creative-insight-generator';
import type { CreativeInsight } from '@/lib/ai/schemas/creative-insight.schema';

interface RouteParams {
  params: Promise<{
    accountId: string;
    creativeId: string;
  }>;
}

/**
 * GET /api/creatives/{accountId}/{creativeId}/strategies
 * 소재별 전략 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, creativeId } = await params;

    const strategies = await prisma.aIStrategy.findMany({
      where: {
        accountId,
        creativeId,
        type: 'CREATIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        creativeId,
        strategies: strategies.map(strategy => ({
          id: strategy.id,
          type: (strategy.actionItems as Record<string, unknown>[])?.[0]?.strategyType || 'OPTIMIZE',
          priority: strategy.priority,
          title: strategy.title,
          description: strategy.description,
          actionItems: strategy.actionItems,
          estimatedImpact: strategy.expectedImpact,
          status: strategy.status,
          createdAt: strategy.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Creative strategies fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch creative strategies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creatives/{accountId}/{creativeId}/strategies
 * 소재별 전략 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, creativeId } = await params;
    const body = await request.json().catch(() => ({}));
    const insightIds = body.insightIds as string[] | undefined;

    // 소재 정보 조회
    const creative = await prisma.creative.findUnique({
      where: { id: creativeId },
      include: {
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        metrics: {
          where: { level: 'CREATIVE' },
          orderBy: { date: 'desc' },
          take: 14,
        },
      },
    });

    if (!creative) {
      return NextResponse.json(
        { success: false, error: 'Creative not found' },
        { status: 404 }
      );
    }

    // 관련 인사이트 조회
    const insightsQuery = insightIds?.length
      ? { id: { in: insightIds } }
      : {
          accountId,
          creativeId,
          type: 'CREATIVE' as const,
          generatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        };

    const dbInsights = await prisma.aIInsight.findMany({
      where: insightsQuery,
      orderBy: { generatedAt: 'desc' },
      take: 5,
    });

    // 인사이트가 없으면 먼저 생성하라고 안내
    if (dbInsights.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No insights found. Generate insights first using POST /insights',
        hint: 'Call POST /api/creatives/{accountId}/{creativeId}/insights first',
      }, { status: 400 });
    }

    // 기존 전략 조회 (중복 방지)
    const existingStrategies = await prisma.aIStrategy.findMany({
      where: {
        accountId,
        creativeId,
        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
      },
      select: { type: true, title: true },
    });

    // 계정 벤치마크
    const accountMetrics = await prisma.performanceMetric.aggregate({
      where: {
        accountId,
        level: 'CREATIVE',
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _avg: { ctr: true, cvr: true, cpa: true, roas: true },
    });

    // 현재 메트릭
    const currentMetrics = creative.metrics.slice(0, 7).reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        ctr: 0,
        cvr: 0,
        cpc: 0,
        cpm: 0,
        cpa: 0,
        roas: 0,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, cpc: 0, cpm: 0, cpa: 0, roas: 0 }
    );

    const metricsCount = Math.min(creative.metrics.length, 7);
    if (metricsCount > 0) {
      currentMetrics.ctr = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.ctr || 0), 0) / metricsCount;
      currentMetrics.cvr = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.cvr || 0), 0) / metricsCount;
      currentMetrics.cpa = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.cpa || 0), 0) / metricsCount;
      currentMetrics.roas = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.roas || 0), 0) / metricsCount;
    }

    const daysActive = Math.floor(
      (Date.now() - new Date(creative.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    // 인사이트를 CreativeInsight 형식으로 변환
    const insights: CreativeInsight[] = dbInsights.map(insight => {
      const details = insight.details as Record<string, unknown>;
      return {
        type: (details.insightType as CreativeInsight['type']) || 'PERFORMANCE',
        severity: insight.severity as CreativeInsight['severity'],
        title: insight.title,
        summary: insight.summary,
        details: {
          metrics: details.metrics as CreativeInsight['details']['metrics'],
          trends: details.trends as CreativeInsight['details']['trends'],
          comparison: details.comparison as CreativeInsight['details']['comparison'],
        },
        recommendations: (details.recommendations as string[]) || [],
      };
    });

    // 컨텍스트 구성
    const creativeContext: CreativeAnalysisContext = {
      creative: {
        id: creative.id,
        name: creative.tiktokCreativeId,
        type: creative.type,
        duration: creative.duration || undefined,
        tags: (creative.tags as string[]) || [],
        daysActive,
      },
      metrics: {
        current: currentMetrics,
        trend: creative.metrics.map(m => ({
          date: m.date.toISOString().split('T')[0],
          impressions: m.impressions,
          ctr: m.ctr || 0,
          cvr: m.cvr || 0,
          cpa: m.cpa || 0,
        })),
      },
      fatigue: {
        index: creative.fatigue[0]?.fatigueIndex || 0,
        trend: (creative.fatigue[0]?.performanceTrend as 'RISING' | 'STABLE' | 'DECLINING' | 'EXHAUSTED') || 'STABLE',
        estimatedExhaustion: null,
        daysFromPeak: creative.fatigue[0]?.daysActive || null,
      },
      accountBenchmark: {
        avgCtr: accountMetrics._avg.ctr || 1.0,
        avgCvr: accountMetrics._avg.cvr || 2.0,
        avgCpa: accountMetrics._avg.cpa || 5000,
        avgRoas: accountMetrics._avg.roas || 2.0,
        topPerformerCtr: 2.0,
        topPerformerRoas: 3.0,
      },
    };

    const context: CreativeStrategyContext = {
      creative: creativeContext,
      insights,
      existingStrategies: existingStrategies.map(s => ({
        type: s.type,
        title: s.title,
      })),
    };

    // 전략 생성
    let strategies;
    try {
      strategies = await generateCreativeStrategies(context);
    } catch (aiError) {
      console.error('AI strategy generation failed, using fallback:', aiError);
      strategies = generateFallbackStrategies(context);
    }

    // DB에 저장
    const savedStrategies = await Promise.all(
      strategies.map(strategy =>
        prisma.aIStrategy.create({
          data: {
            accountId,
            creativeId,
            type: 'CREATIVE',
            priority: strategy.priority as 'HIGH' | 'MEDIUM' | 'LOW',
            title: strategy.title,
            description: strategy.description,
            actionItems: strategy.actionItems.map(item => ({
              ...item,
              strategyType: strategy.type,
            })),
            expectedImpact: strategy.estimatedImpact,
            difficulty: 'MEDIUM',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        creativeId,
        strategies: savedStrategies.map((saved, i) => ({
          id: saved.id,
          ...strategies[i],
          status: saved.status,
          createdAt: saved.createdAt,
        })),
        basedOnInsights: dbInsights.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Creative strategy generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate creative strategies' },
      { status: 500 }
    );
  }
}
