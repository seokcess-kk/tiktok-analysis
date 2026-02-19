/**
 * Account Store
 *
 * 현재 선택된 계정 및 계정 목록 상태 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types/api';

interface AccountState {
  // 상태
  currentAccount: Account | null;
  accounts: Account[];
  isLoading: boolean;

  // 액션
  setCurrentAccount: (account: Account | null) => void;
  setAccounts: (accounts: Account[]) => void;
  setLoading: (isLoading: boolean) => void;
  clearCurrentAccount: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      // 초기 상태
      currentAccount: null,
      accounts: [],
      isLoading: false,

      // 액션
      setCurrentAccount: (account) => set({ currentAccount: account }),
      setAccounts: (accounts) => set({ accounts }),
      setLoading: (isLoading) => set({ isLoading }),
      clearCurrentAccount: () => set({ currentAccount: null }),
    }),
    {
      name: 'account-storage',
      partialize: (state) => ({
        currentAccount: state.currentAccount,
      }),
    }
  )
);

// 선택자 (Selector)
export const selectCurrentAccountId = (state: AccountState) =>
  state.currentAccount?.id ?? null;

export const selectAccountById = (accountId: string) => (state: AccountState) =>
  state.accounts.find((a) => a.id === accountId) ?? null;
