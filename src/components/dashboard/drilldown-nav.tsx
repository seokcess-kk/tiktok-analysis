'use client';

import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Building2, FolderKanban, Layers, FileImage } from 'lucide-react';

export interface DrilldownLevel {
  id: string;
  name: string;
  type: 'account' | 'campaign' | 'adgroup' | 'ad';
  href: string;
}

interface DrilldownNavProps {
  levels: DrilldownLevel[];
  className?: string;
}

const typeIcons = {
  account: Building2,
  campaign: FolderKanban,
  adgroup: Layers,
  ad: FileImage,
};

const typeLabels = {
  account: '계정',
  campaign: '캠페인',
  adgroup: '광고그룹',
  ad: '광고',
};

export function DrilldownNav({ levels, className }: DrilldownNavProps) {
  if (levels.length === 0) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {levels.map((level, index) => {
          const Icon = typeIcons[level.type];
          const isLast = index === levels.length - 1;

          return (
            <BreadcrumbItem key={level.id}>
              {!isLast ? (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={level.href} className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{level.name}</span>
                      <span className="sm:hidden">{typeLabels[level.type]}</span>
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span>{level.name}</span>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
