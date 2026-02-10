'use client';

import { PDFDownloadButton, QuickPrintButton } from './pdf-download-button';

interface ReportPreviewProps {
  report: {
    id: string;
    type: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    generatedAt: Date | string;
    insights?: any[];
    strategies?: any[];
  };
  accountId: string;
  accountName: string;
}

export function ReportPreview({ report, accountId, accountName }: ReportPreviewProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const insightsCount = Array.isArray(report.insights) ? report.insights.length : 0;
  const strategiesCount = Array.isArray(report.strategies) ? report.strategies.length : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {report.type} Report
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Account:</span> {accountName}
            </p>
            <p>
              <span className="font-medium">Period:</span> {formatDate(report.periodStart)} ~{' '}
              {formatDate(report.periodEnd)}
            </p>
            <p>
              <span className="font-medium">Generated:</span>{' '}
              {new Date(report.generatedAt).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <QuickPrintButton accountId={accountId} reportId={report.id} />
          <PDFDownloadButton
            accountId={accountId}
            reportId={report.id}
            reportName={`${accountName}_${report.type}`}
          />
        </div>
      </div>

      {/* Content Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">AI Insights</p>
              <p className="text-2xl font-bold text-blue-600">{insightsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">AI Strategies</p>
              <p className="text-2xl font-bold text-green-600">{strategiesCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-gray-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">PDF 저장 방법</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                <strong>PDF 다운로드</strong> 버튼 클릭 → 새 창에서 리포트 열림 → 'Print to PDF' 또는
                '다운로드' 버튼 클릭
              </li>
              <li>
                <strong>인쇄</strong> 버튼 클릭 → 브라우저 인쇄 대화상자에서 'PDF로 저장' 선택
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
