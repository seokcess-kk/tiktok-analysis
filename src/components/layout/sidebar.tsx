'use client';

import { useMemo } from 'react';
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
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    {
      label: '광고그룹',
      href: `/accounts/${accountId}/campaigns/${campaignId}/adgroups`,
      icon: <Layers className="h-5 w-5" />,
    },
  ];
}

interface SidebarProps {
  accountId?: string;
}

export function Sidebar({ accountId }: SidebarProps) {
  const pathname = usePathname();

  // pathname에서 직접 accountId와 campaignId 추출
  const { currentAccountId, currentCampaignId } = useMemo(() => {
    const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
    const campaignMatch = pathname?.match(/\/accounts\/([^\/]+)\/campaigns\/([^\/]+)/);

    return {
      currentAccountId: accountId || accountMatch?.[1] || null,
      currentCampaignId: campaignMatch?.[2] || null,
    };
  }, [pathname, accountId]);

  const navItems = useMemo(() => {
    if (currentAccountId && currentCampaignId) {
      return getCampaignNavItems(currentAccountId, currentCampaignId);
    }
    return currentAccountId
      ? getAccountNavItems(currentAccountId)
      : mainNavItems;
  }, [currentAccountId, currentCampaignId]);

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
