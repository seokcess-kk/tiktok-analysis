'use client';

import { cn } from '@/lib/utils';

export interface CreativeCardProps {
  id: string;
  tiktokCreativeId: string;
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  thumbnailUrl?: string | null;
  duration?: number | null;
  tags?: string[];
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
  };
  score?: {
    overall: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    percentile: number;
  } | null;
  fatigue?: {
    index: number;
    trend: string;
    recommendedAction?: string | null;
  } | null;
  onClick?: () => void;
}

const gradeColors: Record<string, string> = {
  S: 'bg-purple-500 text-white',
  A: 'bg-blue-500 text-white',
  B: 'bg-green-500 text-white',
  C: 'bg-yellow-500 text-white',
  D: 'bg-orange-500 text-white',
  F: 'bg-red-500 text-white',
};

const trendLabels: Record<string, { text: string; color: string }> = {
  RISING: { text: '상승', color: 'text-green-600' },
  STABLE: { text: '안정', color: 'text-gray-600' },
  DECLINING: { text: '하락', color: 'text-orange-600' },
  EXHAUSTED: { text: '소진', color: 'text-red-600' },
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
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(num);
}

export function CreativeCard({
  tiktokCreativeId,
  type,
  thumbnailUrl,
  duration,
  tags = [],
  metrics,
  score,
  fatigue,
  onClick,
}: CreativeCardProps) {
  const trendInfo = fatigue?.trend ? trendLabels[fatigue.trend] : null;

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer',
        onClick && 'hover:border-blue-300'
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={tiktokCreativeId}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {type === 'VIDEO' ? (
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}

        {/* Type Badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-black/60 text-white rounded">
          {type}
        </span>

        {/* Duration */}
        {duration && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-medium bg-black/60 text-white rounded">
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </span>
        )}

        {/* Score Grade */}
        {score && (
          <span className={cn(
            'absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full',
            gradeColors[score.grade]
          )}>
            {score.grade}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ID & Tags */}
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-900 truncate" title={tiktokCreativeId}>
            {tiktokCreativeId}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <p className="text-gray-500 text-xs">지출</p>
            <p className="font-medium">{formatCurrency(metrics.spend)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">노출</p>
            <p className="font-medium">{formatNumber(metrics.impressions)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">CTR</p>
            <p className="font-medium">{metrics.ctr.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">CVR</p>
            <p className="font-medium">{metrics.cvr.toFixed(2)}%</p>
          </div>
        </div>

        {/* Score & Fatigue */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {score && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">점수</span>
              <span className="font-semibold text-gray-900">{score.overall}</span>
              <span className="text-xs text-gray-400">상위 {score.percentile}%</span>
            </div>
          )}

          {fatigue && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">피로도</span>
              <span className={cn(
                'font-semibold',
                fatigue.index >= 70 ? 'text-red-600' :
                fatigue.index >= 50 ? 'text-orange-600' :
                fatigue.index >= 30 ? 'text-yellow-600' : 'text-green-600'
              )}>
                {fatigue.index}
              </span>
              {trendInfo && (
                <span className={cn('text-xs', trendInfo.color)}>
                  ({trendInfo.text})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
