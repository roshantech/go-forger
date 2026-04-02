import { create } from 'zustand'
import type { UsageResponse } from '@/lib/api'

interface UsageStore {
  symbol: string | null
  symbolType: string | null
  data: UsageResponse | null
  loading: boolean
  error: string | null

  setLoading: (symbol: string, symbolType: string) => void
  setData: (symbol: string, symbolType: string, data: UsageResponse) => void
  setError: (error: string) => void
  clear: () => void
}

export const useUsageStore = create<UsageStore>((set) => ({
  symbol: null,
  symbolType: null,
  data: null,
  loading: false,
  error: null,

  setLoading: (symbol, symbolType) =>
    set({ symbol, symbolType, loading: true, data: null, error: null }),

  setData: (symbol, symbolType, data) =>
    set({ symbol, symbolType, data, loading: false, error: null }),

  setError: (error) =>
    set({ loading: false, error }),

  clear: () =>
    set({ symbol: null, symbolType: null, data: null, loading: false, error: null }),
}))
