'use client';

import { cn } from '@/lib/utils';
import { ActiveFilters } from '@/components/ui/filter-chip';

interface FilterBarProps {
  children: React.ReactNode;
  activeFilters?: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter?: (key: string) => void;
  onResetFilters?: () => void;
  className?: string;
}

export function FilterBar({
  children,
  activeFilters,
  onRemoveFilter,
  onResetFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 p-4 bg-muted/50 rounded-lg'
        )}
      >
        {children}
      </div>
      {activeFilters && activeFilters.length > 0 && onRemoveFilter && onResetFilters && (
        <ActiveFilters
          filters={activeFilters}
          onRemove={onRemoveFilter}
          onClearAll={onResetFilters}
        />
      )}
    </div>
  );
}
