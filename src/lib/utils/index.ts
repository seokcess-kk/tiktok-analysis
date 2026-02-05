import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatCurrency(value: number, currency = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatChange(current: number, previous: number): {
  value: number;
  formatted: string;
  isPositive: boolean;
} {
  if (previous === 0) {
    return { value: 0, formatted: '-', isPositive: true };
  }
  const change = ((current - previous) / previous) * 100;
  const isPositive = change >= 0;
  return {
    value: change,
    formatted: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
    isPositive,
  };
}

export function getDateRange(preset: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'today':
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '14d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
