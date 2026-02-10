import prisma from '@/lib/db/prisma';
import type { ReportType } from '@prisma/client';

export interface ReportData {
  accountId: string;
  accountName: string;
  reportType: ReportType;
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  insights: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    summary: string;
  }>;
  strategies: Array<{
    id: string;
    type: string;
    priority: string;
    title: string;
    status: string;
  }>;
  topCreatives: Array<{
    id: string;
    type: string;
    thumbnailUrl: string | null;
    spend: number;
    ctr: number;
    conversions: number;
  }>;
}

export interface GenerateReportOptions {
  accountId: string;
  type: ReportType;
  periodStart: Date;
  periodEnd: Date;
}

export async function generateReport(options: GenerateReportOptions): Promise<string> {
  const { accountId, type, periodStart, periodEnd } = options;

  // Fetch account info
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { client: true },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Fetch metrics
  const metrics = await prisma.performanceMetric.findMany({
    where: {
      accountId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      level: 'ACCOUNT',
    },
  });

  const aggregatedMetrics = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const ctr = aggregatedMetrics.impressions > 0
    ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
    : 0;
  const cpc = aggregatedMetrics.clicks > 0
    ? aggregatedMetrics.spend / aggregatedMetrics.clicks
    : 0;
  const cpa = aggregatedMetrics.conversions > 0
    ? aggregatedMetrics.spend / aggregatedMetrics.conversions
    : 0;
  const roas = aggregatedMetrics.spend > 0
    ? (aggregatedMetrics.conversions * 50000) / aggregatedMetrics.spend
    : 0;

  // Fetch insights
  const insights = await prisma.aIInsight.findMany({
    where: {
      accountId,
      generatedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    orderBy: { generatedAt: 'desc' },
    take: 10,
  });

  // Fetch strategies
  const strategies = await prisma.aIStrategy.findMany({
    where: {
      accountId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Fetch top creatives
  const creativeMetrics = await prisma.performanceMetric.findMany({
    where: {
      accountId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      level: 'CREATIVE',
      creativeId: { not: null },
    },
    include: {
      creative: {
        select: {
          id: true,
          type: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  // Aggregate by creative
  const creativeMap = new Map<string, any>();
  for (const metric of creativeMetrics) {
    if (!metric.creative) continue;

    const existing = creativeMap.get(metric.creative.id) || {
      id: metric.creative.id,
      type: metric.creative.type,
      thumbnailUrl: metric.creative.thumbnailUrl,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };

    existing.spend += metric.spend;
    existing.impressions += metric.impressions;
    existing.clicks += metric.clicks;
    existing.conversions += metric.conversions;

    creativeMap.set(metric.creative.id, existing);
  }

  const topCreatives = Array.from(creativeMap.values())
    .map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5);

  // Build report data
  const reportData: ReportData = {
    accountId,
    accountName: account.name,
    reportType: type,
    periodStart,
    periodEnd,
    metrics: {
      ...aggregatedMetrics,
      ctr,
      cpc,
      cpa,
      roas,
    },
    insights: insights.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      title: i.title,
      summary: i.summary,
    })),
    strategies: strategies.map((s) => ({
      id: s.id,
      type: s.type,
      priority: s.priority,
      title: s.title,
      status: s.status,
    })),
    topCreatives,
  };

  // Generate HTML report
  const htmlContent = generateHTMLReport(reportData);

  // Store report in database with complete data
  const report = await prisma.report.create({
    data: {
      accountId,
      type,
      periodStart,
      periodEnd,
      fileUrl: null, // Will be generated on-demand via /download endpoint
      content: {
        insights: insights.map((i) => ({ id: i.id, title: i.title, type: i.type, severity: i.severity, summary: i.summary })),
        strategies: strategies.map((s) => ({ id: s.id, title: s.title, type: s.type, status: s.status, priority: s.priority })),
        htmlContent,
      },
      completedAt: new Date(),
      status: 'COMPLETED',
    },
  });

  return report.id;
}

function generateHTMLReport(data: ReportData): string {
  const { accountName, reportType, periodStart, periodEnd, metrics, insights, strategies, topCreatives } = data;

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const formatCurrency = (num: number) => `₩${formatNumber(Math.round(num))}`;
  const formatPercent = (num: number) => `${num.toFixed(2)}%`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportType} Report - ${accountName}</title>
  <style>
    body {
      font-family: 'Malgun Gothic', sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 { color: #1a56db; border-bottom: 3px solid #1a56db; padding-bottom: 10px; }
    h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; }
    h3 { color: #6b7280; }
    .header { text-align: center; margin-bottom: 40px; }
    .period { color: #6b7280; font-size: 14px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
    .metric-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      background: #f9fafb;
    }
    .metric-card .label { color: #6b7280; font-size: 12px; margin-bottom: 5px; }
    .metric-card .value { font-size: 24px; font-weight: bold; color: #1a56db; }
    .insight-list, .strategy-list, .creative-list { margin: 20px 0; }
    .insight-item, .strategy-item, .creative-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
      background: white;
    }
    .severity-critical { border-left: 4px solid #dc2626; }
    .severity-warning { border-left: 4px solid #f59e0b; }
    .severity-info { border-left: 4px solid #3b82f6; }
    .priority-high { color: #dc2626; font-weight: bold; }
    .priority-medium { color: #f59e0b; }
    .priority-low { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 60px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportType} Report</h1>
    <h2>${accountName}</h2>
    <p class="period">${formatDate(periodStart)} ~ ${formatDate(periodEnd)}</p>
    <p class="period">Generated: ${new Date().toLocaleString('ko-KR')}</p>
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

  <h2>🔍 AI Insights (${insights.length})</h2>
  <div class="insight-list">
    ${insights.map(insight => `
      <div class="insight-item severity-${insight.severity.toLowerCase()}">
        <h3>[${insight.type}] ${insight.title}</h3>
        <p>${insight.summary}</p>
      </div>
    `).join('')}
    ${insights.length === 0 ? '<p>No insights generated for this period.</p>' : ''}
  </div>

  <h2>💡 AI Strategies (${strategies.length})</h2>
  <div class="strategy-list">
    ${strategies.map(strategy => `
      <div class="strategy-item">
        <h3 class="priority-${strategy.priority.toLowerCase()}">[${strategy.type}] ${strategy.title}</h3>
        <p>Status: <strong>${strategy.status}</strong></p>
      </div>
    `).join('')}
    ${strategies.length === 0 ? '<p>No strategies created for this period.</p>' : ''}
  </div>

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
      ${topCreatives.map(creative => `
        <tr>
          <td>${creative.type}</td>
          <td>${formatCurrency(creative.spend)}</td>
          <td>${formatPercent(creative.ctr)}</td>
          <td>${formatNumber(creative.conversions)}</td>
        </tr>
      `).join('')}
      ${topCreatives.length === 0 ? '<tr><td colspan="4">No creative data available</td></tr>' : ''}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated by TikTok Ads Analysis System</p>
    <p>Powered by AI Insights & Strategy Engine</p>
  </div>
</body>
</html>
  `.trim();
}
