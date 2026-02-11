import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { generateCompletion } from '@/lib/ai/client';
import { insightPrompts } from '@/lib/ai/prompts/insight';
import { InsightsResponseSchema } from '@/lib/ai/schemas/insight.schema';
import {
  generateFallbackInsights,
  generateFallbackStrategies,
  isOpenAIAvailable,
  type MetricData,
} from '@/lib/ai/fallback';

/**
 * POST /api/jobs/daily-insights
 *
 * 매일 자동으로 모든 활성 계정에 대해 인사이트와 전략을 생성합니다.
 * Vercel Cron 또는 외부 스케줄러에서 호출됩니다.
 *
 * 인증: CRON_SECRET 헤더 또는 Authorization Bearer 토큰
 */
export async function POST(request: NextRequest) {
  try {
    // Cron 인증 확인 (선택적)
    const cronSecret = request.headers.get('x-cron-secret') ||
                       request.headers.get('authorization')?.replace('Bearer ', '');

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      // 개발 환경에서는 인증 생략 가능
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // 모든 활성 계정 조회
    const accounts = await prisma.account.findMany({
      where: { status: 'ACTIVE' },
      include: { client: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active accounts found',
        data: { processed: 0 },
      });
    }

    const results: Array<{
      accountId: string;
      accountName: string;
      insightsCreated: number;
      strategiesCreated: number;
      error?: string;
    }> = [];

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    for (const account of accounts) {
      try {
        // 최근 메트릭 조회 (어제와 그저께)
        const [currentMetric, previousMetric] = await Promise.all([
          prisma.performanceMetric.findFirst({
            where: {
              accountId: account.id,
              level: 'ACCOUNT',
              date: {
                gte: new Date(yesterday.toISOString().split('T')[0]),
                lt: new Date(today.toISOString().split('T')[0]),
              },
            },
            orderBy: { date: 'desc' },
          }),
          prisma.performanceMetric.findFirst({
            where: {
              accountId: account.id,
              level: 'ACCOUNT',
              date: {
                gte: new Date(twoDaysAgo.toISOString().split('T')[0]),
                lt: new Date(yesterday.toISOString().split('T')[0]),
              },
            },
            orderBy: { date: 'desc' },
          }),
        ]);

        // 메트릭 데이터 변환
        const currentMetrics: MetricData = {
          date: currentMetric?.date.toISOString() || today.toISOString(),
          spend: currentMetric?.spend || 0,
          impressions: currentMetric?.impressions || 0,
          clicks: currentMetric?.clicks || 0,
          conversions: currentMetric?.conversions || 0,
          ctr: currentMetric?.ctr || 0,
          cpa: currentMetric?.cpa || 0,
          roas: currentMetric?.roas || 0,
        };

        const previousMetrics: MetricData = {
          date: previousMetric?.date.toISOString() || yesterday.toISOString(),
          spend: previousMetric?.spend || 0,
          impressions: previousMetric?.impressions || 0,
          clicks: previousMetric?.clicks || 0,
          conversions: previousMetric?.conversions || 0,
          ctr: previousMetric?.ctr || 0,
          cpa: previousMetric?.cpa || 0,
          roas: previousMetric?.roas || 0,
        };

        let insights: Array<{
          type: string;
          severity: string;
          title: string;
          summary: string;
          keyFindings?: unknown[];
          recommendations?: string[];
        }> = [];

        let strategies: Array<{
          type: string;
          priority: string;
          title: string;
          description: string;
          expectedImpact?: { metric: string; changePercent: number };
        }> = [];

        // OpenAI 사용 가능하면 AI 생성, 아니면 Fallback
        if (isOpenAIAvailable()) {
          try {
            // AI로 인사이트 생성
            const prompt = insightPrompts.dailySummary;
            const aiResult = await generateCompletion(
              prompt.system,
              prompt.user({
                accountName: account.name,
                industry: account.client.industry || 'Unknown',
                currentMetrics: {
                  spend: currentMetrics.spend,
                  impressions: currentMetrics.impressions,
                  clicks: currentMetrics.clicks,
                  conversions: currentMetrics.conversions,
                  ctr: currentMetrics.ctr,
                  cpa: currentMetrics.cpa,
                  roas: currentMetrics.roas,
                },
                previousMetrics: {
                  spend: previousMetrics.spend,
                  impressions: previousMetrics.impressions,
                  clicks: previousMetrics.clicks,
                  conversions: previousMetrics.conversions,
                  ctr: previousMetrics.ctr,
                  cpa: previousMetrics.cpa,
                  roas: previousMetrics.roas,
                },
                trend: [],
                topCreatives: [],
                campaigns: [],
              }),
              InsightsResponseSchema
            );
            insights = aiResult.insights;
          } catch (aiError) {
            console.error(`AI generation failed for ${account.name}, using fallback:`, aiError);
            // AI 실패 시 Fallback 사용
            const fallbackInsights = generateFallbackInsights(currentMetrics, previousMetrics, account.name);
            insights = fallbackInsights;
          }
        } else {
          // Fallback 모드
          const fallbackInsights = generateFallbackInsights(currentMetrics, previousMetrics, account.name);
          const fallbackStrategies = generateFallbackStrategies(currentMetrics, previousMetrics);
          insights = fallbackInsights;
          strategies = fallbackStrategies;
        }

        // 인사이트 저장
        const savedInsights = await Promise.all(
          insights.map((insight) =>
            prisma.aIInsight.create({
              data: {
                accountId: account.id,
                type: insight.type as 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION',
                severity: insight.severity as 'INFO' | 'WARNING' | 'CRITICAL',
                title: insight.title,
                summary: insight.summary,
                details: {
                  keyFindings: insight.keyFindings || [],
                  recommendations: insight.recommendations || [],
                },
              },
            })
          )
        );

        // 전략 저장 (Fallback에서 생성된 경우)
        const savedStrategies = await Promise.all(
          strategies.map((strategy) =>
            prisma.aIStrategy.create({
              data: {
                accountId: account.id,
                type: strategy.type as 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING',
                priority: strategy.priority as 'HIGH' | 'MEDIUM' | 'LOW',
                title: strategy.title,
                description: strategy.description,
                expectedImpact: strategy.expectedImpact,
              },
            })
          )
        );

        // CRITICAL 인사이트에 대한 알림 생성
        const criticalInsights = savedInsights.filter((i) => i.severity === 'CRITICAL');
        if (criticalInsights.length > 0) {
          await Promise.all(
            criticalInsights.map((insight) =>
              prisma.notification.create({
                data: {
                  userId: 'system', // 시스템 알림
                  type: 'ANOMALY',
                  title: insight.title,
                  message: insight.summary,
                  link: `/accounts/${account.id}/insights`,
                  metadata: { accountId: account.id, insightId: insight.id },
                },
              })
            )
          );
        }

        results.push({
          accountId: account.id,
          accountName: account.name,
          insightsCreated: savedInsights.length,
          strategiesCreated: savedStrategies.length,
        });
      } catch (accountError) {
        console.error(`Error processing account ${account.name}:`, accountError);
        results.push({
          accountId: account.id,
          accountName: account.name,
          insightsCreated: 0,
          strategiesCreated: 0,
          error: accountError instanceof Error ? accountError.message : 'Unknown error',
        });
      }
    }

    const totalInsights = results.reduce((sum, r) => sum + r.insightsCreated, 0);
    const totalStrategies = results.reduce((sum, r) => sum + r.strategiesCreated, 0);
    const failedAccounts = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: true,
      message: `Daily insights generation completed`,
      data: {
        processed: accounts.length,
        totalInsights,
        totalStrategies,
        failedAccounts,
        results,
        usedAI: isOpenAIAvailable(),
      },
    });
  } catch (error) {
    console.error('Daily insights job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOB_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/daily-insights
 *
 * Job 상태 확인 및 수동 실행 트리거
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trigger = searchParams.get('trigger');

  if (trigger === 'true') {
    // 수동 실행
    return POST(request);
  }

  // 상태 확인
  const lastInsight = await prisma.aIInsight.findFirst({
    orderBy: { generatedAt: 'desc' },
    select: { generatedAt: true, accountId: true },
  });

  const totalInsights = await prisma.aIInsight.count();
  const totalStrategies = await prisma.aIStrategy.count();

  return NextResponse.json({
    success: true,
    data: {
      status: 'ready',
      lastRun: lastInsight?.generatedAt || null,
      stats: {
        totalInsights,
        totalStrategies,
      },
      openAIAvailable: isOpenAIAvailable(),
      triggerUrl: '/api/jobs/daily-insights?trigger=true',
    },
  });
}
