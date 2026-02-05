import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

// Mock data - 실제로는 API에서 가져옴
const mockAccounts = [
  {
    id: 'acc_1',
    name: '브랜드 A',
    client: { name: '클라이언트 A', industry: '이커머스' },
    status: 'ACTIVE',
    metrics: {
      spend: 15000000,
      roas: 3.2,
      cpa: 12000,
      change: { spend: 5.2, roas: -2.1, cpa: 3.5 },
    },
    insights: { critical: 1, warning: 3 },
  },
  {
    id: 'acc_2',
    name: '브랜드 B',
    client: { name: '클라이언트 B', industry: '게임' },
    status: 'ACTIVE',
    metrics: {
      spend: 8500000,
      roas: 2.8,
      cpa: 8500,
      change: { spend: -3.1, roas: 5.2, cpa: -8.2 },
    },
    insights: { critical: 0, warning: 2 },
  },
  {
    id: 'acc_3',
    name: '브랜드 C',
    client: { name: '클라이언트 C', industry: '금융' },
    status: 'ACTIVE',
    metrics: {
      spend: 22000000,
      roas: 4.1,
      cpa: 15000,
      change: { spend: 12.5, roas: 1.8, cpa: 2.1 },
    },
    insights: { critical: 0, warning: 1 },
  },
];

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

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">광고 계정</h1>
          <p className="text-muted-foreground">
            연동된 TikTok Ads 계정을 관리하고 성과를 확인하세요
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          계정 연동
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 계정</CardDescription>
            <CardTitle className="text-3xl">{mockAccounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 지출 (7일)</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(
                mockAccounts.reduce((sum, a) => sum + a.metrics.spend, 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 ROAS</CardDescription>
            <CardTitle className="text-3xl">
              {(
                mockAccounts.reduce((sum, a) => sum + a.metrics.roas, 0) /
                mockAccounts.length
              ).toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>주의 필요</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {mockAccounts.reduce((sum, a) => sum + a.insights.critical, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Account List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAccounts.map((account) => (
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
                        {account.client.name} · {account.client.industry}
                      </CardDescription>
                    </div>
                  </div>
                  {account.insights.critical > 0 && (
                    <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                      {account.insights.critical} 긴급
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
    </div>
  );
}
