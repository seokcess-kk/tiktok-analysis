/**
 * PDF Export Module
 * Provides server-side PDF generation without heavy dependencies
 * Uses HTML template that can be printed to PDF or converted client-side
 */

export interface PDFExportOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

const DEFAULT_OPTIONS: PDFExportOptions = {
  format: 'A4',
  orientation: 'portrait',
  margin: {
    top: '20mm',
    right: '15mm',
    bottom: '20mm',
    left: '15mm',
  },
};

/**
 * Generate print-optimized HTML for PDF conversion
 * This HTML can be:
 * 1. Printed directly via browser Print to PDF
 * 2. Converted client-side using jsPDF
 * 3. Sent to a PDF service API
 */
export function generatePrintableHTML(
  htmlContent: string,
  options: PDFExportOptions = {}
): string {
  const opts = {
    format: options.format || DEFAULT_OPTIONS.format,
    orientation: options.orientation || DEFAULT_OPTIONS.orientation,
    margin: options.margin || DEFAULT_OPTIONS.margin!,
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TikTok Ads Performance Report</title>
  <style>
    @media print {
      @page {
        size: ${opts.format} ${opts.orientation};
        margin: ${opts.margin.top} ${opts.margin.right} ${opts.margin.bottom} ${opts.margin.left};
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .no-print {
        display: none !important;
      }

      .page-break {
        page-break-after: always;
      }
    }

    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
      background: white;
    }

    h1 {
      color: #1a56db;
      border-bottom: 3px solid #1a56db;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    h2 {
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    h3 {
      color: #6b7280;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .period {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 20px 0;
    }

    .metric-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      background: #f9fafb;
    }

    .metric-card .label {
      color: #6b7280;
      font-size: 11px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .metric-card .value {
      font-size: 20px;
      font-weight: bold;
      color: #1a56db;
    }

    .insight-list,
    .strategy-list,
    .creative-list {
      margin: 15px 0;
    }

    .insight-item,
    .strategy-item,
    .creative-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      background: white;
      page-break-inside: avoid;
    }

    .severity-critical {
      border-left: 4px solid #dc2626;
    }

    .severity-warning {
      border-left: 4px solid #f59e0b;
    }

    .severity-info {
      border-left: 4px solid #3b82f6;
    }

    .priority-high {
      color: #dc2626;
      font-weight: bold;
    }

    .priority-medium {
      color: #f59e0b;
    }

    .priority-low {
      color: #6b7280;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #e5e7eb;
      padding: 10px;
      text-align: left;
      font-size: 12px;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }

    /* Print buttons - hidden when printing */
    .print-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }

    .print-controls button {
      display: block;
      width: 100%;
      padding: 10px 20px;
      margin-bottom: 10px;
      background: #1a56db;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .print-controls button:hover {
      background: #1e40af;
    }

    .print-controls button:last-child {
      margin-bottom: 0;
      background: #6b7280;
    }

    .print-controls button:last-child:hover {
      background: #4b5563;
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <button onclick="window.print()">🖨️ Print to PDF</button>
    <button onclick="downloadPDF()">📥 Download PDF</button>
    <button onclick="window.close()">✕ Close</button>
  </div>

  ${htmlContent}

  <script>
    // Client-side PDF download using browser's print functionality
    function downloadPDF() {
      // Trigger print dialog (user can save as PDF)
      window.print();
    }

    // Auto-fit content to page
    window.addEventListener('load', () => {
      document.body.style.visibility = 'visible';
    });
  </script>
</body>
</html>
  `.trim();
}

/**
 * Generate PDF metadata for HTTP response headers
 */
export function generatePDFHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}.html"`,
    'X-PDF-Hint': 'Use Print to PDF or Download PDF button',
  };
}

/**
 * Sanitize filename for safe download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9가-힣_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Generate filename for report
 */
export function generateReportFilename(
  accountName: string,
  reportType: string,
  periodStart: Date,
  periodEnd: Date
): string {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const sanitizedName = sanitizeFilename(accountName);
  const sanitizedType = sanitizeFilename(reportType);

  return `${sanitizedName}_${sanitizedType}_${formatDate(periodStart)}_${formatDate(periodEnd)}`;
}
