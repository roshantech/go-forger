import { create } from 'zustand'

interface UIStore {
  aiPanelOpen: boolean
  toggleAiPanel: () => void
  setAiPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  aiPanelOpen: false,
  toggleAiPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
}))
