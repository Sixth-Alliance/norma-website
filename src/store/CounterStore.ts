import { create } from "zustand"
import { persist } from "zustand/middleware"

interface CartItemCount {
  [itemId: string]: number
}

interface CountState {
  quantityCounts: CartItemCount
  increment: (itemId: string) => void
  decrement: (itemId: string) => void
  setQuantity: (itemId: string, quantity: number) => void
  reset: () => void
}

const useCountStore = create<CountState>()(
  persist(
    (set) => ({
      // Initial state - empty object for item quantities
      quantityCounts: {},

      increment: (itemId: string) =>
        set((state) => ({
          quantityCounts: {
            ...state.quantityCounts,
            [itemId]: (state.quantityCounts[itemId] || 1) + 1,
          },
        })),

      decrement: (itemId: string) =>
        set((state) => ({
          quantityCounts: {
            ...state.quantityCounts,
            [itemId]: Math.max(1, (state.quantityCounts[itemId] || 1) - 1),
          },
        })),

      setQuantity: (itemId: string, quantity: number) =>
        set((state) => ({
          quantityCounts: {
            ...state.quantityCounts,
            [itemId]: Math.max(1, quantity),
          },
        })),

      reset: () => set({ quantityCounts: {} }),
    }),
    {
      name: "cart-storage", // unique name for localStorage key
    },
  ),
)

export default useCountStore
