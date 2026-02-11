import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/seed/insights
 *
 * 테스트/시연용 샘플 인사이트 및 전략 데이터 생성
 * 개발 환경에서만 사용
 */
export async function POST(request: NextRequest) {
  // 프로덕션 환경에서는 사용 불가
  if (process.env.NODE_ENV === 'production') {
    const forceHeader = request.headers.get('x-force-seed');
    if (forceHeader !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Seed API is disabled in production' },
        { status: 403 }
      );
    }
  }

  try {
    // 첫 번째 활성 계정 조회
    const account = await prisma.account.findFirst({
      where: { status: 'ACTIVE' },
      include: { client: true },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'No active account found. Create an account first.' },
        { status: 404 }
      );
    }

    const now = new Date();

    // 샘플 인사이트 생성
    const sampleInsights = [
      {
        accountId: account.id,
        type: 'DAILY_SUMMARY' as const,
        severity: 'INFO' as const,
        title: `${account.name} 일일 성과 요약`,
        summary: '전일 대비 ROAS +12.5%, CPA -8.3% 개선. 전환율이 상승하며 효율적인 캠페인 운영 중입니다.',
        details: {
          keyFindings: [
            { finding: 'ROAS 상승', impact: 'POSITIVE', metric: 'ROAS', change: 12.5 },
            { finding: 'CPA 감소', impact: 'POSITIVE', metric: 'CPA', change: -8.3 },
            { finding: '전환수 증가', impact: 'POSITIVE', metric: 'Conversions', change: 15.2 },
          ],
          recommendations: [
            '고성과 캠페인 예산 증액 검토',
            '현재 크리에이티브 전략 유지',
          ],
        },
        generatedAt: now,
      },
      {
        accountId: account.id,
        type: 'TREND' as const,
        severity: 'INFO' as const,
        title: '긍정적 성과 추세 감지',
        summary: '지난 7일간 ROAS가 지속적으로 상승하는 추세입니다. 현재 전략이 효과적으로 작동하고 있습니다.',
        details: {
          keyFindings: [
            { finding: '7일 연속 ROAS 상승', impact: 'POSITIVE', metric: 'ROAS', change: 18.7 },
          ],
          recommendations: [
            '성공 요인 분석 및 다른 캠페인 적용',
            '예산 확장 검토',
          ],
        },
        generatedAt: new Date(now.getTime() - 1000 * 60 * 60), // 1시간 전
      },
      {
        accountId: account.id,
        type: 'CREATIVE' as const,
        severity: 'INFO' as const,
        title: '크리에이티브 성과 분석',
        summary: '동영상 형식 광고가 이미지 광고 대비 CTR 2.3배 높습니다. 동영상 콘텐츠 확대를 권장합니다.',
        details: {
          keyFindings: [
            { finding: '동영상 CTR 우수', impact: 'POSITIVE', metric: 'CTR', change: 130 },
          ],
          recommendations: [
            '동영상 크리에이티브 제작 확대',
            '15초 이하 숏폼 콘텐츠 테스트',
          ],
        },
        generatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2시간 전
      },
      {
        accountId: account.id,
        type: 'ANOMALY' as const,
        severity: 'WARNING' as const,
        title: 'CTR 하락 감지',
        summary: '특정 캠페인에서 CTR이 평소 대비 18% 하락했습니다. 소재 피로도를 점검하세요.',
        details: {
          keyFindings: [
            { finding: 'CTR 하락', impact: 'NEGATIVE', metric: 'CTR', change: -18 },
          ],
          recommendations: [
            '해당 캠페인 소재 점검',
            '새로운 크리에이티브 테스트 준비',
          ],
        },
        generatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3), // 3시간 전
      },
      {
        accountId: account.id,
        type: 'PREDICTION' as const,
        severity: 'INFO' as const,
        title: '주말 성과 예측',
        summary: '과거 데이터 기반, 이번 주말 전환율이 평일 대비 20% 상승할 것으로 예측됩니다.',
        details: {
          keyFindings: [
            { finding: '주말 전환율 상승 패턴', impact: 'POSITIVE', metric: 'CVR', change: 20 },
          ],
          recommendations: [
            '주말 예산 증액 고려',
            '주말 타겟 오디언스 확대',
          ],
        },
        generatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4시간 전
      },
    ];

    // 샘플 전략 생성
    const sampleStrategies = [
      {
        accountId: account.id,
        type: 'BUDGET' as const,
        priority: 'HIGH' as const,
        title: '고성과 캠페인 예산 증액 권장',
        description: '현재 ROAS 3.2x를 기록 중인 캠페인의 예산을 20% 증액하면 추가 전환 확보가 가능합니다.',
        expectedImpact: { metric: 'Conversions', changePercent: 15 },
        actionItems: [{ action: '예산 증액', target: '고성과 캠페인', value: '20%', reason: 'ROAS 최적화' }],
        difficulty: 'EASY' as const,
        status: 'PENDING' as const,
      },
      {
        accountId: account.id,
        type: 'CREATIVE' as const,
        priority: 'MEDIUM' as const,
        title: '숏폼 동영상 콘텐츠 확대',
        description: '15초 이하 동영상이 높은 완료율을 보입니다. 숏폼 콘텐츠 비중을 50%까지 확대하세요.',
        expectedImpact: { metric: 'CTR', changePercent: 25 },
        actionItems: [{ action: '콘텐츠 제작', target: '숏폼 동영상', value: '50%', reason: '완료율 개선' }],
        difficulty: 'MEDIUM' as const,
        status: 'PENDING' as const,
      },
      {
        accountId: account.id,
        type: 'TARGETING' as const,
        priority: 'MEDIUM' as const,
        title: '오디언스 세분화 제안',
        description: '25-34세 여성 그룹에서 전환율이 가장 높습니다. 해당 세그먼트 타겟팅 강화를 권장합니다.',
        expectedImpact: { metric: 'CVR', changePercent: 12 },
        actionItems: [{ action: '타겟팅 조정', target: '25-34세 여성', value: '강화', reason: '전환율 최적화' }],
        difficulty: 'EASY' as const,
        status: 'PENDING' as const,
      },
      {
        accountId: account.id,
        type: 'BIDDING' as const,
        priority: 'LOW' as const,
        title: '입찰 전략 최적화',
        description: '현재 수동 입찰에서 자동 입찰(Target CPA)로 전환 시 효율 개선이 예상됩니다.',
        expectedImpact: { metric: 'CPA', changePercent: -10 },
        actionItems: [{ action: '입찰 전환', target: '자동 입찰', value: 'Target CPA', reason: '효율 개선' }],
        difficulty: 'EASY' as const,
        status: 'PENDING' as const,
      },
      {
        accountId: account.id,
        type: 'CAMPAIGN' as const,
        priority: 'HIGH' as const,
        title: '저성과 캠페인 일시 중지',
        description: 'ROAS 1.0 미만인 2개 캠페인이 있습니다. 예산 재배분을 위해 일시 중지를 권장합니다.',
        expectedImpact: { metric: 'ROAS', changePercent: 18 },
        actionItems: [{ action: '캠페인 중지', target: '저성과 캠페인', value: '2개', reason: '예산 재배분' }],
        difficulty: 'EASY' as const,
        status: 'PENDING' as const,
      },
    ];

    // 기존 샘플 데이터 삭제 (중복 방지)
    await prisma.aIInsight.deleteMany({
      where: {
        accountId: account.id,
        title: { contains: '샘플' },
      },
    });

    // 데이터 저장
    const createdInsights = await Promise.all(
      sampleInsights.map((insight) => prisma.aIInsight.create({ data: insight }))
    );

    const createdStrategies = await Promise.all(
      sampleStrategies.map((strategy) => prisma.aIStrategy.create({ data: strategy }))
    );

    // CRITICAL/WARNING 인사이트 로깅 (알림은 실제 사용자 ID가 필요)
    const alertInsights = createdInsights.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'WARNING'
    );

    if (alertInsights.length > 0) {
      console.log(`[Seed] ${alertInsights.length} alert insights created for account ${account.id}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Sample insights and strategies created successfully',
      data: {
        accountId: account.id,
        accountName: account.name,
        insightsCreated: createdInsights.length,
        strategiesCreated: createdStrategies.length,
        notificationsCreated: alertInsights.length,
      },
    });
  } catch (error) {
    console.error('Seed insights failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEED_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seed/insights
 *
 * 샘플 데이터 삭제
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Seed API is disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const whereClause = accountId ? { accountId } : {};

    const [deletedInsights, deletedStrategies] = await Promise.all([
      prisma.aIInsight.deleteMany({ where: whereClause }),
      prisma.aIStrategy.deleteMany({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Sample data deleted successfully',
      data: {
        insightsDeleted: deletedInsights.count,
        strategiesDeleted: deletedStrategies.count,
      },
    });
  } catch (error) {
    console.error('Delete seed data failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed/insights
 *
 * Seed API 상태 확인
 */
export async function GET() {
  const [insightCount, strategyCount] = await Promise.all([
    prisma.aIInsight.count(),
    prisma.aIStrategy.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      status: 'ready',
      currentData: {
        insights: insightCount,
        strategies: strategyCount,
      },
      endpoints: {
        create: 'POST /api/seed/insights',
        delete: 'DELETE /api/seed/insights?accountId=xxx',
      },
    },
  });
}
