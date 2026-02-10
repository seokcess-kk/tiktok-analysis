import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'account' | 'campaign' | 'creative' | 'insight' | 'strategy' | 'report';
  title: string;
  description?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const accountId = searchParams.get('accountId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { results: [], query },
      });
    }

    const results: SearchResult[] = [];

    // Search accounts
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { tiktokAdvId: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { client: true },
      take: 5,
    });

    for (const account of accounts) {
      results.push({
        id: account.id,
        type: 'account',
        title: account.name,
        description: account.client.name,
        href: `/accounts/${account.id}`,
      });
    }

    // If accountId is provided, search within that account
    if (accountId) {
      // Search campaigns
      const campaigns = await prisma.campaign.findMany({
        where: {
          accountId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { tiktokCampaignId: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      for (const campaign of campaigns) {
        results.push({
          id: campaign.id,
          type: 'campaign',
          title: campaign.name,
          description: `캠페인 · ${campaign.status}`,
          href: `/accounts/${accountId}/campaigns/${campaign.id}`,
        });
      }

      // Search creatives through ads that belong to this account's campaigns
      const creatives = await prisma.creative.findMany({
        where: {
          tiktokCreativeId: { contains: query, mode: 'insensitive' },
          ads: {
            some: {
              adGroup: {
                campaign: {
                  accountId,
                },
              },
            },
          },
        },
        take: 5,
      });

      for (const creative of creatives) {
        results.push({
          id: creative.id,
          type: 'creative',
          title: `크리에이티브 ${creative.tiktokCreativeId.slice(0, 8)}`,
          description: `${creative.type}`,
          href: `/accounts/${accountId}/creatives?id=${creative.id}`,
        });
      }

      // Search insights
      const insights = await prisma.aIInsight.findMany({
        where: {
          accountId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { generatedAt: 'desc' },
      });

      for (const insight of insights) {
        results.push({
          id: insight.id,
          type: 'insight',
          title: insight.title,
          description: `${insight.type} · ${insight.severity}`,
          href: `/accounts/${accountId}/insights?id=${insight.id}`,
        });
      }

      // Search strategies
      const strategies = await prisma.aIStrategy.findMany({
        where: {
          accountId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      for (const strategy of strategies) {
        results.push({
          id: strategy.id,
          type: 'strategy',
          title: strategy.title,
          description: `${strategy.type} · ${strategy.priority}`,
          href: `/accounts/${accountId}/insights?strategyId=${strategy.id}`,
        });
      }

      // Search reports
      const reports = await prisma.report.findMany({
        where: {
          accountId,
          title: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      for (const report of reports) {
        results.push({
          id: report.id,
          type: 'report',
          title: report.title || `${report.type} 리포트`,
          description: `${report.periodStart.toLocaleDateString()} ~ ${report.periodEnd.toLocaleDateString()}`,
          href: `/accounts/${accountId}/reports?id=${report.id}`,
        });
      }
    }

    // Limit results
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        results: limitedResults,
        total: results.length,
        query,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Search failed',
        },
      },
      { status: 500 }
    );
  }
}
