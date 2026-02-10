'use client';

import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 p-4 bg-muted/50 rounded-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
