'use client';

import { LucideIcon, FileQuestion, Inbox, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'search' | 'error' | 'inbox';
}

const variantIcons: Record<NonNullable<EmptyStateProps['variant']>, LucideIcon> = {
  default: FileQuestion,
  search: Search,
  error: AlertCircle,
  inbox: Inbox,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Preset empty states
export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      variant="search"
      title="검색 결과가 없습니다"
      description={`"${query}"에 대한 결과를 찾을 수 없습니다. 다른 검색어를 시도해보세요.`}
    />
  );
}

export function NoDataFound({
  title = '데이터가 없습니다',
  description = '아직 표시할 데이터가 없습니다.',
  action,
}: {
  title?: string;
  description?: string;
  action?: EmptyStateProps['action'];
}) {
  return (
    <EmptyState
      variant="inbox"
      title={title}
      description={description}
      action={action}
    />
  );
}

export function ErrorState({
  title = '오류가 발생했습니다',
  description = '잠시 후 다시 시도해주세요.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={onRetry ? { label: '다시 시도', onClick: onRetry } : undefined}
    />
  );
}
