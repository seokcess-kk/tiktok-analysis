import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string; reportId: string };
}

/**
 * GET /api/reports/:accountId/:reportId
 * 리포트 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, reportId } = params;

    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        accountId,
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        },
        { status: 404 }
      );
    }

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
        content: report.content,
        fileUrl: report.fileUrl,
        fileSize: report.fileSize,
        errorMessage: report.errorMessage,
        createdAt: report.createdAt,
        completedAt: report.completedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch report' },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/:accountId/:reportId
 * 리포트 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, reportId } = params;

    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        accountId,
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' },
        },
        { status: 404 }
      );
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete report' },
      },
      { status: 500 }
    );
  }
}
