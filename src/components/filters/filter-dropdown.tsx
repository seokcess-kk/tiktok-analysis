'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showIcon?: boolean;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  className,
  showIcon = true,
}: FilterDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[160px]', className)}>
        <div className="flex items-center gap-2">
          {showIcon && <Filter className="h-4 w-4 text-muted-foreground" />}
          <SelectValue placeholder={label} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center justify-between gap-2 w-full">
              <span>{option.label}</span>
              {option.count !== undefined && (
                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                  {option.count}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Preset filter options for industries
export const industryOptions: FilterOption[] = [
  { value: 'all', label: '전체 업종' },
  { value: 'fashion', label: '패션' },
  { value: 'beauty', label: '뷰티' },
  { value: 'food', label: '식품' },
  { value: 'tech', label: '테크' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'other', label: '기타' },
];

// Preset filter options for account status
export const statusOptions: FilterOption[] = [
  { value: 'all', label: '모든 상태' },
  { value: 'active', label: '활성' },
  { value: 'paused', label: '일시정지' },
  { value: 'inactive', label: '비활성' },
];

// Preset filter options for insight types
export const insightTypeOptions: FilterOption[] = [
  { value: 'all', label: '전체' },
  { value: 'daily', label: '일간' },
  { value: 'anomaly', label: '이상' },
  { value: 'trend', label: '트렌드' },
  { value: 'creative', label: '소재' },
  { value: 'prediction', label: '예측' },
];

// Preset filter options for insight severity
export const severityOptions: FilterOption[] = [
  { value: 'all', label: '전체' },
  { value: 'critical', label: '긴급' },
  { value: 'warning', label: '주의' },
  { value: 'info', label: '정보' },
];
