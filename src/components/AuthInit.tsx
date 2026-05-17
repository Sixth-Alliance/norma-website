"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { logger } from '@/src/utils/logger';
import { getAllOutlets } from '@/src/app/api/action';
import { useOutletStore } from '@/src/store/OutletStore';
import { useCartStore } from '@/src/store/CartStore';
import { getAuthToken } from '@/src/lib/tokens';

export default function AuthInit() {
  const fetchUserProfile = useAuthStore((s: any) => s.fetchUserProfile);
  const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
    async function init() {
      if (isInitialized) return;

      // 🔥 AUTO-FIX: Handle force_logout parameter
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('force_logout') === '1') {
          try {
            // Clear localStorage
            localStorage.clear();
            // Remove the parameter from URL
            urlParams.delete('force_logout');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
            logger.info('✅ Forced logout completed, localStorage cleared');
          } catch (e) {
            logger.warn('Error during forced logout:', e);
          }
        }
      }

      // 🔍 Check if user has auth cookies
      const token = getAuthToken();
      if (token) {
        logger.debug('🔑 Auth token found, fetching profile...');
      } else {
        logger.debug('No auth token found, user is anonymous');
      }

      // ✅ Fetch profile - cookies are the source of truth
      try {
        const profile = await fetchUserProfile();
        
        if (profile && profile.id) {
          logger.info('✅ User authenticated via cookies');
          useAuthStore.getState().setRehydrated(true);
          setIsInitialized(true);
        } else {
          logger.debug('No authentication (anonymous user)');
          useAuthStore.getState().setRehydrated(true);
          setIsInitialized(true);
        }
      } catch (e: any) {
        const status = e?.response?.status;
        const message = e?.message || '';
        
        if (status === 401 || message.includes('401') || message.includes('No authentication token')) {
          logger.debug('No active session (anonymous user)');
        } else {
          logger.warn('Error during profile fetch:', e);
        }
        useAuthStore.getState().setRehydrated(true);
        setIsInitialized(true);
      }

      // Auto-select outlet if needed
      try {
        const outletState = useOutletStore.getState();
        const cartState = useCartStore.getState();
        
        if (!outletState.selectedOutlet) {
          const outlets = await getAllOutlets();
          
          if (outlets && outlets.length > 0) {
            // Try to pick nearest outlet using geolocation
            const pickNearest = (): Promise<any | null> => {
              return new Promise((resolve) => {
                if (!('geolocation' in navigator)) return resolve(null);
                
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    try {
                      const lat = pos.coords.latitude;
                      const lon = pos.coords.longitude;
                      let best = outlets[0];
                      let bestDist = Number.POSITIVE_INFINITY;
                      
                      for (const o of outlets) {
                        const oLat = parseFloat(o.latitude || o.lat || 0);
                        const oLon = parseFloat(o.longitude || o.lon || 0);
                        if (!oLat || !oLon) continue;
                        
                        // Haversine distance
                        const R = 6371;
                        const dLat = (oLat - lat) * Math.PI / 180;
                        const dLon = (oLon - lon) * Math.PI / 180;
                        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                                  Math.cos(lat * Math.PI/180) * Math.cos(oLat * Math.PI/180) * 
                                  Math.sin(dLon/2) * Math.sin(dLon/2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        const dist = R * c;
                        
                        if (dist < bestDist) {
                          bestDist = dist;
                          best = o;
                        }
                      }
                      resolve(best || outlets[0]);
                    } catch (e) {
                      resolve(null);
                    }
                  },
                  () => resolve(null),
                  { timeout: 3000 }
                );
              });
            };

            let chosen = null;
            try {
              chosen = await pickNearest();
            } catch (e) {
              chosen = null;
            }
            if (!chosen) chosen = outlets[0];

            if (chosen) {
              const mapped = {
                id: chosen.id || chosen.outlet || chosen.pk,
                name: chosen.name || chosen.outlet_name || '',
                address_text: chosen.address_text || chosen.address || '',
                delivery_fee: chosen.delivery_fee || '0',
                delivery_radius_km: chosen.delivery_radius_km || '0',
                image: chosen.image || null,
                is_delivery_active: chosen.is_delivery_active ?? true,
                is_pickup_active: chosen.is_pickup_active ?? true,
                phone: chosen.phone || '',
                delivery_hours: chosen.delivery_hours || {},
                pickup_hours: chosen.pickup_hours || {},
              };

              outletState.setSelectedOutlet(mapped as any);
              cartState.initializeCartForOutlet(mapped.id).catch((e: any) => 
                logger.warn('AuthInit: init cart failed', e)
              );
              logger.info('AuthInit: auto-selected outlet', mapped.name || mapped.id);
            }
          }
        }
      } catch (e) {
        logger.warn('AuthInit: outlet selection failed', e);
      }
    }

    init();
  }, [fetchUserProfile, isInitialized]);

  return null;
}
