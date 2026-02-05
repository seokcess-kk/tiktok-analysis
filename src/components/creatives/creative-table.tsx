'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface CreativeTableRow {
  id: string;
  tiktokCreativeId: string;
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  thumbnailUrl?: string | null;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas?: number;
  };
  score?: {
    overall: number;
    grade: string;
    percentile: number;
  } | null;
  fatigue?: {
    index: number;
    trend: string;
  } | null;
}

export interface CreativeTableProps {
  data: CreativeTableRow[];
  onRowClick?: (id: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

const gradeColors: Record<string, string> = {
  S: 'bg-purple-100 text-purple-700',
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

const trendIcons: Record<string, { icon: string; color: string }> = {
  RISING: { icon: '↑', color: 'text-green-600' },
  STABLE: { icon: '→', color: 'text-gray-600' },
  DECLINING: { icon: '↓', color: 'text-orange-600' },
  EXHAUSTED: { icon: '⚠', color: 'text-red-600' },
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return '₩' + (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return '₩' + (num / 1000).toFixed(1) + 'K';
  }
  return '₩' + num.toLocaleString();
}

export function CreativeTable({
  data,
  onRowClick,
  sortBy = 'spend',
  sortOrder = 'desc',
  onSort,
}: CreativeTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const columns = [
    { key: 'creative', label: '소재', sortable: false },
    { key: 'type', label: '유형', sortable: true },
    { key: 'spend', label: '지출', sortable: true },
    { key: 'impressions', label: '노출', sortable: true },
    { key: 'clicks', label: '클릭', sortable: true },
    { key: 'conversions', label: '전환', sortable: true },
    { key: 'ctr', label: 'CTR', sortable: true },
    { key: 'cvr', label: 'CVR', sortable: true },
    { key: 'cpa', label: 'CPA', sortable: true },
    { key: 'score', label: '점수', sortable: true },
    { key: 'fatigueIndex', label: '피로도', sortable: true },
  ];

  const handleSort = (column: string) => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  column.sortable && 'cursor-pointer hover:bg-gray-100'
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable && sortBy === column.key && (
                    <span className="text-blue-500">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => {
            const trendInfo = row.fatigue?.trend ? trendIcons[row.fatigue.trend] : null;

            return (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-blue-50',
                  hoveredRow === row.id && 'bg-blue-50'
                )}
                onClick={() => onRowClick?.(row.id)}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Creative */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {row.thumbnailUrl ? (
                        <img
                          src={row.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {row.tiktokCreativeId}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {row.type}
                  </span>
                </td>

                {/* Spend */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(row.metrics.spend)}
                </td>

                {/* Impressions */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(row.metrics.impressions)}
                </td>

                {/* Clicks */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(row.metrics.clicks)}
                </td>

                {/* Conversions */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(row.metrics.conversions)}
                </td>

                {/* CTR */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {row.metrics.ctr.toFixed(2)}%
                </td>

                {/* CVR */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {row.metrics.cvr.toFixed(2)}%
                </td>

                {/* CPA */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {row.metrics.cpa > 0 ? formatCurrency(row.metrics.cpa) : '-'}
                </td>

                {/* Score */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.score ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{row.score.overall}</span>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          gradeColors[row.score.grade] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {row.score.grade}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Fatigue */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.fatigue ? (
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          row.fatigue.index >= 70 ? 'text-red-600' :
                          row.fatigue.index >= 50 ? 'text-orange-600' :
                          row.fatigue.index >= 30 ? 'text-yellow-600' : 'text-green-600'
                        )}
                      >
                        {row.fatigue.index}
                      </span>
                      {trendInfo && (
                        <span className={cn('text-sm', trendInfo.color)}>
                          {trendInfo.icon}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          소재 데이터가 없습니다
        </div>
      )}
    </div>
  );
}
