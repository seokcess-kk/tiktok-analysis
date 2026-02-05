'use client';

import { cn } from '@/lib/utils';

export interface AnomalyAlertProps {
  type: 'CPA_SPIKE' | 'CTR_DROP' | 'IMPRESSION_DROP' | 'SPEND_VELOCITY' | 'ROAS_DROP' | 'OTHER';
  severity: 'WARNING' | 'CRITICAL';
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  onDismiss?: () => void;
  onViewDetails?: () => void;
}

const typeConfig: Record<
  string,
  { icon: string; title: string; description: string }
> = {
  CPA_SPIKE: {
    icon: '💰',
    title: 'CPA 급등',
    description: '전환당 비용이 급격히 상승했습니다',
  },
  CTR_DROP: {
    icon: '📉',
    title: 'CTR 급락',
    description: '클릭률이 급격히 하락했습니다',
  },
  IMPRESSION_DROP: {
    icon: '👁️',
    title: '노출 급감',
    description: '광고 노출이 급격히 감소했습니다',
  },
  SPEND_VELOCITY: {
    icon: '⚡',
    title: '예산 과소진',
    description: '예산이 예상보다 빠르게 소진되고 있습니다',
  },
  ROAS_DROP: {
    icon: '📊',
    title: 'ROAS 하락',
    description: '광고 수익률이 급격히 하락했습니다',
  },
  OTHER: {
    icon: '⚠️',
    title: '이상 감지',
    description: '비정상적인 패턴이 감지되었습니다',
  },
};

export function AnomalyAlert({
  type,
  severity,
  metric,
  currentValue,
  previousValue,
  changePercent,
  onDismiss,
  onViewDetails,
}: AnomalyAlertProps) {
  const config = typeConfig[type] || typeConfig.OTHER;
  const isCritical = severity === 'CRITICAL';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4',
        isCritical
          ? 'bg-red-50 border-red-300'
          : 'bg-yellow-50 border-yellow-300'
      )}
    >
      {/* Pulsing indicator for critical */}
      {isCritical && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl',
            isCritical ? 'bg-red-100' : 'bg-yellow-100'
          )}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                'text-sm font-semibold',
                isCritical ? 'text-red-700' : 'text-yellow-700'
              )}
            >
              {config.title}
            </h4>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded',
                isCritical
                  ? 'bg-red-200 text-red-800'
                  : 'bg-yellow-200 text-yellow-800'
              )}
            >
              {isCritical ? '긴급' : '주의'}
            </span>
          </div>

          <p
            className={cn(
              'text-sm mt-1',
              isCritical ? 'text-red-600' : 'text-yellow-600'
            )}
          >
            {config.description}
          </p>

          {/* Metrics */}
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">{metric}: </span>
              <span className="font-medium text-gray-700">
                {previousValue.toFixed(2)}
              </span>
              <span className="mx-1 text-gray-400">→</span>
              <span
                className={cn(
                  'font-medium',
                  isCritical ? 'text-red-600' : 'text-yellow-600'
                )}
              >
                {currentValue.toFixed(2)}
              </span>
            </div>
            <div
              className={cn(
                'font-semibold',
                changePercent >= 0
                  ? 'text-red-600'
                  : 'text-green-600'
              )}
            >
              {changePercent >= 0 ? '+' : ''}
              {changePercent.toFixed(1)}%
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-3">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className={cn(
                  'text-sm font-medium',
                  isCritical
                    ? 'text-red-700 hover:text-red-800'
                    : 'text-yellow-700 hover:text-yellow-800'
                )}
              >
                자세히 보기 →
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface AnomalyBannerProps {
  anomalyCount: number;
  criticalCount: number;
  onClick?: () => void;
}

export function AnomalyBanner({
  anomalyCount,
  criticalCount,
  onClick,
}: AnomalyBannerProps) {
  if (anomalyCount === 0) return null;

  const hasCritical = criticalCount > 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors',
        hasCritical
          ? 'bg-red-100 hover:bg-red-200'
          : 'bg-yellow-100 hover:bg-yellow-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{hasCritical ? '🚨' : '⚠️'}</span>
        <span
          className={cn(
            'text-sm font-medium',
            hasCritical ? 'text-red-700' : 'text-yellow-700'
          )}
        >
          {criticalCount > 0
            ? `${criticalCount}개의 긴급 이상 감지`
            : `${anomalyCount}개의 이상 징후 감지`}
        </span>
      </div>
      <span
        className={cn(
          'text-sm',
          hasCritical ? 'text-red-600' : 'text-yellow-600'
        )}
      >
        확인하기 →
      </span>
    </div>
  );
}

export interface AnomalySummaryProps {
  anomalies: Array<{
    type: string;
    severity: string;
    metric: string;
    changePercent: number;
  }>;
}

export function AnomalySummary({ anomalies }: AnomalySummaryProps) {
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL');
  const warningAnomalies = anomalies.filter((a) => a.severity === 'WARNING');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">이상 탐지 요약</h3>

      {anomalies.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">이상 징후가 없습니다</span>
        </div>
      ) : (
        <div className="space-y-2">
          {criticalAnomalies.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
              <span className="text-sm text-red-700 font-medium">
                🚨 긴급 ({criticalAnomalies.length})
              </span>
              <span className="text-xs text-red-600">
                {criticalAnomalies.map((a) => a.metric).join(', ')}
              </span>
            </div>
          )}
          {warningAnomalies.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
              <span className="text-sm text-yellow-700 font-medium">
                ⚠️ 주의 ({warningAnomalies.length})
              </span>
              <span className="text-xs text-yellow-600">
                {warningAnomalies.map((a) => a.metric).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
