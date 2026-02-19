/**
 * Filter Store
 *
 * 대시보드 필터 상태 관리 (날짜 범위, 캠페인 상태, 검색어 등)
 */

import { create } from 'zustand';

interface DateRange {
  startDate: string | null;
  endDate: string | null;
  days: number;
}

interface FilterState {
  // 상태
  dateRange: DateRange;
  campaignStatus: string | null;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // 액션
  setDateRange: (range: Partial<DateRange>) => void;
  setDays: (days: number) => void;
  setCampaignStatus: (status: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
  resetFilters: () => void;
}

const initialState = {
  dateRange: {
    startDate: null,
    endDate: null,
    days: 7,
  },
  campaignStatus: null,
  searchQuery: '',
  sortBy: 'spend',
  sortOrder: 'desc' as const,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setDateRange: (range) =>
    set((state) => ({
      dateRange: { ...state.dateRange, ...range },
    })),

  setDays: (days) =>
    set((state) => ({
      dateRange: { ...state.dateRange, days, startDate: null, endDate: null },
    })),

  setCampaignStatus: (status) => set({ campaignStatus: status }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSortBy: (field) => set({ sortBy: field }),

  setSortOrder: (order) => set({ sortOrder: order }),

  toggleSortOrder: () =>
    set((state) => ({
      sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
    })),

  resetFilters: () => set(initialState),
}));

// 선택자 (Selector)
export const selectDateRangeDays = (state: FilterState) => state.dateRange.days;

export const selectActiveFiltersCount = (state: FilterState) => {
  let count = 0;
  if (state.dateRange.days !== 7) count++;
  if (state.campaignStatus) count++;
  if (state.searchQuery) count++;
  return count;
};
