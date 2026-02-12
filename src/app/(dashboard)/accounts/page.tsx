'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Loader2, CheckCircle, AlertCircle, Megaphone } from 'lucide-react';
import { FilterBar, SearchInput, FilterDropdown, industryOptions, statusOptions } from '@/components/filters';
import { Badge } from '@/components/ui/badge';

interface Account {
  id: string;
  name: string;
  tiktokAdvId: string;
  status: string;
  client: { name: string; industry: string | null };
  _count: { campaigns: number; insights: number };
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

function AccountsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // URL 기반 필터 상태
  const searchQuery = searchParams.get('q') || '';
  const industryFilter = searchParams.get('industry') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  // URL 파라미터 업데이트 함수
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const setSearchQuery = (value: string) => updateUrlParams({ q: value });
  const setIndustryFilter = (value: string) => updateUrlParams({ industry: value });
  const setStatusFilter = (value: string) => updateUrlParams({ status: value });

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

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          account.client.name.toLowerCase().includes(query)
      );
    }

    // Industry filter
    if (industryFilter !== 'all') {
      result = result.filter(
        (account) => account.client.industry?.toLowerCase() === industryFilter
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((account) => account.status === statusFilter);
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [accounts, searchQuery, industryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Status Message */}
      <StatusMessage searchParams={searchParams} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">광고 계정</h1>
          <p className="text-muted-foreground">
            계정을 선택하여 캠페인을 관리하세요
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

      {/* Filter Bar */}
      <FilterBar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="계정 또는 클라이언트 검색..."
        />
        <FilterDropdown
          label="업종"
          options={industryOptions}
          value={industryFilter}
          onChange={setIndustryFilter}
        />
        <FilterDropdown
          label="상태"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </FilterBar>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">계정 불러오는 중...</span>
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
          {filteredAccounts.length === 0 ? (
            <Card className="col-span-full p-8">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setIndustryFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            </Card>
          ) : (
          filteredAccounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Megaphone className="h-4 w-4" />
                      <span>캠페인 {account._count.campaigns}개</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {account._count.insights > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {account._count.insights} 인사이트
                        </Badge>
                      )}
                      <Badge variant={account.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {account.status === 'ACTIVE' ? '활성' : '비활성'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AccountsContent />
    </Suspense>
  );
}
