import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: { accountId: string; strategyId: string };
}

/**
 * GET /api/ai/strategies/:accountId/:strategyId
 * 전략 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, strategyId } = params;

    const strategy = await prisma.aIStrategy.findFirst({
      where: {
        id: strategyId,
        accountId,
      },
      include: {
        insight: true,
        account: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                name: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Strategy not found' },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: strategy.id,
        type: strategy.type,
        priority: strategy.priority,
        title: strategy.title,
        description: strategy.description,
        actionItems: strategy.actionItems,
        expectedImpact: strategy.expectedImpact,
        difficulty: strategy.difficulty,
        status: strategy.status,
        acceptedAt: strategy.acceptedAt,
        completedAt: strategy.completedAt,
        rejectedReason: strategy.rejectedReason,
        actualResult: strategy.actualResult,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
        account: {
          id: strategy.account.id,
          name: strategy.account.name,
          clientName: strategy.account.client.name,
          industry: strategy.account.client.industry,
        },
        linkedInsight: strategy.insight
          ? {
              id: strategy.insight.id,
              type: strategy.insight.type,
              severity: strategy.insight.severity,
              title: strategy.insight.title,
              summary: strategy.insight.summary,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch strategy',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/strategies/:accountId/:strategyId
 * 전략 상태 업데이트 (수락/거절/완료)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, strategyId } = params;
    const body = await request.json();
    const { action, notes, actualResult, rejectedReason } = body;

    const strategy = await prisma.aIStrategy.findFirst({
      where: {
        id: strategyId,
        accountId,
      },
    });

    if (!strategy) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Strategy not found' },
        },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'accept':
        if (strategy.status !== 'PENDING') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_STATE',
                message: 'Only pending strategies can be accepted',
              },
            },
            { status: 400 }
          );
        }
        updateData = {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        };
        break;

      case 'start':
        if (strategy.status !== 'ACCEPTED') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_STATE',
                message: 'Only accepted strategies can be started',
              },
            },
            { status: 400 }
          );
        }
        updateData = {
          status: 'IN_PROGRESS',
        };
        break;

      case 'complete':
        if (!['ACCEPTED', 'IN_PROGRESS'].includes(strategy.status)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_STATE',
                message: 'Only accepted or in-progress strategies can be completed',
              },
            },
            { status: 400 }
          );
        }
        updateData = {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualResult: actualResult || null,
        };
        break;

      case 'reject':
        if (strategy.status !== 'PENDING') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_STATE',
                message: 'Only pending strategies can be rejected',
              },
            },
            { status: 400 }
          );
        }
        updateData = {
          status: 'REJECTED',
          rejectedReason: rejectedReason || null,
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action. Use: accept, start, complete, or reject',
            },
          },
          { status: 400 }
        );
    }

    const updated = await prisma.aIStrategy.update({
      where: { id: strategyId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        acceptedAt: updated.acceptedAt,
        completedAt: updated.completedAt,
        rejectedReason: updated.rejectedReason,
        actualResult: updated.actualResult,
        updatedAt: updated.updatedAt,
      },
      message: `Strategy ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update strategy',
        },
      },
      { status: 500 }
    );
  }
}
