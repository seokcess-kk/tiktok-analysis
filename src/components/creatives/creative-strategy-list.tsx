'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp,
  RefreshCw,
  Scissors,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Target,
} from 'lucide-react';

export interface CreativeStrategyData {
  id: string;
  type: 'SCALE' | 'OPTIMIZE' | 'REPLACE' | 'TEST';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: {
    action: string;
    reason: string;
    expectedImpact: string;
  }[];
  estimatedImpact: {
    metric: string;
    changePercent: number;
    confidence: number;
  };
  status?: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdAt?: string;
}

interface CreativeStrategyCardProps {
  strategy: CreativeStrategyData;
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onStart?: (id: string) => void;
  compact?: boolean;
}

const typeConfig = {
  SCALE: {
    icon: TrendingUp,
    label: '확장',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  OPTIMIZE: {
    icon: RefreshCw,
    label: '최적화',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  REPLACE: {
    icon: Scissors,
    label: '교체',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  TEST: {
    icon: FlaskConical,
    label: '테스트',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

const priorityConfig = {
  HIGH: {
    label: '높음',
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  MEDIUM: {
    label: '중간',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  LOW: {
    label: '낮음',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
  },
};

const statusConfig = {
  PENDING: { label: '대기 중', icon: Clock, color: 'text-gray-600' },
  ACCEPTED: { label: '수락됨', icon: CheckCircle2, color: 'text-blue-600' },
  IN_PROGRESS: { label: '진행 중', icon: Loader2, color: 'text-yellow-600' },
  COMPLETED: { label: '완료', icon: CheckCircle2, color: 'text-green-600' },
  REJECTED: { label: '거절됨', icon: XCircle, color: 'text-red-600' },
};

export function CreativeStrategyCard({
  strategy,
  onAccept,
  onReject,
  onStart,
  compact = false,
}: CreativeStrategyCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const typeInfo = typeConfig[strategy.type];
  const priorityInfo = priorityConfig[strategy.priority];
  const statusInfo = strategy.status ? statusConfig[strategy.status] : null;
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo?.icon;

  const handleReject = () => {
    if (onReject && rejectReason.trim()) {
      onReject(strategy.id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  const isPending = strategy.status === 'PENDING' || !strategy.status;
  const isAccepted = strategy.status === 'ACCEPTED';

  return (
    <>
      <Card className={cn(
        'transition-all',
        compact && 'border-l-4',
        strategy.priority === 'HIGH' && 'border-l-red-500',
        strategy.priority === 'MEDIUM' && 'border-l-yellow-500',
        strategy.priority === 'LOW' && 'border-l-gray-400',
      )}>
        <CardHeader className={cn('pb-2', compact && 'py-3')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className={cn('p-1.5 rounded-md', typeInfo.bgColor)}>
                <TypeIcon className={cn('h-4 w-4', typeInfo.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {strategy.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn('h-2 w-2 rounded-full', priorityInfo.dot)} />
                  <span className="text-xs text-muted-foreground">
                    {priorityInfo.label} 우선순위
                  </span>
                  {statusInfo && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={cn('text-xs flex items-center gap-1', statusInfo.color)}>
                        {StatusIcon && <StatusIcon className="h-3 w-3" />}
                        {statusInfo.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        {(expanded || !compact) && (
          <CardContent className={cn('pt-0', compact && 'pb-3')}>
            <p className="text-sm text-muted-foreground mb-3">
              {strategy.description}
            </p>

            {/* Action Items */}
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">실행 항목</p>
              <div className="space-y-2">
                {strategy.actionItems.map((item, i) => (
                  <div key={i} className="bg-muted/50 rounded-md p-2">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.reason}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          예상: {item.expectedImpact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Impact */}
            <div className="mb-3 p-3 bg-muted/50 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">예상 효과</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">{strategy.estimatedImpact.metric}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-lg font-bold',
                    strategy.estimatedImpact.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {strategy.estimatedImpact.changePercent > 0 ? '+' : ''}
                    {strategy.estimatedImpact.changePercent}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (신뢰도 {strategy.estimatedImpact.confidence}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(isPending || isAccepted) && (
              <div className="flex items-center gap-2 pt-2 border-t">
                {isPending && onAccept && (
                  <Button
                    size="sm"
                    onClick={() => onAccept(strategy.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    수락
                  </Button>
                )}
                {isAccepted && onStart && (
                  <Button
                    size="sm"
                    onClick={() => onStart(strategy.id)}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    시작
                  </Button>
                )}
                {isPending && onReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    거절
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전략 거절</DialogTitle>
            <DialogDescription>
              이 전략을 거절하는 이유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="거절 사유를 입력하세요..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              취소
            </Button>
            <Button onClick={handleReject} disabled={!rejectReason.trim()}>
              거절 확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CreativeStrategyListProps {
  strategies: CreativeStrategyData[];
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onStart?: (id: string) => void;
  loading?: boolean;
}

export function CreativeStrategyList({
  strategies,
  onAccept,
  onReject,
  onStart,
  loading = false,
}: CreativeStrategyListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>생성된 전략이 없습니다.</p>
          <p className="text-sm">먼저 인사이트를 생성하세요.</p>
        </CardContent>
      </Card>
    );
  }

  // 우선순위별 정렬
  const sortedStrategies = [...strategies].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-3">
      {sortedStrategies.map(strategy => (
        <CreativeStrategyCard
          key={strategy.id}
          strategy={strategy}
          onAccept={onAccept}
          onReject={onReject}
          onStart={onStart}
          compact
        />
      ))}
    </div>
  );
}
