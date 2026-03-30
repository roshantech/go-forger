import { create } from 'zustand'
import type { FileInspection } from '@/lib/api'

interface InspectorStore {
  inspection: FileInspection | null
  isLoading: boolean
  error: string | null

  setInspection: (data: FileInspection) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  clear: () => void
}

export const useInspectorStore = create<InspectorStore>((set) => ({
  inspection: null,
  isLoading: false,
  error: null,

  setInspection: (data) => set({ inspection: data, error: null, isLoading: false }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (msg) => set({ error: msg, isLoading: false }),
  clear: () => set({ inspection: null, error: null, isLoading: false }),
}))
