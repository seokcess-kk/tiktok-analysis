import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // TikTok API 직접 호출
    const queryParams = new URLSearchParams({
      advertiser_id: account.tiktokAdvId,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['advertiser_id', 'stat_time_day']),
      metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']),
      data_level: 'AUCTION_ADVERTISER',
      start_date: '2025-12-01',
      end_date: '2025-12-30',
      page: '1',
      page_size: '100',
    });

    const url = `${TIKTOK_API_BASE}/report/integrated/get/?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': account.accessToken,
        'Content-Type': 'application/json',
      },
    });

    const rawData = await response.json();

    return NextResponse.json({
      requestUrl: url,
      advertiserId: account.tiktokAdvId,
      rawResponse: rawData,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
