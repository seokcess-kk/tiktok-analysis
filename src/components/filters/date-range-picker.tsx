'use client';

import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const presets = [
  {
    label: '오늘',
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: '어제',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: '최근 7일',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: '최근 14일',
    getValue: () => ({
      from: subDays(new Date(), 13),
      to: new Date(),
    }),
  },
  {
    label: '최근 30일',
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: '이번 달',
    getValue: () => {
      // 로컬 타임존 기준으로 이번 달 1일 계산
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: startOfDay(firstDay),
        to: startOfDay(now),
      };
    },
  },
  {
    label: '지난 달',
    getValue: () => {
      // 로컬 타임존 기준으로 지난 달 계산
      const now = new Date();
      const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: startOfDay(lastMonthFirstDay),
        to: startOfDay(lastMonthLastDay),
      };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const range = preset.getValue();
    onChange?.(range);
    setOpen(false);
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return '날짜 선택';
    }

    if (range.to) {
      return `${format(range.from, 'yyyy.MM.dd', { locale: ko })} - ${format(
        range.to,
        'yyyy.MM.dd',
        { locale: ko }
      )}`;
    }

    return format(range.from, 'yyyy.MM.dd', { locale: ko });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              빠른 선택
            </p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
