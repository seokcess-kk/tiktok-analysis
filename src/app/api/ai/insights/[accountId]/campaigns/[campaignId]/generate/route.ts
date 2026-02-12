import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { generateCompletion } from '@/lib/ai/client';
import { insightPrompts } from '@/lib/ai/prompts/insight';
import { InsightsResponseSchema } from '@/lib/ai/schemas/insight.schema';

interface RouteParams {
  params: { accountId: string; campaignId: string };
}

/**
 * POST /api/ai/insights/:accountId/campaigns/:campaignId/generate
 * 캠페인별 인사이트 생성
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, campaignId } = params;
    const body = await request.json();
    const { type = 'DAILY_SUMMARY' } = body;

    // 캠페인 조회
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, accountId },
      include: {
        account: {
          include: { client: true },
        },
        adGroups: {
          where: { status: 'ACTIVE' },
          take: 10,
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
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        campaignId,
        level: 'CAMPAIGN',
        date: {
          gte: weekAgo,
          lte: today,
        },
      },
      orderBy: { date: 'desc' },
    });

    // 현재/이전 메트릭 집계
    const currentMetrics = metrics[0] || {};
    const previousMetrics = metrics[1] || {};
    const trend = metrics.slice(0, 7);

    // 광고그룹별 메트릭
    const adGroupIds = campaign.adGroups.map((ag) => ag.id);
    const [adGroupMetrics, creatives] = await Promise.all([
      prisma.performanceMetric.groupBy({
        by: ['adGroupId'],
        where: {
          adGroupId: { in: adGroupIds },
          level: 'ADGROUP',
          date: { gte: weekAgo, lte: today },
        },
        _sum: {
          spend: true,
          impressions: true,
          clicks: true,
          conversions: true,
        },
      }),
      // 캠페인 크리에이티브 조회
      prisma.creative.findMany({
        where: {
          ads: {
            some: {
              adGroup: { campaignId },
            },
          },
        },
        include: {
          metrics: {
            where: { date: { gte: weekAgo, lte: today } },
          },
          fatigue: true,
        },
        take: 10,
      }),
    ]);

    // 상위 크리에이티브 데이터 변환 (전환 기준 정렬)
    const topCreatives = creatives
      .map((c) => {
        const totalSpend = c.metrics.reduce((sum, m) => sum + m.spend, 0);
        const totalConversions = c.metrics.reduce((sum, m) => sum + m.conversions, 0);
        const totalClicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
        const totalImpressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
        const latestFatigue = c.fatigue[0];
        return {
          name: c.tiktokCreativeId,
          metrics: {
            spend: totalSpend,
            conversions: totalConversions,
            clicks: totalClicks,
            impressions: totalImpressions,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            fatigueIndex: latestFatigue?.fatigueIndex || 0,
          },
        };
      })
      .filter((c) => c.metrics.spend > 0)
      .sort((a, b) => (b.metrics.conversions as number) - (a.metrics.conversions as number))
      .slice(0, 5);

    // AI 인사이트 생성
    const prompt = insightPrompts.dailySummary;
    const result = await generateCompletion(
      prompt.system,
      prompt.user({
        accountName: `${campaign.account.name} - ${campaign.name}`,
        industry: campaign.account.client.industry || 'Unknown',
        currentMetrics: {
          spend: currentMetrics.spend || 0,
          impressions: currentMetrics.impressions || 0,
          clicks: currentMetrics.clicks || 0,
          conversions: currentMetrics.conversions || 0,
          ctr: currentMetrics.ctr || 0,
          cpa: currentMetrics.cpa || 0,
          roas: currentMetrics.roas || 0,
        },
        previousMetrics: {
          spend: previousMetrics.spend || 0,
          impressions: previousMetrics.impressions || 0,
          clicks: previousMetrics.clicks || 0,
          conversions: previousMetrics.conversions || 0,
          ctr: previousMetrics.ctr || 0,
          cpa: previousMetrics.cpa || 0,
          roas: previousMetrics.roas || 0,
        },
        trend: trend.map((t) => ({
          date: t.date.toISOString(),
          spend: t.spend,
          ctr: t.ctr || 0,
          cpa: t.cpa || 0,
        })),
        topCreatives: topCreatives,
        campaigns: campaign.adGroups.map((ag) => {
          const agMetrics = adGroupMetrics.find((m) => m.adGroupId === ag.id);
          return {
            name: ag.name,
            status: ag.status,
            metrics: {
              spend: agMetrics?._sum.spend || 0,
              impressions: agMetrics?._sum.impressions || 0,
              clicks: agMetrics?._sum.clicks || 0,
              conversions: agMetrics?._sum.conversions || 0,
            },
          };
        }),
      }),
      InsightsResponseSchema
    );

    // 인사이트 저장
    const savedInsights = await Promise.all(
      result.insights.map((insight) =>
        prisma.aIInsight.create({
          data: {
            accountId,
            campaignId,
            type: insight.type,
            severity: insight.severity,
            title: insight.title,
            summary: insight.summary,
            details: {
              keyFindings: insight.keyFindings,
              rootCause: insight.rootCause,
              recommendations: insight.recommendations,
            },
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
        insights: savedInsights,
      },
    });
  } catch (error) {
    console.error('Error generating campaign insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate campaign insights',
        },
      },
      { status: 500 }
    );
  }
}
