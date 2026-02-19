/**
 * React Query 훅 모음
 *
 * API 호출을 위한 커스텀 훅들
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account, Campaign, Insight, Strategy, APIResponse } from '@/types/api';

// ============================================================
// API 호출 헬퍼
// ============================================================

async function fetchAPI<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data: APIResponse<T> = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

async function postAPI<T, B = unknown>(url: string, body?: B): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: APIResponse<T> = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

// ============================================================
// 계정 관련 훅
// ============================================================

/**
 * 계정 목록 조회
 */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAPI<{ accounts: Account[] }>('/api/accounts'),
    select: (data) => data.accounts,
  });
}

/**
 * 계정 상세 조회
 */
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: () => fetchAPI<{ account: Account }>(`/api/accounts/${accountId}`),
    select: (data) => data.account,
    enabled: !!accountId,
  });
}

// ============================================================
// 캠페인 관련 훅
// ============================================================

/**
 * 캠페인 목록 조회
 */
export function useCampaigns(accountId: string) {
  return useQuery({
    queryKey: ['campaigns', accountId],
    queryFn: () => fetchAPI<{ campaigns: Campaign[] }>(`/api/accounts/${accountId}/campaigns`),
    select: (data) => data.campaigns,
    enabled: !!accountId,
  });
}

// ============================================================
// 메트릭 관련 훅
// ============================================================

interface MetricsData {
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
  dailyMetrics: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
}

/**
 * 메트릭 조회
 */
export function useMetrics(accountId: string, days = 7) {
  return useQuery({
    queryKey: ['metrics', accountId, days],
    queryFn: () => fetchAPI<MetricsData>(`/api/accounts/${accountId}/metrics?days=${days}`),
    enabled: !!accountId,
  });
}

// ============================================================
// 인사이트 관련 훅
// ============================================================

/**
 * 인사이트 목록 조회
 */
export function useInsights(accountId: string) {
  return useQuery({
    queryKey: ['insights', accountId],
    queryFn: () => fetchAPI<{ insights: Insight[] }>(`/api/ai/insights/${accountId}`),
    select: (data) => data.insights,
    enabled: !!accountId,
  });
}

/**
 * 인사이트 생성 뮤테이션
 */
export function useGenerateInsights(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: string = 'DAILY_SUMMARY') =>
      postAPI<{ insights: Insight[] }>(`/api/ai/insights/${accountId}/generate`, { type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', accountId] });
    },
  });
}

// ============================================================
// 전략 관련 훅
// ============================================================

/**
 * 전략 목록 조회
 */
export function useStrategies(accountId: string) {
  return useQuery({
    queryKey: ['strategies', accountId],
    queryFn: () => fetchAPI<{ strategies: Strategy[] }>(`/api/ai/strategies/${accountId}`),
    select: (data) => data.strategies,
    enabled: !!accountId,
  });
}

/**
 * 전략 생성 뮤테이션
 */
export function useGenerateStrategies(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type?: string) =>
      postAPI<{ strategies: Strategy[] }>(`/api/ai/strategies/${accountId}/generate`, type ? { type } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies', accountId] });
    },
  });
}

/**
 * 전략 상태 업데이트 뮤테이션
 */
export function useUpdateStrategy(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ strategyId, status }: { strategyId: string; status: string }) =>
      postAPI(`/api/ai/strategies/${accountId}/${strategyId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies', accountId] });
    },
  });
}

// ============================================================
// 크리에이티브 관련 훅
// ============================================================

interface Creative {
  id: string;
  tiktokCreativeId: string;
  type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
  thumbnailUrl: string | null;
  name: string;
  status: string;
  hookScore: number | null;
  fatigueIndex: number | null;
  performanceTrend: string | null;
}

/**
 * 크리에이티브 목록 조회
 */
export function useCreatives(accountId: string) {
  return useQuery({
    queryKey: ['creatives', accountId],
    queryFn: () => fetchAPI<{ creatives: Creative[] }>(`/api/creatives?accountId=${accountId}`),
    select: (data) => data.creatives,
    enabled: !!accountId,
  });
}
