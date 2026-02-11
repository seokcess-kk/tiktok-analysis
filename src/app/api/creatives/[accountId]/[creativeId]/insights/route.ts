import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  generateCreativeInsights,
  generateFallbackInsights,
  type CreativeAnalysisContext,
} from '@/lib/ai/modules/creative-insight-generator';

interface RouteParams {
  params: Promise<{
    accountId: string;
    creativeId: string;
  }>;
}

/**
 * GET /api/creatives/{accountId}/{creativeId}/insights
 * 소재별 인사이트 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, creativeId } = await params;

    // 기존 인사이트 조회
    const insights = await prisma.aIInsight.findMany({
      where: {
        accountId,
        creativeId,
        type: 'CREATIVE',
      },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        creativeId,
        insights: insights.map(insight => ({
          id: insight.id,
          type: (insight.details as Record<string, unknown>)?.insightType || 'PERFORMANCE',
          severity: insight.severity,
          title: insight.title,
          summary: insight.summary,
          details: insight.details,
          recommendations: ((insight.details as Record<string, unknown>)?.recommendations || []) as string[],
          generatedAt: insight.generatedAt,
          isRead: insight.isRead,
        })),
      },
    });
  } catch (error) {
    console.error('Creative insights fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch creative insights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creatives/{accountId}/{creativeId}/insights
 * 소재별 인사이트 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, creativeId } = await params;
    const body = await request.json().catch(() => ({}));
    const forceRegenerate = body.forceRegenerate || false;

    // 최근 인사이트가 있고 재생성 요청이 아니면 기존 것 반환
    if (!forceRegenerate) {
      const recentInsight = await prisma.aIInsight.findFirst({
        where: {
          accountId,
          creativeId,
          type: 'CREATIVE',
          generatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24시간 이내
        },
      });

      if (recentInsight) {
        return NextResponse.json({
          success: true,
          message: 'Recent insights exist. Use forceRegenerate: true to generate new ones.',
          data: { creativeId, cached: true },
        });
      }
    }

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

    // 계정 벤치마크 계산
    const accountMetrics = await prisma.performanceMetric.aggregate({
      where: {
        accountId,
        level: 'CREATIVE',
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _avg: { ctr: true, cvr: true, cpa: true, roas: true },
    });

    const topCreative = await prisma.performanceMetric.findFirst({
      where: {
        accountId,
        level: 'CREATIVE',
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { ctr: 'desc' },
    });

    const topRoasCreative = await prisma.performanceMetric.findFirst({
      where: {
        accountId,
        level: 'CREATIVE',
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { roas: 'desc' },
    });

    // 현재 메트릭 계산
    const currentMetrics = creative.metrics.slice(0, 7).reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        ctr: m.ctr || 0,
        cvr: m.cvr || 0,
        cpc: m.cpc || 0,
        cpm: m.cpm || 0,
        cpa: m.cpa || 0,
        roas: m.roas || 0,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, cpc: 0, cpm: 0, cpa: 0, roas: 0 }
    );

    // 평균 계산
    const metricsCount = Math.min(creative.metrics.length, 7);
    if (metricsCount > 0) {
      currentMetrics.ctr = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.ctr || 0), 0) / metricsCount;
      currentMetrics.cvr = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.cvr || 0), 0) / metricsCount;
      currentMetrics.cpa = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.cpa || 0), 0) / metricsCount;
      currentMetrics.roas = creative.metrics.slice(0, metricsCount).reduce((sum, m) => sum + (m.roas || 0), 0) / metricsCount;
    }

    // 활성 기간 계산
    const daysActive = Math.floor(
      (Date.now() - new Date(creative.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    // 컨텍스트 구성
    const context: CreativeAnalysisContext = {
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
        topPerformerCtr: topCreative?.ctr || 2.0,
        topPerformerRoas: topRoasCreative?.roas || 3.0,
      },
    };

    // 인사이트 생성
    let insights;
    try {
      insights = await generateCreativeInsights(context);
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      insights = generateFallbackInsights(context);
    }

    // DB에 저장
    const savedInsights = await Promise.all(
      insights.map(insight =>
        prisma.aIInsight.create({
          data: {
            accountId,
            creativeId,
            type: 'CREATIVE',
            severity: insight.severity as 'INFO' | 'WARNING' | 'CRITICAL',
            title: insight.title,
            summary: insight.summary,
            details: {
              insightType: insight.type,
              ...insight.details,
              recommendations: insight.recommendations,
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        creativeId,
        insights: savedInsights.map((saved, i) => ({
          id: saved.id,
          ...insights[i],
          generatedAt: saved.generatedAt,
        })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Creative insight generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate creative insights' },
      { status: 500 }
    );
  }
}
