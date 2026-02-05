'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  StrategyList,
  StrategySummary,
  type Strategy,
} from '@/components/ai/strategy-card';
import {
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Palette,
  DollarSign,
  Crosshair,
  Filter,
} from 'lucide-react';

interface StrategiesResponse {
  success: boolean;
  data: {
    strategies: Strategy[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
    summary: {
      total: number;
      byStatus: Record<string, number>;
      pendingByPriority: Record<string, number>;
    };
  };
}

interface GenerateResponse {
  success: boolean;
  data: {
    strategies: Strategy[];
    summary: {
      total: number;
      byPriority: Record<string, number>;
    };
  };
}

export default function StrategiesPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {} as Record<string, number>,
    pendingByPriority: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Fetch strategies
  const fetchStrategies = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      if (typeFilter !== 'all') queryParams.set('type', typeFilter);
      if (priorityFilter !== 'all') queryParams.set('priority', priorityFilter);

      const res = await fetch(
        `/api/ai/strategies/${accountId}?${queryParams.toString()}`
      );
      const data: StrategiesResponse = await res.json();

      if (data.success) {
        setStrategies(data.data.strategies);
        setSummary(data.data.summary);
      } else {
        setError('전략 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('전략 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Generate new strategies
  const handleGenerate = async (type?: string) => {
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch(`/api/ai/strategies/${accountId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data: GenerateResponse = await res.json();

      if (data.success) {
        // Refresh the list
        await fetchStrategies();
      } else {
        setError('전략 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('전략 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // Update strategy status
  const updateStrategy = async (
    strategyId: string,
    action: string,
    data?: Record<string, any>
  ) => {
    try {
      const res = await fetch(`/api/ai/strategies/${accountId}/${strategyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await res.json();

      if (result.success) {
        await fetchStrategies();
      } else {
        setError('전략 상태 업데이트에 실패했습니다.');
      }
    } catch (err) {
      setError('전략 상태 업데이트에 실패했습니다.');
    }
  };

  const handleAccept = (id: string) => updateStrategy(id, 'accept');
  const handleReject = (id: string, reason: string) =>
    updateStrategy(id, 'reject', { rejectedReason: reason });
  const handleStart = (id: string) => updateStrategy(id, 'start');
  const handleComplete = (id: string, result: string) =>
    updateStrategy(id, 'complete', { actualResult: result });

  useEffect(() => {
    fetchStrategies();
  }, [accountId, statusFilter, typeFilter, priorityFilter]);

  // Filter strategies by type for tabs
  const getStrategiesByType = (type: string) => {
    if (type === 'all') return strategies;
    return strategies.filter((s) => s.type === type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 전략 추천</h1>
          <p className="text-muted-foreground">
            AI가 분석한 최적화 전략을 검토하고 실행하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchStrategies()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            새로고침
          </Button>
          <Button onClick={() => handleGenerate()} disabled={generating}>
            <Sparkles
              className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`}
            />
            {generating ? '생성 중...' : '전략 생성'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <StrategySummary summary={summary} />

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="PENDING">검토 대기</SelectItem>
            <SelectItem value="ACCEPTED">수락됨</SelectItem>
            <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="REJECTED">거절됨</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="우선순위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 우선순위</SelectItem>
            <SelectItem value="HIGH">높음</SelectItem>
            <SelectItem value="MEDIUM">중간</SelectItem>
            <SelectItem value="LOW">낮음</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="BUDGET">예산</SelectItem>
            <SelectItem value="CREATIVE">소재</SelectItem>
            <SelectItem value="TARGETING">타겟팅</SelectItem>
            <SelectItem value="BIDDING">입찰</SelectItem>
            <SelectItem value="CAMPAIGN">캠페인</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Strategy Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Target className="h-4 w-4" />
            전체 ({strategies.length})
          </TabsTrigger>
          <TabsTrigger value="BUDGET" className="gap-2">
            <DollarSign className="h-4 w-4" />
            예산 ({getStrategiesByType('BUDGET').length})
          </TabsTrigger>
          <TabsTrigger value="CREATIVE" className="gap-2">
            <Palette className="h-4 w-4" />
            소재 ({getStrategiesByType('CREATIVE').length})
          </TabsTrigger>
          <TabsTrigger value="TARGETING" className="gap-2">
            <Crosshair className="h-4 w-4" />
            타겟팅 ({getStrategiesByType('TARGETING').length})
          </TabsTrigger>
          <TabsTrigger value="BIDDING" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            입찰 ({getStrategiesByType('BIDDING').length})
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <StrategyList
                strategies={strategies}
                onAccept={handleAccept}
                onReject={handleReject}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            </TabsContent>
            <TabsContent value="BUDGET">
              <StrategyList
                strategies={getStrategiesByType('BUDGET')}
                onAccept={handleAccept}
                onReject={handleReject}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            </TabsContent>
            <TabsContent value="CREATIVE">
              <StrategyList
                strategies={getStrategiesByType('CREATIVE')}
                onAccept={handleAccept}
                onReject={handleReject}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            </TabsContent>
            <TabsContent value="TARGETING">
              <StrategyList
                strategies={getStrategiesByType('TARGETING')}
                onAccept={handleAccept}
                onReject={handleReject}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            </TabsContent>
            <TabsContent value="BIDDING">
              <StrategyList
                strategies={getStrategiesByType('BIDDING')}
                onAccept={handleAccept}
                onReject={handleReject}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Quick Generate Buttons */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium mb-3">빠른 전략 생성</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate('BUDGET')}
            disabled={generating}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            예산 전략
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate('CREATIVE')}
            disabled={generating}
          >
            <Palette className="h-4 w-4 mr-1" />
            소재 전략
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate('TARGETING')}
            disabled={generating}
          >
            <Crosshair className="h-4 w-4 mr-1" />
            타겟팅 전략
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate('BIDDING')}
            disabled={generating}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            입찰 전략
          </Button>
        </div>
      </div>
    </div>
  );
}
