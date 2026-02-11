'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
  action?: () => void;
  actionLabel?: string;
}

interface SetupGuideProps {
  accountId: string;
  campaignCount: number;
  insightCount: number;
  strategyCount: number;
  onGenerateInsights?: () => Promise<void>;
  className?: string;
}

export function SetupGuide({
  accountId,
  campaignCount,
  insightCount,
  strategyCount,
  onGenerateInsights,
  className,
}: SetupGuideProps) {
  const [generating, setGenerating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // 로컬스토리지에서 dismissed 상태 확인
  useEffect(() => {
    const dismissedKey = `setup-guide-dismissed-${accountId}`;
    const isDismissed = localStorage.getItem(dismissedKey);
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, [accountId]);

  const handleDismiss = () => {
    const dismissedKey = `setup-guide-dismissed-${accountId}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  const handleGenerateInsights = async () => {
    if (onGenerateInsights) {
      setGenerating(true);
      try {
        await onGenerateInsights();
      } finally {
        setGenerating(false);
      }
    }
  };

  const steps: SetupStep[] = [
    {
      id: 'connect',
      label: 'TikTok 계정 연동',
      description: '계정이 성공적으로 연동되었습니다',
      completed: true, // 이 컴포넌트가 보인다면 연동 완료
    },
    {
      id: 'campaigns',
      label: '캠페인 데이터 확인',
      description: campaignCount > 0
        ? `${campaignCount}개의 캠페인이 동기화되었습니다`
        : '캠페인 데이터를 동기화 중입니다',
      completed: campaignCount > 0,
      href: `/accounts/${accountId}?tab=campaigns`,
    },
    {
      id: 'insights',
      label: 'AI 인사이트 확인',
      description: insightCount > 0
        ? `${insightCount}개의 인사이트가 생성되었습니다`
        : '인사이트를 생성하세요',
      completed: insightCount > 0,
      href: `/accounts/${accountId}/insights`,
      action: insightCount === 0 && onGenerateInsights ? handleGenerateInsights : undefined,
      actionLabel: '인사이트 생성',
    },
    {
      id: 'strategies',
      label: 'AI 전략 검토',
      description: strategyCount > 0
        ? `${strategyCount}개의 전략이 대기 중입니다`
        : '전략은 인사이트 기반으로 생성됩니다',
      completed: strategyCount > 0,
      href: `/accounts/${accountId}/strategies`,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;

  // 모든 단계 완료 시 자동 숨김
  if (dismissed || allCompleted) {
    return null;
  }

  return (
    <Card className={cn('border-primary/20 bg-primary/5', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">시작 가이드</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            닫기
          </Button>
        </div>
        <CardDescription>
          광고 분석을 시작하기 위한 {steps.length}단계 중 {completedCount}단계 완료
        </CardDescription>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg transition-colors',
              step.completed ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50'
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium text-sm',
                step.completed && 'text-green-700 dark:text-green-400'
              )}>
                {index + 1}. {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
            {!step.completed && step.action && (
              <Button
                size="sm"
                variant="outline"
                onClick={step.action}
                disabled={generating}
                className="shrink-0"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {step.actionLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
            {!step.completed && !step.action && step.href && (
              <Link href={step.href}>
                <Button size="sm" variant="ghost" className="shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {step.completed && step.href && (
              <Link href={step.href}>
                <Button size="sm" variant="ghost" className="shrink-0 text-green-600">
                  보기
                </Button>
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * 데이터 없을 때 표시하는 간단한 안내 카드
 */
interface DataSyncGuideProps {
  type: 'campaigns' | 'insights' | 'strategies';
  onAction?: () => void;
  loading?: boolean;
}

export function DataSyncGuide({ type, onAction, loading }: DataSyncGuideProps) {
  const content = {
    campaigns: {
      title: '캠페인 데이터 동기화',
      description: 'TikTok Ads에서 캠페인 데이터를 가져오는 중입니다. 잠시 후 새로고침 해주세요.',
      actionLabel: '새로고침',
      icon: RefreshCw,
    },
    insights: {
      title: 'AI 인사이트 생성',
      description: '광고 성과를 분석하여 AI 인사이트를 생성합니다. 아래 버튼을 클릭하거나 매일 자동으로 생성됩니다.',
      actionLabel: '인사이트 생성',
      icon: Sparkles,
    },
    strategies: {
      title: 'AI 전략 대기 중',
      description: 'AI 인사이트를 기반으로 전략이 자동 생성됩니다. 먼저 인사이트를 확인해주세요.',
      actionLabel: '인사이트 확인',
      icon: ArrowRight,
    },
  };

  const { title, description, actionLabel, icon: Icon } = content[type];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
        {onAction && (
          <Button onClick={onAction} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Icon className="h-4 w-4 mr-2" />
            )}
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
