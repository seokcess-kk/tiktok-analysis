import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createTikTokClient } from '@/lib/tiktok/client';
import { Campaign } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        { status: 404 }
      );
    }

    // TikTok API 클라이언트 생성
    const client = createTikTokClient(account.accessToken, account.tiktokAdvId);

    // 캠페인 목록 조회
    const campaigns = await client.getAllCampaigns();

    // 캠페인 저장/업데이트
    const syncedCampaigns: Campaign[] = [];
    for (const campaign of campaigns) {
      const synced = await prisma.campaign.upsert({
        where: {
          accountId_tiktokCampaignId: {
            accountId: account.id,
            tiktokCampaignId: campaign.campaign_id,
          },
        },
        update: {
          name: campaign.campaign_name,
          objective: campaign.objective_type || 'UNKNOWN',
          status: campaign.operation_status || 'UNKNOWN',
          budget: campaign.budget || 0,
          budgetMode: campaign.budget_mode || 'UNKNOWN',
        },
        create: {
          accountId: account.id,
          tiktokCampaignId: campaign.campaign_id,
          name: campaign.campaign_name,
          objective: campaign.objective_type || 'UNKNOWN',
          status: campaign.operation_status || 'UNKNOWN',
          budget: campaign.budget || 0,
          budgetMode: campaign.budget_mode || 'UNKNOWN',
        },
      });
      syncedCampaigns.push(synced);
    }

    // 계정 마지막 동기화 시간 업데이트
    await prisma.account.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedCampaigns: syncedCampaigns.length,
        campaigns: syncedCampaigns,
      },
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync data',
        },
      },
      { status: 500 }
    );
  }
}
