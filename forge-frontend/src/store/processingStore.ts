import { create } from 'zustand'

interface ProcessingState {
  message: string
  isComplete: boolean
  fileCount: number
  language: string
  skippedDirs: string[]
  warnings: string[]
  setMessage: (msg: string) => void
  setComplete: (data: {
    fileCount: number
    language: string
    skippedDirs: string[]
    warnings: string[]
  }) => void
  reset: () => void
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  message: '',
  isComplete: false,
  fileCount: 0,
  language: '',
  skippedDirs: [],
  warnings: [],
  setMessage: (message) => set({ message }),
  setComplete: (data) => set({ ...data, isComplete: true }),
  reset: () =>
    set({
      message: '',
      isComplete: false,
      fileCount: 0,
      language: '',
      skippedDirs: [],
      warnings: [],
    }),
}))
