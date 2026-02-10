'use client';

import { useState, useEffect } from 'react';
import { Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // 항상 표시되어야 하는 컬럼
}

interface ColumnCustomizerProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  storageKey?: string; // localStorage 키
}

export function ColumnCustomizer({
  columns,
  onChange,
  storageKey,
}: ColumnCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [localColumns, setLocalColumns] = useState(columns);

  // localStorage에서 설정 불러오기
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedConfig = JSON.parse(saved) as Record<string, boolean>;
          const updatedColumns = columns.map((col) => ({
            ...col,
            visible: savedConfig[col.id] ?? col.visible,
          }));
          setLocalColumns(updatedColumns);
          onChange(updatedColumns);
        } catch {
          // 파싱 실패 시 기본값 사용
        }
      }
    }
  }, [storageKey]);

  const handleToggle = (columnId: string) => {
    const updated = localColumns.map((col) =>
      col.id === columnId && !col.locked
        ? { ...col, visible: !col.visible }
        : col
    );
    setLocalColumns(updated);
    onChange(updated);

    // localStorage에 저장
    if (storageKey) {
      const config = updated.reduce(
        (acc, col) => ({ ...acc, [col.id]: col.visible }),
        {}
      );
      localStorage.setItem(storageKey, JSON.stringify(config));
    }
  };

  const handleReset = () => {
    setLocalColumns(columns);
    onChange(columns);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  const visibleCount = localColumns.filter((col) => col.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">컬럼 설정</span>
          <span className="text-xs text-muted-foreground">
            ({visibleCount}/{localColumns.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">표시할 컬럼</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleReset}
            >
              초기화
            </Button>
          </div>
          <div className="space-y-2">
            {localColumns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  'flex items-center justify-between py-1.5 px-2 rounded-md',
                  column.locked && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Label
                    htmlFor={`col-${column.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
                <Switch
                  id={`col-${column.id}`}
                  checked={column.visible}
                  onCheckedChange={() => handleToggle(column.id)}
                  disabled={column.locked}
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 컬럼 가시성 필터 훅
export function useColumnVisibility<T extends string>(
  defaultColumns: ColumnConfig[],
  storageKey?: string
): {
  columns: ColumnConfig[];
  visibleColumns: T[];
  setColumns: (columns: ColumnConfig[]) => void;
  isVisible: (columnId: T) => boolean;
} {
  const [columns, setColumns] = useState(defaultColumns);

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedConfig = JSON.parse(saved) as Record<string, boolean>;
          setColumns(
            defaultColumns.map((col) => ({
              ...col,
              visible: savedConfig[col.id] ?? col.visible,
            }))
          );
        } catch {
          // 파싱 실패
        }
      }
    }
  }, [storageKey]);

  const visibleColumns = columns
    .filter((col) => col.visible)
    .map((col) => col.id as T);

  const isVisible = (columnId: T) =>
    columns.find((col) => col.id === columnId)?.visible ?? true;

  return { columns, visibleColumns, setColumns, isVisible };
}
