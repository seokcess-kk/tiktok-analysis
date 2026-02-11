import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ strategyId: string }>;
}

/**
 * POST /api/strategies/{strategyId}/reject
 * 전략 거절
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { strategyId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason as string | undefined;

    const strategy = await prisma.aIStrategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { success: false, error: 'Strategy not found' },
        { status: 404 }
      );
    }

    if (strategy.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Strategy is already ${strategy.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.aIStrategy.update({
      where: { id: strategyId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        rejectedReason: updated.rejectedReason,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Strategy reject error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject strategy' },
      { status: 500 }
    );
  }
}
