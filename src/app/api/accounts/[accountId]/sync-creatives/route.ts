import { NextRequest, NextResponse } from 'next/server';
import { syncCreativesForAccount } from '@/lib/jobs/sync-creatives';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { accountId: string };
}

/**
 * POST /api/accounts/:accountId/sync-creatives
 * Sync creative data from TikTok API for a specific account
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = params;

    console.log(`[Creative Sync] Starting sync for account: ${accountId}`);

    const result = await syncCreativesForAccount(accountId);

    if (result.errors.length > 0) {
      console.error(`[Creative Sync] Completed with errors:`, result.errors);
      return NextResponse.json(
        {
          success: false,
          data: result,
          error: {
            code: 'SYNC_PARTIAL_FAILURE',
            message: `Sync completed with ${result.errors.length} errors`,
          },
        },
        { status: 207 } // Multi-Status
      );
    }

    console.log(
      `[Creative Sync] Completed successfully. Created: ${result.createdCount}, Updated: ${result.updatedCount}`
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Creative Sync] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync creatives',
        },
      },
      { status: 500 }
    );
  }
}
