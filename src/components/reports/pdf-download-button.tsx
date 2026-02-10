'use client';

import { useState } from 'react';

interface PDFDownloadButtonProps {
  accountId: string;
  reportId: string;
  reportName: string;
  className?: string;
}

/**
 * PDF Download Button Component
 * Opens report in new window with print-to-PDF functionality
 */
export function PDFDownloadButton({
  accountId,
  reportId,
  reportName,
  className = '',
}: PDFDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Open download URL in new window
      const downloadUrl = `/api/reports/${accountId}/${reportId}/download?format=html`;
      const newWindow = window.open(downloadUrl, '_blank', 'width=1024,height=768');

      if (!newWindow) {
        setError('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Download error:', err);
      setError('다운로드에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${className}`}
        title="새 창에서 리포트를 열고 PDF로 저장할 수 있습니다"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>로딩 중...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>PDF 다운로드</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Quick Print Button (uses browser print directly)
 */
export function QuickPrintButton({
  accountId,
  reportId,
  className = '',
}: Omit<PDFDownloadButtonProps, 'reportName'>) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    try {
      setIsLoading(true);

      // Fetch report HTML
      const response = await fetch(`/api/reports/${accountId}/${reportId}/download?format=html`);
      if (!response.ok) throw new Error('Failed to fetch report');

      const html = await response.text();

      // Open in new window and auto-print
      const printWindow = window.open('', '_blank', 'width=1024,height=768');
      if (!printWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        setIsLoading(false);
        return;
      }

      printWindow.document.write(html);
      printWindow.document.close();

      // Auto-trigger print after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      setIsLoading(false);
    } catch (err) {
      console.error('Print error:', err);
      alert('인쇄에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${className}`}
      title="즉시 인쇄 대화상자를 엽니다"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>로딩 중...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>인쇄</span>
        </>
      )}
    </button>
  );
}
