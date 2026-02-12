import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { generateCompletion } from '@/lib/ai/client';
import { insightPrompts } from '@/lib/ai/prompts/insight';
import { InsightsResponseSchema } from '@/lib/ai/schemas/insight.schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    let type = 'DAILY_SUMMARY';
    try {
      const body = await request.json();
      type = body.type || 'DAILY_SUMMARY';
    } catch {
      // Body is empty or invalid, use default
    }

    // Get account with client info
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
      include: { client: true },
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

    // Get recent metrics
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        accountId: params.accountId,
        level: 'ACCOUNT',
        date: {
          gte: weekAgo,
          lte: today,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate metrics
    const currentMetrics = metrics[0] || {};
    const previousMetrics = metrics[1] || {};
    const trend = metrics.slice(0, 7);

    // Get top creatives
    const topCreatives = await prisma.creative.findMany({
      where: {
        metrics: {
          some: {
            accountId: params.accountId,
          },
        },
      },
      take: 5,
    });

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { accountId: params.accountId },
      take: 10,
    });

    // Generate insight using AI
    const prompt = insightPrompts.dailySummary;
    const result = await generateCompletion(
      prompt.system,
      prompt.user({
        accountName: account.name,
        industry: account.client.industry || 'Unknown',
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
        topCreatives: topCreatives.map((c) => ({
          name: c.tiktokCreativeId,
          metrics: {},
        })),
        campaigns: campaigns.map((c) => ({
          name: c.name,
          status: c.status,
          metrics: { budget: c.budget },
        })),
      }),
      InsightsResponseSchema
    );

    // Save insights to database
    const savedInsights = await Promise.all(
      result.insights.map((insight) =>
        prisma.aIInsight.create({
          data: {
            accountId: params.accountId,
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
      data: savedInsights,
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate insights',
        },
      },
      { status: 500 }
    );
  }
}
