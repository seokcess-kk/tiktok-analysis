import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { generateReport } from '@/lib/reports/report-generator';
import type { ReportType } from '@prisma/client';

interface RouteParams {
  params: { accountId: string };
}

/**
 * GET /api/reports/:accountId
 * 리포트 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type'); // DAILY, WEEKLY, MONTHLY, CUSTOM
    const status = searchParams.get('status'); // PENDING, GENERATING, COMPLETED, FAILED
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 계정 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
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

    // 필터 조건
    const where: any = { accountId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          status: r.status,
          period: {
            start: r.periodStart,
            end: r.periodEnd,
          },
          fileUrl: r.fileUrl,
          fileSize: r.fileSize,
          createdAt: r.createdAt,
          completedAt: r.completedAt,
        })),
        pagination: {
          total,
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reports' },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/:accountId
 * 리포트 생성 요청
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;
    const body = await request.json();
    const { type, title, periodStart, periodEnd, options } = body;

    // 계정 확인
    const account = await prisma.account.findUnique({
      where: { id: accountId },
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

    // 기간 설정
    const endDate = periodEnd ? new Date(periodEnd) : new Date();
    let startDate: Date;

    switch (type) {
      case 'DAILY':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'WEEKLY':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'MONTHLY':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = periodStart ? new Date(periodStart) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Use new report generator
    const reportId = await generateReport({
      accountId,
      type: (type as ReportType) || 'CUSTOM',
      periodStart: startDate,
      periodEnd: endDate,
    });

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        type: report.type,
        title: report.title,
        status: report.status,
        period: {
          start: report.periodStart,
          end: report.periodEnd,
        },
        createdAt: report.createdAt,
      },
      message: 'Report generation started',
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' },
      },
      { status: 500 }
    );
  }
}

/**
 * 비동기 리포트 생성 (실제로는 별도 워커나 큐에서 처리)
 */
async function generateReportAsync(
  reportId: string,
  account: any,
  startDate: Date,
  endDate: Date
) {
  try {
    // 상태를 GENERATING으로 업데이트
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'GENERATING' },
    });

    // 메트릭 데이터 조회
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        accountId: account.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        level: 'CAMPAIGN',
      },
    });

    // 인사이트 조회
    const insights = await prisma.aIInsight.findMany({
      where: {
        accountId: account.id,
        generatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      take: 10,
      orderBy: { generatedAt: 'desc' },
    });

    // 전략 조회
    const strategies = await prisma.aIStrategy.findMany({
      where: {
        accountId: account.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // 리포트 데이터 집계
    const aggregatedMetrics = metrics.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    );

    const reportData = {
      account: {
        id: account.id,
        name: account.name,
        client: account.client.name,
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        ...aggregatedMetrics,
        ctr: aggregatedMetrics.impressions > 0
          ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
          : 0,
        cvr: aggregatedMetrics.clicks > 0
          ? (aggregatedMetrics.conversions / aggregatedMetrics.clicks) * 100
          : 0,
        cpa: aggregatedMetrics.conversions > 0
          ? aggregatedMetrics.spend / aggregatedMetrics.conversions
          : 0,
      },
      insights: insights.map((i) => ({
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
      })),
      strategies: strategies.map((s) => ({
        type: s.type,
        title: s.title,
        status: s.status,
        priority: s.priority,
      })),
      generatedAt: new Date().toISOString(),
    };

    // 실제로는 PDF 생성 후 파일 저장
    // 여기서는 JSON 데이터만 저장
    const fileContent = JSON.stringify(reportData, null, 2);

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        content: reportData,
        fileSize: Buffer.byteLength(fileContent, 'utf8'),
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
