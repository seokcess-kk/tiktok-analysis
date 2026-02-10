import prisma from '@/lib/db/prisma';
import { createTikTokClient } from '@/lib/tiktok/client';
import type { TikTokCreative } from '@/types';

export interface SyncCreativesResult {
  accountId: string;
  createdCount: number;
  updatedCount: number;
  errors: string[];
}

export async function syncCreativesForAccount(accountId: string): Promise<SyncCreativesResult> {
  const result: SyncCreativesResult = {
    accountId,
    createdCount: 0,
    updatedCount: 0,
    errors: [],
  };

  try {
    // Get account with credentials
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        tiktokAdvId: true,
        accessToken: true,
      },
    });

    if (!account) {
      result.errors.push('Account not found');
      return result;
    }

    // Create TikTok API client
    const client = createTikTokClient(account.accessToken, account.tiktokAdvId);

    // Get all ads for this account
    const ads = await prisma.ad.findMany({
      where: {
        adGroup: {
          campaign: {
            accountId,
          },
        },
      },
      select: {
        id: true,
        tiktokAdId: true,
      },
    });

    if (ads.length === 0) {
      result.errors.push('No ads found for this account');
      return result;
    }

    // Fetch creatives from TikTok API
    const adIds = ads.map((ad) => ad.tiktokAdId);
    const tiktokCreatives = await client.getAllCreatives(adIds);

    // Process each creative
    for (const tiktokCreative of tiktokCreatives) {
      try {
        await syncCreative(tiktokCreative, ads, result);
      } catch (error) {
        const msg = `Failed to sync creative ${tiktokCreative.creative_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(msg);
        console.error(msg);
      }
    }

    // Update last sync timestamp
    await prisma.account.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    });

    return result;
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

async function syncCreative(
  tiktokCreative: TikTokCreative,
  ads: Array<{ id: string; tiktokAdId: string }>,
  result: SyncCreativesResult
): Promise<void> {
  // Find corresponding ad
  const ad = ads.find((a) => a.tiktokAdId === tiktokCreative.ad_id);

  // Extract creative data
  const creativeType = mapCreativeType(tiktokCreative.creative_type);
  const thumbnailUrl = extractThumbnailUrl(tiktokCreative);
  const videoUrl = extractVideoUrl(tiktokCreative);
  const duration = extractDuration(tiktokCreative);

  // Check if creative already exists
  const existingCreative = await prisma.creative.findUnique({
    where: { tiktokCreativeId: tiktokCreative.creative_id },
  });

  if (existingCreative) {
    // Update existing creative
    await prisma.creative.update({
      where: { id: existingCreative.id },
      data: {
        type: creativeType,
        thumbnailUrl,
        videoUrl,
        duration,
        updatedAt: new Date(),
      },
    });
    result.updatedCount++;
  } else {
    // Create new creative
    await prisma.creative.create({
      data: {
        tiktokCreativeId: tiktokCreative.creative_id,
        type: creativeType,
        thumbnailUrl,
        videoUrl,
        duration,
        ads: ad
          ? {
              connect: { id: ad.id },
            }
          : undefined,
      },
    });
    result.createdCount++;
  }
}

function mapCreativeType(type: string): 'VIDEO' | 'IMAGE' | 'CAROUSEL' {
  switch (type.toUpperCase()) {
    case 'VIDEO':
      return 'VIDEO';
    case 'IMAGE':
      return 'IMAGE';
    case 'CAROUSEL':
      return 'CAROUSEL';
    default:
      return 'VIDEO'; // Default fallback
  }
}

function extractThumbnailUrl(creative: TikTokCreative): string | null {
  if (creative.material_list && creative.material_list.length > 0) {
    const material = creative.material_list[0];
    return material.material_url || null;
  }
  return null;
}

function extractVideoUrl(creative: TikTokCreative): string | null {
  if (creative.material_list && creative.material_list.length > 0) {
    const videoMaterial = creative.material_list.find((m) => m.material_type === 'VIDEO');
    return videoMaterial?.material_url || null;
  }
  return null;
}

function extractDuration(creative: TikTokCreative): number | null {
  if (creative.material_list && creative.material_list.length > 0) {
    const videoMaterial = creative.material_list.find((m) => m.material_type === 'VIDEO');
    return videoMaterial?.duration || null;
  }
  return null;
}

export async function syncAllAccountsCreatives(): Promise<SyncCreativesResult[]> {
  const accounts = await prisma.account.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  const results: SyncCreativesResult[] = [];

  for (const account of accounts) {
    try {
      const result = await syncCreativesForAccount(account.id);
      results.push(result);
    } catch (error) {
      results.push({
        accountId: account.id,
        createdCount: 0,
        updatedCount: 0,
        errors: [
          `Failed to sync account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      });
    }
  }

  return results;
}
