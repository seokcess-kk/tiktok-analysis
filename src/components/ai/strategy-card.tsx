'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  Palette,
  DollarSign,
  Crosshair,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export interface ActionItem {
  action: string;
  target: string;
  targetId?: string;
  currentValue?: string | number;
  suggestedValue?: string | number;
  reason: string;
}

export interface ExpectedImpact {
  metric: string;
  currentValue: number;
  expectedValue: number;
  changePercent: number;
  confidence: number;
}

export interface Strategy {
  id: string;
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: ActionItem[];
  expectedImpact: ExpectedImpact;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  acceptedAt?: string;
  completedAt?: string;
  rejectedReason?: string;
  actualResult?: string;
  createdAt: string;
  linkedInsight?: {
    id: string;
    type: string;
    title: string;
    severity: string;
  };
}

interface StrategyCardProps {
  strategy: Strategy;
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string, result: string) => void;
  expanded?: boolean;
}

const typeConfig = {
  BUDGET: {
    icon: DollarSign,
    label: '예산 최적화',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  CAMPAIGN: {
    icon: Target,
    label: '캠페인 전략',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  TARGETING: {
    icon: Crosshair,
    label: '타겟팅 최적화',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  CREATIVE: {
    icon: Palette,
    label: '소재 전략',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  BIDDING: {
    icon: TrendingUp,
    label: '입찰 최적화',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
};

const priorityConfig = {
  HIGH: {
    label: '높음',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: '중간',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
  },
  LOW: {
    label: '낮음',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Lightbulb,
  },
};

const difficultyConfig = {
  EASY: { label: '쉬움', color: 'text-green-600' },
  MEDIUM: { label: '보통', color: 'text-yellow-600' },
  HARD: { label: '어려움', color: 'text-red-600' },
};

const statusConfig = {
  PENDING: {
    label: '검토 대기',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
  },
  ACCEPTED: {
    label: '수락됨',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: '진행 중',
    color: 'bg-yellow-100 text-yellow-800',
    icon: PlayCircle,
  },
  COMPLETED: {
    label: '완료',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: '거절됨',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

export function StrategyCard({
  strategy,
  onAccept,
  onReject,
  onStart,
  onComplete,
  expanded: initialExpanded = false,
}: StrategyCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [rejectReason, setRejectReason] = useState('');
  const [completionResult, setCompletionResult] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showCompleteInput, setShowCompleteInput] = useState(false);

  const type = typeConfig[strategy.type];
  const priority = priorityConfig[strategy.priority];
  const difficulty = difficultyConfig[strategy.difficulty];
  const status = statusConfig[strategy.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  const handleAccept = () => {
    onAccept?.(strategy.id);
  };

  const handleReject = () => {
    if (showRejectInput && rejectReason) {
      onReject?.(strategy.id, rejectReason);
      setShowRejectInput(false);
      setRejectReason('');
    } else {
      setShowRejectInput(true);
    }
  };

  const handleStart = () => {
    onStart?.(strategy.id);
  };

  const handleComplete = () => {
    if (showCompleteInput) {
      onComplete?.(strategy.id, completionResult);
      setShowCompleteInput(false);
      setCompletionResult('');
    } else {
      setShowCompleteInput(true);
    }
  };

  return (
    <Card className={cn('transition-all', expanded && 'ring-2 ring-primary/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', type.bgColor)}>
              <TypeIcon className={cn('h-5 w-5', type.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">{strategy.title}</CardTitle>
              <CardDescription className="mt-1">{type.label}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priority.color}>
              {priority.label} 우선순위
            </Badge>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>

        {/* Expected Impact */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium mb-2">예상 효과</h4>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">
                {strategy.expectedImpact.metric}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-semibold">
                  {strategy.expectedImpact.currentValue.toLocaleString()}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-lg font-semibold text-green-600">
                  {strategy.expectedImpact.expectedValue.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  'text-2xl font-bold',
                  strategy.expectedImpact.changePercent >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {strategy.expectedImpact.changePercent >= 0 ? '+' : ''}
                {strategy.expectedImpact.changePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                신뢰도 {(strategy.expectedImpact.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Action Items */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          실행 항목 {strategy.actionItems.length}개
        </button>

        {expanded && (
          <div className="mt-4 space-y-3">
            {strategy.actionItems.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 bg-background"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-sm">{item.action}</div>
                  <Badge variant="outline" className="text-xs">
                    {item.target}
                  </Badge>
                </div>
                {(item.currentValue || item.suggestedValue) && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    {item.currentValue && (
                      <span className="text-muted-foreground">
                        현재: {item.currentValue}
                      </span>
                    )}
                    {item.currentValue && item.suggestedValue && (
                      <span className="text-muted-foreground">→</span>
                    )}
                    {item.suggestedValue && (
                      <span className="text-green-600 font-medium">
                        제안: {item.suggestedValue}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Linked Insight */}
        {strategy.linkedInsight && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-1">연결된 인사이트</div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{strategy.linkedInsight.title}</span>
            </div>
          </div>
        )}

        {/* Reject Input */}
        {showRejectInput && (
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-medium">거절 사유</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="전략을 거절하는 이유를 입력해주세요..."
              className="mt-2 w-full rounded-md border p-2 text-sm"
              rows={2}
            />
          </div>
        )}

        {/* Complete Input */}
        {showCompleteInput && (
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-medium">실행 결과</label>
            <textarea
              value={completionResult}
              onChange={(e) => setCompletionResult(e.target.value)}
              placeholder="전략 실행 후 결과를 입력해주세요..."
              className="mt-2 w-full rounded-md border p-2 text-sm"
              rows={2}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex justify-between items-center">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={difficulty.color}>난이도: {difficulty.label}</span>
          <span>
            생성: {new Date(strategy.createdAt).toLocaleDateString('ko-KR')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {strategy.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                {showRejectInput ? '확인' : '거절'}
              </Button>
              <Button size="sm" onClick={handleAccept}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                수락
              </Button>
            </>
          )}
          {strategy.status === 'ACCEPTED' && (
            <Button size="sm" onClick={handleStart}>
              <PlayCircle className="h-4 w-4 mr-1" />
              시작
            </Button>
          )}
          {strategy.status === 'IN_PROGRESS' && (
            <Button size="sm" onClick={handleComplete}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {showCompleteInput ? '저장' : '완료'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Strategy List Component
interface StrategyListProps {
  strategies: Strategy[];
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string, result: string) => void;
}

export function StrategyList({
  strategies,
  onAccept,
  onReject,
  onStart,
  onComplete,
}: StrategyListProps) {
  if (strategies.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          전략이 없습니다
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          AI 전략 생성을 통해 새로운 전략을 만들어보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <StrategyCard
          key={strategy.id}
          strategy={strategy}
          onAccept={onAccept}
          onReject={onReject}
          onStart={onStart}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}

// Strategy Summary Component
interface StrategySummaryProps {
  summary: {
    total: number;
    byStatus: Record<string, number>;
    pendingByPriority: Record<string, number>;
  };
}

export function StrategySummary({ summary }: StrategySummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.total}</div>
          <p className="text-xs text-muted-foreground">전체 전략</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-yellow-600">
            {summary.byStatus.PENDING || 0}
          </div>
          <p className="text-xs text-muted-foreground">검토 대기</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">
            {summary.byStatus.IN_PROGRESS || 0}
          </div>
          <p className="text-xs text-muted-foreground">진행 중</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">
            {summary.byStatus.COMPLETED || 0}
          </div>
          <p className="text-xs text-muted-foreground">완료</p>
        </CardContent>
      </Card>
    </div>
  );
}
