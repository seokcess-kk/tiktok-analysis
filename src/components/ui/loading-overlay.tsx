'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({
  message = '로딩 중...',
  className,
  fullScreen = false,
}: LoadingOverlayProps) {
  const baseClasses = cn(
    'flex flex-col items-center justify-center gap-3',
    'bg-background/80 backdrop-blur-sm',
    fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10',
    className
  );

  return (
    <div className={baseClasses}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  );
}

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export function LoadingCard({ message = '데이터를 불러오는 중...', className }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8 rounded-lg border bg-card',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
