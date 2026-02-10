'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SortDropdown({
  options,
  value,
  onChange,
  placeholder = '정렬',
  className,
}: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[160px]', className)}>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Preset sort options for accounts
export const accountSortOptions: SortOption[] = [
  { value: 'name_asc', label: '이름순' },
  { value: 'spend_desc', label: '지출 높은순' },
  { value: 'spend_asc', label: '지출 낮은순' },
  { value: 'roas_desc', label: 'ROAS 높은순' },
  { value: 'roas_asc', label: 'ROAS 낮은순' },
  { value: 'cpa_asc', label: 'CPA 낮은순' },
  { value: 'updated_desc', label: '최근 업데이트순' },
];

// Preset sort options for creatives
export const creativeSortOptions: SortOption[] = [
  { value: 'score_desc', label: '점수 높은순' },
  { value: 'spend_desc', label: '지출 높은순' },
  { value: 'ctr_desc', label: 'CTR 높은순' },
  { value: 'cvr_desc', label: 'CVR 높은순' },
  { value: 'fatigue_desc', label: '피로도 높은순' },
  { value: 'fatigue_asc', label: '피로도 낮은순' },
];
