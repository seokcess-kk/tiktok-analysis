'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface ResponsiveDataViewProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  mobileCardRender?: (item: T) => React.ReactNode;
}

export function ResponsiveDataView<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = '데이터가 없습니다.',
  className,
  onRowClick,
  mobileCardRender,
}: ResponsiveDataViewProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // 모바일: 카드 뷰
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className={cn(
              'rounded-lg border bg-card p-4 shadow-sm',
              onRowClick && 'cursor-pointer hover:bg-accent/50 transition-colors'
            )}
            onClick={() => onRowClick?.(item)}
          >
            {mobileCardRender ? (
              mobileCardRender(item)
            ) : (
              <DefaultMobileCard item={item} columns={columns} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 데스크톱: 테이블 뷰
  return (
    <div className={cn('rounded-md border overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {columns
              .filter((col) => !col.mobileHidden || !isMobile)
              .map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-muted-foreground',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                'border-b last:border-0',
                onRowClick && 'cursor-pointer hover:bg-accent/50 transition-colors'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns
                .filter((col) => !col.mobileHidden || !isMobile)
                .map((col) => (
                  <td key={String(col.key)} className={cn('px-4 py-3', col.className)}>
                    {col.render
                      ? col.render(item)
                      : (item[col.key as keyof T] as React.ReactNode)}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DefaultMobileCard<T>({
  item,
  columns,
}: {
  item: T;
  columns: Column<T>[];
}) {
  // 우선순위가 높은 컬럼을 먼저 표시
  const sortedColumns = [...columns]
    .filter((col) => !col.mobileHidden)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = a.priority || 'medium';
      const bPriority = b.priority || 'medium';
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });

  const primaryColumn = sortedColumns[0];
  const secondaryColumns = sortedColumns.slice(1);

  return (
    <div className="space-y-2">
      {/* 주요 정보 */}
      {primaryColumn && (
        <div className="font-medium">
          {primaryColumn.render
            ? primaryColumn.render(item)
            : (item[primaryColumn.key as keyof T] as React.ReactNode)}
        </div>
      )}

      {/* 보조 정보 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {secondaryColumns.map((col) => (
          <div key={String(col.key)} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{col.header}</span>
            <span>
              {col.render
                ? col.render(item)
                : (item[col.key as keyof T] as React.ReactNode)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
