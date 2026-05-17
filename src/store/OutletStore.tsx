"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface OperatingHours {
  open: string
  close: string
  prep_time_mins: number
}

export interface Outlet {
  id: string
  name: string
  address_text: string
  delivery_fee: string
  delivery_radius_km: string
  image: string | null
  is_delivery_active: boolean
  is_pickup_active: boolean
  phone: string
  delivery_hours: {
    [key: string]: OperatingHours
  }
  pickup_hours: {
    [key: string]: OperatingHours
  }
}

interface OutletState {
  selectedOutlet: Outlet | null
  setSelectedOutlet: (outlet: Outlet) => void
  clearSelectedOutlet: () => void
}

export const useOutletStore = create<OutletState>()(
  persist(
    (set) => ({
      selectedOutlet: null,
      setSelectedOutlet: (outlet: Outlet) => set({ selectedOutlet: outlet }),
      clearSelectedOutlet: () => set({ selectedOutlet: null }),
    }),
    {
      name: "outlet-storage",
    },
  ),
)
