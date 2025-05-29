"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Sticker = {
  id: string
  dataUrl: string
  width: number
  height: number
  createdAt: string
}

type StickerStore = {
  stickers: Sticker[]
  addSticker: (sticker: Sticker) => void
  removeSticker: (id: string) => void
  clearStickers: () => void
}

export const useStickerStore = create<StickerStore>()(
  persist(
    (set) => ({
      stickers: [],
      addSticker: (sticker) =>
        set((state) => ({
          stickers: [sticker, ...state.stickers],
        })),
      removeSticker: (id) =>
        set((state) => ({
          stickers: state.stickers.filter((s) => s.id !== id),
        })),
      clearStickers: () => set({ stickers: [] }),
    }),
    {
      name: "sticker-storage",
    },
  ),
)
