import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/jobs/anomaly-detection
 *
 * 실시간 이상 징후 감지 Job
 * 메트릭 급변을 감지하고 CRITICAL 알림 생성
 *
 * 호출 주기: 1시간마다 또는 실시간
 */
export async function POST(request: NextRequest) {
  try {
    // Cron 인증 확인
    const cronSecret = request.headers.get('x-cron-secret') ||
                       request.headers.get('authorization')?.replace('Bearer ', '');

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // 임계값 설정
    const THRESHOLDS = {
      CPA_INCREASE: 30,    // CPA 30% 이상 증가 시 CRITICAL
      CTR_DECREASE: 25,    // CTR 25% 이상 감소 시 WARNING
      ROAS_DECREASE: 20,   // ROAS 20% 이상 감소 시 CRITICAL
      SPEND_INCREASE: 50,  // 지출 50% 이상 급증 시 WARNING
    };

    // 모든 활성 계정 조회
    const accounts = await prisma.account.findMany({
      where: { status: 'ACTIVE' },
    });

    const now = new Date();
    const today = new Date(now.toISOString().split('T')[0]);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const anomalies: Array<{
      accountId: string;
      accountName: string;
      type: string;
      severity: 'WARNING' | 'CRITICAL';
      metric: string;
      change: number;
      message: string;
    }> = [];

    for (const account of accounts) {
      // 최근 2일 메트릭 조회
      const [currentMetric, previousMetric] = await Promise.all([
        prisma.performanceMetric.findFirst({
          where: {
            accountId: account.id,
            level: 'ACCOUNT',
            date: {
              gte: yesterday,
              lt: today,
            },
          },
          orderBy: { date: 'desc' },
        }),
        prisma.performanceMetric.findFirst({
          where: {
            accountId: account.id,
            level: 'ACCOUNT',
            date: {
              gte: twoDaysAgo,
              lt: yesterday,
            },
          },
          orderBy: { date: 'desc' },
        }),
      ]);

      if (!currentMetric || !previousMetric) continue;

      // 변화율 계산
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const changes = {
        cpa: calculateChange(currentMetric.cpa || 0, previousMetric.cpa || 0),
        ctr: calculateChange(currentMetric.ctr || 0, previousMetric.ctr || 0),
        roas: calculateChange(currentMetric.roas || 0, previousMetric.roas || 0),
        spend: calculateChange(currentMetric.spend || 0, previousMetric.spend || 0),
      };

      // CPA 급등 감지
      if (changes.cpa > THRESHOLDS.CPA_INCREASE) {
        anomalies.push({
          accountId: account.id,
          accountName: account.name,
          type: 'CPA_SPIKE',
          severity: 'CRITICAL',
          metric: 'CPA',
          change: changes.cpa,
          message: `CPA가 ${changes.cpa.toFixed(1)}% 급등했습니다. 전환 추적 또는 랜딩페이지를 점검하세요.`,
        });
      }

      // CTR 급락 감지
      if (changes.ctr < -THRESHOLDS.CTR_DECREASE) {
        anomalies.push({
          accountId: account.id,
          accountName: account.name,
          type: 'CTR_DROP',
          severity: 'WARNING',
          metric: 'CTR',
          change: changes.ctr,
          message: `CTR이 ${Math.abs(changes.ctr).toFixed(1)}% 하락했습니다. 소재 피로도를 점검하세요.`,
        });
      }

      // ROAS 급락 감지
      if (changes.roas < -THRESHOLDS.ROAS_DECREASE) {
        anomalies.push({
          accountId: account.id,
          accountName: account.name,
          type: 'ROAS_DROP',
          severity: 'CRITICAL',
          metric: 'ROAS',
          change: changes.roas,
          message: `ROAS가 ${Math.abs(changes.roas).toFixed(1)}% 하락했습니다. 캠페인 효율성 점검이 필요합니다.`,
        });
      }

      // 지출 급증 감지
      if (changes.spend > THRESHOLDS.SPEND_INCREASE) {
        anomalies.push({
          accountId: account.id,
          accountName: account.name,
          type: 'SPEND_SPIKE',
          severity: 'WARNING',
          metric: 'Spend',
          change: changes.spend,
          message: `지출이 ${changes.spend.toFixed(1)}% 급증했습니다. 예산 설정을 확인하세요.`,
        });
      }
    }

    // 감지된 이상 징후 저장
    const savedAnomalies = await Promise.all(
      anomalies.map(async (anomaly) => {
        // 동일 이상 징후가 오늘 이미 생성되었는지 확인
        const existing = await prisma.aIInsight.findFirst({
          where: {
            accountId: anomaly.accountId,
            type: 'ANOMALY',
            title: { contains: anomaly.metric },
            generatedAt: {
              gte: today,
            },
          },
        });

        if (existing) {
          return null; // 중복 방지
        }

        // 인사이트 생성
        const insight = await prisma.aIInsight.create({
          data: {
            accountId: anomaly.accountId,
            type: 'ANOMALY',
            severity: anomaly.severity,
            title: `${anomaly.metric} 이상 감지 - ${anomaly.severity === 'CRITICAL' ? '즉시 확인 필요' : '주의 필요'}`,
            summary: anomaly.message,
            details: {
              metric: anomaly.metric,
              change: anomaly.change,
              threshold: THRESHOLDS[anomaly.type as keyof typeof THRESHOLDS],
              detectedAt: now.toISOString(),
            },
          },
        });

        // 알림 생성
        await prisma.notification.create({
          data: {
            userId: 'system',
            type: 'ANOMALY',
            title: insight.title,
            message: anomaly.message,
            priority: anomaly.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            link: `/accounts/${anomaly.accountId}/insights`,
            metadata: {
              accountId: anomaly.accountId,
              insightId: insight.id,
              anomalyType: anomaly.type,
            },
          },
        });

        return {
          insightId: insight.id,
          ...anomaly,
        };
      })
    );

    const createdAnomalies = savedAnomalies.filter((a) => a !== null);

    return NextResponse.json({
      success: true,
      message: `Anomaly detection completed`,
      data: {
        accountsChecked: accounts.length,
        anomaliesDetected: anomalies.length,
        anomaliesCreated: createdAnomalies.length,
        anomalies: createdAnomalies,
      },
    });
  } catch (error) {
    console.error('Anomaly detection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DETECTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/anomaly-detection
 *
 * Job 상태 확인
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trigger = searchParams.get('trigger');

  if (trigger === 'true') {
    return POST(request);
  }

  // 최근 이상 징후 통계
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayAnomalies, criticalCount, warningCount] = await Promise.all([
    prisma.aIInsight.count({
      where: {
        type: 'ANOMALY',
        generatedAt: { gte: today },
      },
    }),
    prisma.aIInsight.count({
      where: {
        type: 'ANOMALY',
        severity: 'CRITICAL',
        generatedAt: { gte: today },
      },
    }),
    prisma.aIInsight.count({
      where: {
        type: 'ANOMALY',
        severity: 'WARNING',
        generatedAt: { gte: today },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      status: 'ready',
      todayStats: {
        totalAnomalies: todayAnomalies,
        critical: criticalCount,
        warning: warningCount,
      },
      thresholds: {
        CPA_INCREASE: '30%',
        CTR_DECREASE: '25%',
        ROAS_DECREASE: '20%',
        SPEND_INCREASE: '50%',
      },
      triggerUrl: '/api/jobs/anomaly-detection?trigger=true',
    },
  });
}
