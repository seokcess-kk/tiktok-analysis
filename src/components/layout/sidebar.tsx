'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Image,
  Lightbulb,
  Target,
  FileText,
  Settings,
  Bell,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isBackLink?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    label: '대시보드',
    href: '/accounts',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
];

function getAccountNavItems(accountId: string): NavItem[] {
  return [
    {
      label: '개요',
      href: `/accounts/${accountId}`,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: '소재 분석',
      href: `/accounts/${accountId}/creatives`,
      icon: <Image className="h-5 w-5" />,
    },
    {
      label: 'AI 인사이트',
      href: `/accounts/${accountId}/insights`,
      icon: <Lightbulb className="h-5 w-5" />,
    },
    {
      label: 'AI 전략',
      href: `/accounts/${accountId}/strategies`,
      icon: <Target className="h-5 w-5" />,
    },
    {
      label: '리포트',
      href: `/accounts/${accountId}/reports`,
      icon: <FileText className="h-5 w-5" />,
    },
  ];
}

function getCampaignNavItems(accountId: string, campaignId: string): NavItem[] {
  return [
    {
      label: '← 계정으로',
      href: `/accounts/${accountId}`,
      icon: <ArrowLeft className="h-5 w-5" />,
      isBackLink: true,
    },
    {
      label: '캠페인 개요',
      href: `/accounts/${accountId}/campaigns/${campaignId}`,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'AI 인사이트',
      href: `/accounts/${accountId}/campaigns/${campaignId}/insights`,
      icon: <Lightbulb className="h-5 w-5" />,
    },
    {
      label: 'AI 전략',
      href: `/accounts/${accountId}/campaigns/${campaignId}/strategies`,
      icon: <Target className="h-5 w-5" />,
    },
  ];
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface SidebarProps {
  accountId?: string;
}

export function Sidebar({ accountId }: SidebarProps) {
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsOpen, setCampaignsOpen] = useState(true);

  // pathname에서 직접 accountId와 campaignId 추출
  const { currentAccountId, currentCampaignId } = useMemo(() => {
    const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
    const campaignMatch = pathname?.match(/\/accounts\/([^\/]+)\/campaigns\/([^\/]+)/);

    return {
      currentAccountId: accountId || accountMatch?.[1] || null,
      currentCampaignId: campaignMatch?.[2] || null,
    };
  }, [pathname, accountId]);

  // 캠페인 목록 불러오기
  useEffect(() => {
    if (currentAccountId && !currentCampaignId) {
      setLoadingCampaigns(true);
      fetch(`/api/accounts/${currentAccountId}/campaigns?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.campaigns) {
            setCampaigns(data.data.campaigns);
          } else {
            setCampaigns([]);
          }
        })
        .catch(() => setCampaigns([]))
        .finally(() => setLoadingCampaigns(false));
    } else {
      setCampaigns([]);
    }
  }, [currentAccountId, currentCampaignId]);

  const navItems = useMemo(() => {
    if (currentAccountId && currentCampaignId) {
      return getCampaignNavItems(currentAccountId, currentCampaignId);
    }
    return currentAccountId
      ? getAccountNavItems(currentAccountId)
      : mainNavItems;
  }, [currentAccountId, currentCampaignId]);

  // 캠페인 페이지에 있는지 확인
  const isInCampaignPage = currentAccountId && currentCampaignId;

  return (
    <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg tiktok-gradient" />
          <span className="font-bold text-lg">TikTok Ads AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                item.isBackLink
                  ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground border-b mb-2 pb-3'
                  : isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* 캠페인 섹션 - 계정 선택 시에만 표시 */}
        {currentAccountId && !isInCampaignPage && (
          <div className="mt-4 pt-4 border-t">
            <Collapsible open={campaignsOpen} onOpenChange={setCampaignsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  <span>캠페인</span>
                </div>
                {campaignsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {loadingCampaigns ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    캠페인이 없습니다
                  </p>
                ) : (
                  <>
                    {campaigns.map((campaign) => {
                      const campaignHref = `/accounts/${currentAccountId}/campaigns/${campaign.id}`;
                      const isCampaignActive = pathname === campaignHref;
                      return (
                        <Link
                          key={campaign.id}
                          href={campaignHref}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ml-2',
                            isCampaignActive
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              campaign.status === 'ENABLE'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          <span className="truncate">{campaign.name}</span>
                        </Link>
                      );
                    })}
                    {campaigns.length >= 10 && (
                      <Link
                        href={`/accounts/${currentAccountId}?tab=campaigns`}
                        className="flex items-center justify-center text-xs text-primary hover:underline py-2"
                      >
                        모든 캠페인 보기
                      </Link>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 border-t p-4">
        <div className="flex items-center justify-between">
          <Link
            href="/notifications"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            <span>알림</span>
          </Link>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
