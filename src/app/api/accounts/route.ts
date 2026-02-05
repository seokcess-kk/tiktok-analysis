import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        client: true,
        _count: {
          select: {
            campaigns: true,
            insights: {
              where: {
                isRead: false,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch accounts',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, tiktokAdvId, name, accessToken, refreshToken, tokenExpiresAt } = body;

    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: { tiktokAdvId },
    });

    if (existingAccount) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_EXISTS',
            message: 'This TikTok account is already connected',
          },
        },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        clientId,
        tiktokAdvId,
        name,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(tokenExpiresAt),
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
    console.error('Error creating account:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account',
        },
      },
      { status: 500 }
    );
  }
}
