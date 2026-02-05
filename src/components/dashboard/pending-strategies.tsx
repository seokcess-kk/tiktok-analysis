'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  Palette,
  DollarSign,
  Crosshair,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface PendingStrategy {
  id: string;
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    changePercent: number;
  };
  createdAt: string;
}

interface PendingStrategiesProps {
  strategies: PendingStrategy[];
  accountId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  limit?: number;
}

const typeConfig = {
  BUDGET: { icon: DollarSign, label: '예산', color: 'bg-green-100 text-green-800' },
  CAMPAIGN: { icon: Target, label: '캠페인', color: 'bg-blue-100 text-blue-800' },
  TARGETING: { icon: Crosshair, label: '타겟팅', color: 'bg-purple-100 text-purple-800' },
  CREATIVE: { icon: Palette, label: '소재', color: 'bg-pink-100 text-pink-800' },
  BIDDING: { icon: TrendingUp, label: '입찰', color: 'bg-orange-100 text-orange-800' },
};

const priorityConfig = {
  HIGH: { label: '높음', color: 'bg-red-100 text-red-800' },
  MEDIUM: { label: '중간', color: 'bg-yellow-100 text-yellow-800' },
  LOW: { label: '낮음', color: 'bg-gray-100 text-gray-800' },
};

export function PendingStrategies({
  strategies,
  accountId,
  onAccept,
  onReject,
  limit = 5,
}: PendingStrategiesProps) {
  const displayStrategies = strategies.slice(0, limit);

  if (displayStrategies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            대기 중인 전략
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>검토가 필요한 전략이 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          대기 중인 전략 ({strategies.length})
        </CardTitle>
        <Link href={`/accounts/${accountId}/strategies`}>
          <Button variant="ghost" size="sm">
            전체 보기
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayStrategies.map((strategy) => {
          const type = typeConfig[strategy.type];
          const priority = priorityConfig[strategy.priority];
          const TypeIcon = type.icon;

          return (
            <div key={strategy.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{strategy.title}</span>
                </div>
                <div className="flex gap-1">
                  <Badge className={type.color} variant="outline">
                    {type.label}
                  </Badge>
                  <Badge className={priority.color} variant="outline">
                    {priority.label}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {strategy.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">예상 효과: </span>
                  <span
                    className={
                      strategy.expectedImpact.changePercent >= 0
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {strategy.expectedImpact.changePercent >= 0 ? '+' : ''}
                    {strategy.expectedImpact.changePercent.toFixed(1)}%{' '}
                    {strategy.expectedImpact.metric}
                  </span>
                </div>

                {(onAccept || onReject) && (
                  <div className="flex gap-2">
                    {onReject && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject(strategy.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {onAccept && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAccept(strategy.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
