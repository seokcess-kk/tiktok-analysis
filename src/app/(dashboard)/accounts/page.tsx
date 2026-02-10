'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, TrendingUp, TrendingDown, Minus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  tiktokAdvId: string;
  status: string;
  client: { name: string; industry: string | null };
  _count: { campaigns: number; insights: number };
}

// Mock metrics for now - will be replaced with real data sync
function getMockMetrics() {
  return {
    spend: Math.floor(Math.random() * 20000000) + 5000000,
    roas: Math.round((Math.random() * 3 + 1.5) * 10) / 10,
    cpa: Math.floor(Math.random() * 15000) + 5000,
    change: {
      spend: Math.round((Math.random() * 20 - 10) * 10) / 10,
      roas: Math.round((Math.random() * 10 - 5) * 10) / 10,
      cpa: Math.round((Math.random() * 10 - 5) * 10) / 10,
    },
  };
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center text-green-600 text-sm">
        <TrendingUp className="h-4 w-4 mr-1" />
        +{value.toFixed(1)}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center text-red-600 text-sm">
        <TrendingDown className="h-4 w-4 mr-1" />
        {value.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-sm">
      <Minus className="h-4 w-4 mr-1" />
      0%
    </span>
  );
}

function StatusMessage({ searchParams }: { searchParams: URLSearchParams }) {
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const count = searchParams.get('count');

  if (success) {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
        <CheckCircle className="h-5 w-5" />
        <span>TikTok 계정 {count || 1}개가 연동되었습니다!</span>
      </div>
    );
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      oauth_config_error: 'TikTok OAuth 설정 오류입니다.',
      no_auth_code: '인증 코드를 받지 못했습니다.',
      state_mismatch: '보안 검증에 실패했습니다.',
      no_advertiser: '연결된 광고 계정이 없습니다.',
    };
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <AlertCircle className="h-5 w-5" />
        <span>{errorMessages[error] || `오류: ${error}`}</span>
      </div>
    );
  }

  return null;
}

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    setConnecting(true);
    window.location.href = '/api/auth/tiktok';
  }

  // Generate mock metrics for each account (temporary until data sync is implemented)
  const accountsWithMetrics = accounts.map((account) => ({
    ...account,
    metrics: getMockMetrics(),
  }));

  const totalSpend = accountsWithMetrics.reduce((sum, a) => sum + a.metrics.spend, 0);
  const avgRoas = accountsWithMetrics.length > 0
    ? accountsWithMetrics.reduce((sum, a) => sum + a.metrics.roas, 0) / accountsWithMetrics.length
    : 0;
  const criticalCount = accountsWithMetrics.reduce((sum, a) => sum + a._count.insights, 0);

  return (
    <div className="space-y-6">
      {/* Status Message */}
      <StatusMessage searchParams={searchParams} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">광고 계정</h1>
          <p className="text-muted-foreground">
            연동된 TikTok Ads 계정을 관리하고 성과를 확인하세요
          </p>
        </div>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {connecting ? '연결 중...' : '계정 연동'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 계정</CardDescription>
            <CardTitle className="text-3xl">{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 지출 (7일)</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(totalSpend)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 ROAS</CardDescription>
            <CardTitle className="text-3xl">
              {avgRoas.toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>읽지 않은 인사이트</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {criticalCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && accounts.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">연결된 계정이 없습니다</h3>
            <p className="text-muted-foreground">
              TikTok Ads 계정을 연동하여 광고 성과를 분석하세요
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              TikTok 계정 연동하기
            </Button>
          </div>
        </Card>
      )}

      {/* Account List */}
      {!loading && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accountsWithMetrics.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription>
                          {account.client.name} · {account.client.industry || '미분류'}
                        </CardDescription>
                      </div>
                    </div>
                    {account._count.insights > 0 && (
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                        {account._count.insights} 인사이트
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">지출</p>
                      <p className="font-semibold">
                        {formatCurrency(account.metrics.spend)}
                      </p>
                      <ChangeIndicator value={account.metrics.change.spend} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ROAS</p>
                      <p className="font-semibold">{account.metrics.roas}x</p>
                      <ChangeIndicator value={account.metrics.change.roas} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPA</p>
                      <p className="font-semibold">
                        {formatCurrency(account.metrics.cpa)}
                      </p>
                      <ChangeIndicator value={-account.metrics.change.cpa} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
