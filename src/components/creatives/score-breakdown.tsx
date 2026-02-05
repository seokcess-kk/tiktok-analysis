'use client';

import { cn } from '@/lib/utils';

export interface ScoreBreakdownProps {
  overall: number;
  breakdown: {
    efficiency: number;
    scale: number;
    sustainability: number;
    engagement: number;
  };
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation?: string;
  size?: 'sm' | 'md' | 'lg';
}

const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-500' },
  A: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-500' },
  B: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-500' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-500' },
  D: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-500' },
  F: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-500' },
};

const categoryLabels: Record<string, { label: string; description: string }> = {
  efficiency: { label: '효율성', description: 'CTR, CVR, CPA 기반' },
  scale: { label: '스케일', description: '노출 및 전환 볼륨' },
  sustainability: { label: '지속성', description: '피로도 기반 내구성' },
  engagement: { label: '참여도', description: '영상 시청 지표' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

export function ScoreBreakdown({
  overall,
  breakdown,
  grade,
  recommendation,
  size = 'md',
}: ScoreBreakdownProps) {
  const gradeStyle = gradeColors[grade];

  const sizes = {
    sm: { gradeSize: 'w-12 h-12 text-xl', scoreSize: 'text-2xl', barHeight: 'h-1.5' },
    md: { gradeSize: 'w-16 h-16 text-2xl', scoreSize: 'text-3xl', barHeight: 'h-2' },
    lg: { gradeSize: 'w-20 h-20 text-3xl', scoreSize: 'text-4xl', barHeight: 'h-3' },
  };

  const { gradeSize, scoreSize, barHeight } = sizes[size];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Overall Score Header */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-bold border-4',
            gradeSize,
            gradeStyle.bg,
            gradeStyle.text,
            gradeStyle.border
          )}
        >
          {grade}
        </div>
        <div>
          <p className="text-sm text-gray-500">종합 점수</p>
          <p className={cn('font-bold', scoreSize)}>{overall}</p>
        </div>
      </div>

      {/* Score Breakdown Bars */}
      <div className="space-y-4">
        {(Object.keys(breakdown) as Array<keyof typeof breakdown>).map((key) => {
          const score = breakdown[key];
          const { label, description } = categoryLabels[key];

          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400 ml-2">({description})</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{score}</span>
              </div>
              <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', barHeight)}>
                <div
                  className={cn('h-full rounded-full transition-all duration-500', getScoreColor(score))}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className={cn('mt-4 p-3 rounded-lg', gradeStyle.bg)}>
          <p className={cn('text-sm', gradeStyle.text)}>
            <strong>권장 조치:</strong> {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

export interface ScoreComparisonProps {
  creatives: Array<{
    id: string;
    name: string;
    score: number;
    grade: string;
  }>;
  highlightId?: string;
}

export function ScoreComparison({ creatives, highlightId }: ScoreComparisonProps) {
  // 점수 내림차순 정렬
  const sorted = [...creatives].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sorted.map((c) => c.score), 100);

  return (
    <div className="space-y-2">
      {sorted.map((creative, index) => (
        <div
          key={creative.id}
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg transition-colors',
            creative.id === highlightId && 'bg-blue-50 border border-blue-200'
          )}
        >
          <span className="w-6 text-sm font-medium text-gray-500 text-center">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{creative.name}</p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
              <div
                className={cn('h-full rounded-full', getScoreColor(creative.score))}
                style={{ width: `${(creative.score / maxScore) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{creative.score}</span>
            <span
              className={cn(
                'w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full',
                gradeColors[creative.grade]?.bg || 'bg-gray-100',
                gradeColors[creative.grade]?.text || 'text-gray-700'
              )}
            >
              {creative.grade}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface GradeDistributionProps {
  distribution: Record<string, number>;
}

export function GradeDistribution({ distribution }: GradeDistributionProps) {
  const grades = ['S', 'A', 'B', 'C', 'D', 'F'];
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex gap-1 h-6">
      {grades.map((grade) => {
        const count = distribution[grade] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        if (percentage === 0) return null;

        return (
          <div
            key={grade}
            className={cn(
              'flex items-center justify-center text-xs font-medium rounded',
              gradeColors[grade]?.bg,
              gradeColors[grade]?.text
            )}
            style={{ width: `${percentage}%`, minWidth: count > 0 ? '24px' : '0' }}
            title={`${grade}: ${count}개 (${percentage.toFixed(1)}%)`}
          >
            {percentage >= 10 && grade}
          </div>
        );
      })}
    </div>
  );
}
