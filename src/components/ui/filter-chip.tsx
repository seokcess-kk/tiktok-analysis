'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 pl-2 pr-1 py-1 text-xs font-normal',
        'hover:bg-secondary/80 transition-colors',
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        aria-label={`${label} 필터 제거`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface ActiveFiltersProps {
  filters: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({
  filters,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          value={filter.value}
          onRemove={() => onRemove(filter.key)}
        />
      ))}
      {filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          모두 지우기
        </Button>
      )}
    </div>
  );
}
