import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { generatePrintableHTML, generatePDFHeaders, generateReportFilename } from '@/lib/reports/pdf-exporter';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    accountId: string;
    reportId: string;
  };
}

/**
 * GET /api/reports/:accountId/:reportId/download
 * Download report as printable HTML (can be saved as PDF)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId, reportId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html'; // html, pdf (future)

    // Fetch report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        account: {
          include: {
            client: true,
          },
        },
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

    if (report.accountId !== accountId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Report does not belong to this account' },
        },
        { status: 403 }
      );
    }

    // Generate HTML content from stored report data
    const htmlContent = generateReportHTMLFromData(report);

    if (format === 'html') {
      // Wrap in printable template
      const printableHTML = generatePrintableHTML(htmlContent);
      const filename = generateReportFilename(
        report.account.name,
        report.type,
        report.periodStart,
        report.periodEnd
      );

      const headers = generatePDFHeaders(filename);

      return new NextResponse(printableHTML, {
        status: 200,
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Future: Add actual PDF generation here using puppeteer or similar
    // For now, return HTML that can be printed to PDF
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'PDF format not yet implemented. Use format=html and Print to PDF',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download report',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML content from stored report data
 */
function generateReportHTMLFromData(report: any): string {
  const formatDate = (date: Date) => new Date(date).toISOString().split('T')[0];
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const formatCurrency = (num: number) => `₩${formatNumber(Math.round(num))}`;
  const formatPercent = (num: number) => `${num.toFixed(2)}%`;

  // Extract data from report
  const insights = Array.isArray(report.insights) ? report.insights : [];
  const strategies = Array.isArray(report.strategies) ? report.strategies : [];

  // Calculate metrics from report content
  const metrics = report.content?.summary || {
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    cpa: 0,
    roas: 0,
  };

  const topCreatives = report.content?.topCreatives || [];

  return `
  <div class="header">
    <h1>${report.type} Report</h1>
    <h2>${report.account.name}</h2>
    <p class="period">${formatDate(report.periodStart)} ~ ${formatDate(report.periodEnd)}</p>
    <p class="period">Generated: ${new Date(report.generatedAt).toLocaleString('ko-KR')}</p>
  </div>

  <h2>📊 Performance Summary</h2>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="label">Total Spend</div>
      <div class="value">${formatCurrency(metrics.spend)}</div>
    </div>
    <div class="metric-card">
      <div class="label">Impressions</div>
      <div class="value">${formatNumber(metrics.impressions)}</div>
    </div>
    <div class="metric-card">
      <div class="label">Clicks</div>
      <div class="value">${formatNumber(metrics.clicks)}</div>
    </div>
    <div class="metric-card">
      <div class="label">Conversions</div>
      <div class="value">${formatNumber(metrics.conversions)}</div>
    </div>
    <div class="metric-card">
      <div class="label">CTR</div>
      <div class="value">${formatPercent(metrics.ctr)}</div>
    </div>
    <div class="metric-card">
      <div class="label">CPC</div>
      <div class="value">${formatCurrency(metrics.cpc)}</div>
    </div>
    <div class="metric-card">
      <div class="label">CPA</div>
      <div class="value">${formatCurrency(metrics.cpa)}</div>
    </div>
    <div class="metric-card">
      <div class="label">ROAS</div>
      <div class="value">${formatPercent(metrics.roas)}</div>
    </div>
  </div>

  <div class="page-break"></div>

  <h2>🔍 AI Insights (${insights.length})</h2>
  <div class="insight-list">
    ${
      insights.length > 0
        ? insights
            .map(
              (insight: any) => `
      <div class="insight-item severity-${(insight.severity || 'info').toLowerCase()}">
        <h3>[${insight.type || 'INSIGHT'}] ${insight.title || 'Untitled Insight'}</h3>
        <p>${insight.summary || 'No summary available'}</p>
      </div>
    `
            )
            .join('')
        : '<p>No insights generated for this period.</p>'
    }
  </div>

  <h2>💡 AI Strategies (${strategies.length})</h2>
  <div class="strategy-list">
    ${
      strategies.length > 0
        ? strategies
            .map(
              (strategy: any) => `
      <div class="strategy-item">
        <h3 class="priority-${(strategy.priority || 'medium').toLowerCase()}">
          [${strategy.type || 'STRATEGY'}] ${strategy.title || 'Untitled Strategy'}
        </h3>
        <p>Status: <strong>${strategy.status || 'PENDING'}</strong></p>
      </div>
    `
            )
            .join('')
        : '<p>No strategies created for this period.</p>'
    }
  </div>

  ${
    topCreatives.length > 0
      ? `
  <div class="page-break"></div>

  <h2>🎨 Top Performing Creatives</h2>
  <table>
    <thead>
      <tr>
        <th>Type</th>
        <th>Spend</th>
        <th>CTR</th>
        <th>Conversions</th>
      </tr>
    </thead>
    <tbody>
      ${topCreatives
        .map(
          (creative: any) => `
        <tr>
          <td>${creative.type || 'N/A'}</td>
          <td>${formatCurrency(creative.spend || 0)}</td>
          <td>${formatPercent(creative.ctr || 0)}</td>
          <td>${formatNumber(creative.conversions || 0)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  `
      : ''
  }

  <div class="footer">
    <p>Generated by TikTok Ads Analysis System</p>
    <p>Powered by AI Insights & Strategy Engine</p>
    <p>© ${new Date().getFullYear()} All rights reserved</p>
  </div>
  `.trim();
}
