import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
      include: {
        client: true,
        campaigns: {
          include: {
            _count: {
              select: { adGroups: true },
            },
          },
        },
        _count: {
          select: {
            insights: { where: { isRead: false } },
            strategies: { where: { status: 'PENDING' } },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Account not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch account',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const body = await request.json();
    const { name, status } = body;

    const account = await prisma.account.update({
      where: { id: params.accountId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update account',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await prisma.account.delete({
      where: { id: params.accountId },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete account',
        },
      },
      { status: 500 }
    );
  }
}
