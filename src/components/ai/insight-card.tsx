'use client';

import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export interface KeyFinding {
  finding: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  metric: string;
  change: number;
  evidence?: string;
}

export interface InsightCardProps {
  id: string;
  type: 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  keyFindings?: KeyFinding[];
  recommendations?: string[];
  generatedAt: string;
  isRead?: boolean;
  linkedStrategiesCount?: number;
  onClick?: () => void;
  onMarkRead?: () => void;
  compact?: boolean;
}

const typeIcons: Record<string, string> = {
  DAILY_SUMMARY: '📊',
  ANOMALY: '🚨',
  TREND: '📈',
  CREATIVE: '🎨',
  PREDICTION: '🔮',
};

const typeLabels: Record<string, string> = {
  DAILY_SUMMARY: '일간 요약',
  ANOMALY: '이상 탐지',
  TREND: '트렌드',
  CREATIVE: '소재 분석',
  PREDICTION: '예측',
};

const severityStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  INFO: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  WARNING: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
  },
};

const impactStyles: Record<string, string> = {
  POSITIVE: 'text-green-600',
  NEGATIVE: 'text-red-600',
  NEUTRAL: 'text-gray-600',
};

export function InsightCard({
  id,
  type,
  severity,
  title,
  summary,
  keyFindings = [],
  recommendations = [],
  generatedAt,
  isRead = false,
  linkedStrategiesCount = 0,
  onClick,
  onMarkRead,
  compact = false,
}: InsightCardProps) {
  const styles = severityStyles[severity];
  const timeAgo = formatDistanceToNow(new Date(generatedAt), {
    addSuffix: true,
    locale: ko,
  });

  if (compact) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
          styles.border,
          isRead ? 'bg-white opacity-80' : styles.bg,
          onClick && 'hover:border-blue-400'
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcons[type]}</span>
            <div>
              <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{title}</h4>
              <p className="text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded', styles.badge)}>
            {severity}
          </span>
        </div>
        {!isRead && (
          <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-2 right-2" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        styles.border,
        isRead ? 'bg-white' : styles.bg,
        onClick && 'cursor-pointer hover:shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className={cn('px-4 py-3 border-b', styles.border)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeIcons[type]}</span>
            <div>
              <span className={cn('text-xs font-medium', styles.text)}>
                {typeLabels[type]}
              </span>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', styles.badge)}>
              {severity === 'CRITICAL' ? '긴급' : severity === 'WARNING' ? '주의' : '정보'}
            </span>
            {!isRead && onMarkRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                읽음 표시
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Summary */}
        <p className="text-sm text-gray-700 mb-4">{summary}</p>

        {/* Key Findings */}
        {keyFindings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              주요 발견
            </h4>
            <ul className="space-y-2">
              {keyFindings.slice(0, 3).map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn(
                      'flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs',
                      finding.impact === 'POSITIVE'
                        ? 'bg-green-100 text-green-600'
                        : finding.impact === 'NEGATIVE'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {finding.impact === 'POSITIVE' ? '↑' : finding.impact === 'NEGATIVE' ? '↓' : '→'}
                  </span>
                  <div className="flex-1">
                    <span className="text-gray-700">{finding.finding}</span>
                    <span className={cn('ml-2 font-medium', impactStyles[finding.impact])}>
                      {finding.metric} {finding.change > 0 ? '+' : ''}
                      {finding.change.toFixed(1)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              권장 조치
            </h4>
            <ul className="space-y-1">
              {recommendations.slice(0, 2).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={cn('px-4 py-2 border-t flex items-center justify-between', styles.border)}>
        <span className="text-xs text-gray-500">{timeAgo}</span>
        <div className="flex items-center gap-3">
          {linkedStrategiesCount > 0 && (
            <span className="text-xs text-blue-600">
              연결된 전략 {linkedStrategiesCount}개
            </span>
          )}
          {onClick && (
            <span className="text-xs text-blue-500 hover:underline">
              자세히 보기 →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export interface InsightListProps {
  insights: InsightCardProps[];
  onInsightClick?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  emptyMessage?: string;
}

export function InsightList({
  insights,
  onInsightClick,
  onMarkRead,
  emptyMessage = '인사이트가 없습니다',
}: InsightListProps) {
  if (insights.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300"
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
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <InsightCard
          key={insight.id}
          {...insight}
          onClick={() => onInsightClick?.(insight.id)}
          onMarkRead={() => onMarkRead?.(insight.id)}
        />
      ))}
    </div>
  );
}
