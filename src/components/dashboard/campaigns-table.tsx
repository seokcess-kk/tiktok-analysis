'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/common/skeleton-loader';
import { NoDataFound } from '@/components/common/empty-state';
import { ColumnCustomizer, useColumnVisibility, type ColumnConfig } from '@/components/common/column-customizer';
import { formatCurrency } from '@/lib/utils';
import { ArrowUpDown, ChevronRight, Loader2 } from 'lucide-react';

type CampaignColumnId = 'name' | 'status' | 'spend' | 'impressions' | 'clicks' | 'conversions' | 'ctr' | 'cvr' | 'cpa' | 'roas';

const defaultColumns: ColumnConfig[] = [
  { id: 'name', label: '캠페인명', visible: true, locked: true },
  { id: 'status', label: '상태', visible: true },
  { id: 'spend', label: '지출', visible: true },
  { id: 'impressions', label: '노출수', visible: true },
  { id: 'clicks', label: '클릭수', visible: true },
  { id: 'conversions', label: '전환수', visible: true },
  { id: 'ctr', label: 'CTR', visible: true },
  { id: 'cvr', label: 'CVR', visible: false },
  { id: 'cpa', label: 'CPA', visible: false },
  { id: 'roas', label: 'ROAS', visible: true },
];

interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

interface Campaign {
  id: string;
  tiktokCampaignId: string;
  name: string;
  status: string;
  objective: string;
  budget: number | null;
  adGroupCount: number;
  metrics: CampaignMetrics;
}

interface CampaignsTableProps {
  accountId: string;
  onCampaignSelect?: (campaign: Campaign) => void;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  DELETED: 'destructive',
  PENDING: 'outline',
};

const statusLabels: Record<string, string> = {
  ACTIVE: '운영중',
  PAUSED: '일시정지',
  DELETED: '삭제됨',
  PENDING: '대기중',
};

export function CampaignsTable({ accountId, onCampaignSelect }: CampaignsTableProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<CampaignColumnId>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { columns, setColumns, isVisible } = useColumnVisibility<CampaignColumnId>(
    defaultColumns,
    'campaigns-table-columns'
  );

  // 캠페인 클릭 시 캠페인 상세 페이지로 이동
  const handleCampaignClick = (campaign: Campaign) => {
    if (onCampaignSelect) {
      onCampaignSelect(campaign);
    }
    router.push(`/accounts/${accountId}/campaigns/${campaign.id}`);
  };

  useEffect(() => {
    fetchCampaigns();
  }, [accountId, sortField, sortOrder]);

  async function fetchCampaigns() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accounts/${accountId}/campaigns?sort=${sortField}&order=${sortOrder}`
      );
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: CampaignColumnId) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }

  function SortableHeader({ field, children }: { field: CampaignColumnId; children: React.ReactNode }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => handleSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <NoDataFound
        title="캠페인이 없습니다"
        description="이 계정에 연결된 캠페인이 없습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnCustomizer
          columns={columns}
          onChange={setColumns}
          storageKey="campaigns-table-columns"
        />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {isVisible('name') && (
                <TableHead className="w-[300px]">
                  <SortableHeader field="name">캠페인명</SortableHeader>
                </TableHead>
              )}
              {isVisible('status') && <TableHead>상태</TableHead>}
              {isVisible('spend') && (
                <TableHead className="text-right">
                  <SortableHeader field="spend">지출</SortableHeader>
                </TableHead>
              )}
              {isVisible('impressions') && (
                <TableHead className="text-right">
                  <SortableHeader field="impressions">노출수</SortableHeader>
                </TableHead>
              )}
              {isVisible('clicks') && (
                <TableHead className="text-right">
                  <SortableHeader field="clicks">클릭수</SortableHeader>
                </TableHead>
              )}
              {isVisible('conversions') && (
                <TableHead className="text-right">
                  <SortableHeader field="conversions">전환수</SortableHeader>
                </TableHead>
              )}
              {isVisible('ctr') && (
                <TableHead className="text-right">
                  <SortableHeader field="ctr">CTR</SortableHeader>
                </TableHead>
              )}
              {isVisible('cvr') && (
                <TableHead className="text-right">
                  <SortableHeader field="cvr">CVR</SortableHeader>
                </TableHead>
              )}
              {isVisible('cpa') && (
                <TableHead className="text-right">
                  <SortableHeader field="cpa">CPA</SortableHeader>
                </TableHead>
              )}
              {isVisible('roas') && (
                <TableHead className="text-right">
                  <SortableHeader field="roas">ROAS</SortableHeader>
                </TableHead>
              )}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleCampaignClick(campaign)}
            >
              {isVisible('name') && (
                <TableCell>
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.objective} · 광고그룹 {campaign.adGroupCount}개
                    </p>
                  </div>
                </TableCell>
              )}
              {isVisible('status') && (
                <TableCell>
                  <Badge variant={statusVariants[campaign.status] || 'outline'}>
                    {statusLabels[campaign.status] || campaign.status}
                  </Badge>
                </TableCell>
              )}
              {isVisible('spend') && (
                <TableCell className="text-right font-medium">
                  {formatCurrency(campaign.metrics.spend)}
                </TableCell>
              )}
              {isVisible('impressions') && (
                <TableCell className="text-right">
                  {campaign.metrics.impressions.toLocaleString()}
                </TableCell>
              )}
              {isVisible('clicks') && (
                <TableCell className="text-right">
                  {campaign.metrics.clicks.toLocaleString()}
                </TableCell>
              )}
              {isVisible('conversions') && (
                <TableCell className="text-right">
                  {campaign.metrics.conversions.toLocaleString()}
                </TableCell>
              )}
              {isVisible('ctr') && (
                <TableCell className="text-right">
                  {campaign.metrics.ctr.toFixed(2)}%
                </TableCell>
              )}
              {isVisible('cvr') && (
                <TableCell className="text-right">
                  {campaign.metrics.cvr.toFixed(2)}%
                </TableCell>
              )}
              {isVisible('cpa') && (
                <TableCell className="text-right">
                  {formatCurrency(campaign.metrics.cpa)}
                </TableCell>
              )}
              {isVisible('roas') && (
                <TableCell className="text-right font-medium">
                  {campaign.metrics.roas.toFixed(2)}x
                </TableCell>
              )}
              <TableCell>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
