'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

export type NavigationLevel = 'main' | 'account' | 'campaign' | 'adgroup' | 'ad';

export interface NavigationContext {
  level: NavigationLevel;
  accountId: string | null;
  campaignId: string | null;
  adGroupId: string | null;
  adId: string | null;
}

export function useNavigationContext(): NavigationContext {
  const pathname = usePathname();

  return useMemo(() => {
    const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
    const campaignMatch = pathname?.match(/\/campaigns\/([^\/]+)/);
    const adGroupMatch = pathname?.match(/\/adgroups\/([^\/]+)/);
    const adMatch = pathname?.match(/\/ads\/([^\/]+)/);

    const accountId = accountMatch?.[1] || null;
    const campaignId = campaignMatch?.[1] || null;
    const adGroupId = adGroupMatch?.[1] || null;
    const adId = adMatch?.[1] || null;

    let level: NavigationLevel = 'main';
    if (adId) level = 'ad';
    else if (adGroupId) level = 'adgroup';
    else if (campaignId) level = 'campaign';
    else if (accountId) level = 'account';

    return { level, accountId, campaignId, adGroupId, adId };
  }, [pathname]);
}
