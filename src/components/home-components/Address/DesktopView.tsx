"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Input } from "@/src/ui/input";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import dynamic from 'next/dynamic';
import { useJsApiLoader } from "@react-google-maps/api";

const MapPicker = dynamic(() => import('@/src/components/Map/MapPicker'), { ssr: false });

declare global {
  interface Window {
    google: any;
  }
}

const DesktopView = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    id: "desktop-google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });
  const [hasCoordinates, setHasCoordinates] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFetchingPredictions, setIsFetchingPredictions] = useState(false);

  // Auto-detect location on mount and set as default delivery address (do not open map)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      try {
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          const latlng = new window.google.maps.LatLng(latitude, longitude);
          geocoder.geocode({ location: latlng }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const formattedAddress = results[0].formatted_address;
              setAddress(formattedAddress);
              if (inputRef.current) inputRef.current.value = formattedAddress;
              localStorage.setItem('deliveryAddress', formattedAddress);
              setHasCoordinates(true);
            }
            localStorage.setItem('deliveryLatitude', latitude.toString());
            localStorage.setItem('deliveryLongitude', longitude.toString());
            try {
              window.dispatchEvent(new CustomEvent('detectedLocation', { detail: { latitude, longitude, formattedAddress: results && results[0] ? results[0].formatted_address : undefined } }));
            } catch (e) {
              // ignore
            }
          });
        } else {
          localStorage.setItem('deliveryLatitude', latitude.toString());
          localStorage.setItem('deliveryLongitude', longitude.toString());
        }
      } catch (e) {
        // ignore
      }
    }, () => {});
  }, []);

  // Initialize Places services once Maps is loaded
  useEffect(() => {
    if (!isMapsLoaded || !window.google?.maps?.places) return;
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
    if (!placesServiceRef.current) {
      const container = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(container);
    }
  }, [isMapsLoaded]);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input || input.length < 3) {
      setPredictions([]);
      return;
    }

    if (!sessionTokenRef.current && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }

    setIsFetchingPredictions(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        types: ["geocode"],
        componentRestrictions: { country: "ng" },
        sessionToken: sessionTokenRef.current || undefined,
      },
      (results) => {
        setPredictions(results || []);
        setIsFetchingPredictions(false);
      }
    );
  }, []);

  const selectPrediction = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry", "name"],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const addressText = place.formatted_address || prediction.description;

        setAddress(addressText || "");
        setHasCoordinates(true);
        setPredictions([]);
        sessionTokenRef.current = null;

        localStorage.setItem('deliveryAddress', addressText || "");
        localStorage.setItem('deliveryLatitude', lat.toString());
        localStorage.setItem('deliveryLongitude', lng.toString());
      }
    );
  }, []);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      showSimpleToast("Geolocation is not supported by this browser", "failed");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use Google Geocoding API to get address from coordinates
          const geocoder = new window.google.maps.Geocoder();
          const latlng = new window.google.maps.LatLng(latitude, longitude);
          
          geocoder.geocode({ location: latlng }, (results: any, status: any) => {
            if (status === 'OK' && results[0]) {
              const formattedAddress = results[0].formatted_address;
              setAddress(formattedAddress);
              if (inputRef.current) {
                inputRef.current.value = formattedAddress;
              }
              
              // Store coordinates
              localStorage.setItem('deliveryLatitude', latitude.toString());
              localStorage.setItem('deliveryLongitude', longitude.toString());
              
              showSimpleToast("Current location detected successfully", "success");
            } else {
              showSimpleToast("Unable to get address from your location", "failed");
            }
            setIsLoadingLocation(false);
          });
        } catch (error) {
          console.error('Error getting address from coordinates:', error);
          showSimpleToast("Error getting address from location", "failed");
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting current position:', error);
        let errorMessage = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        showSimpleToast(errorMessage, "failed");
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleContinueToCheckout = () => {
    if (!String(address || '').trim()) {
      showSimpleToast("Please enter your delivery address", "failed");
      return;
    }

    if (!String(phoneNumber || '').trim()) {
      showSimpleToast("Please enter your phone number", "failed");
      return;
    }

    // Validate phone number (basic Nigerian phone number validation)
    const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      showSimpleToast("Please enter a valid Nigerian phone number", "failed");
      return;
    }

    // Store address and phone number in localStorage or state management
    localStorage.setItem('deliveryAddress', address);
    localStorage.setItem('customerPhone', phoneNumber);
  // Persist coords if the user picked on map
  // (MapPicker will set deliveryLatitude/deliveryLongitude in localStorage when used)
    
    showSimpleToast("Delivery details saved successfully", "success");
    
    // Navigate to cart or checkout page
    router.push("/home/cart");
  };

  // Debounced predictions fetch when typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPredictions(address);
    }, 200);
    return () => clearTimeout(timer);
  }, [address, fetchPredictions]);

  const handleClick = () => {
    if (!isMapsLoaded) {
      showSimpleToast("Please wait, loading location services...", "failed");
      return;
    }
    getCurrentLocation();
  };

  return (
    <div className="hidden md:block bg-white min-h-screen">
      <div className="max-w-2xl mx-auto py-16 px-8">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Enter your Delivery Address.</h1>
          <Image
            src="/assets/images/cancel-01.svg"
            alt=""
            width={24}
            height={24}
            onClick={() => router.push("/home")}
            className="cursor-pointer hover:opacity-70 transition-opacity"
          />
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-xl font-semibold text-gray-800">Delivery Address</label>
            <div className="relative">
              <Input 
                ref={inputRef}
                placeholder="Start typing your address and select from suggestions"
                className="bg-[#F5F5F5] py-6 px-4 border-none text-lg text-[#656565] placeholder:text-[#999] rounded-lg" 
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setHasCoordinates(false);
                }}
              />
              {isFetchingPredictions && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm p-3 text-sm text-gray-600">
                  Searching addresses...
                </div>
              )}
              {!isFetchingPredictions && predictions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto z-[10000]">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      onClick={() => selectPrediction(prediction)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-sm text-gray-900">{prediction.structured_formatting.main_text}</div>
                      <div className="text-xs text-gray-600">{prediction.structured_formatting.secondary_text}</div>
                    </button>
                  ))}
                </div>
              )}
              {hasCoordinates && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-green-600 font-medium">Verified</span>
                </div>
              )}
            </div>
            {!hasCoordinates && address && (
              <p className="text-xs text-amber-600">⚠️ Please select your address from the dropdown suggestions</p>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-xl font-semibold text-gray-800">Phone Number</label>
            <Input 
              type="tel"
              placeholder="+14317730809"
              className="bg-[#F5F5F5] py-6 px-4 border-none text-lg text-[#656565] placeholder:text-[#999] rounded-lg" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </div>

        <div 
          className={`mt-8 flex gap-3 items-center cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors ${isLoadingLocation ? 'opacity-50' : ''}`} 
          onClick={handleClick}
        >
          <Image
            src="/assets/images/location-03.svg"
            alt=""
            width={24}
            height={24}
          />
          <p className="text-lg text-[#656565]">
            {isLoadingLocation ? "Getting your location..." : "Use your current location"}
          </p>
        </div>

        {/* Map picker removed from primary flow; users can edit detected address manually */}

        {/* MapPicker placeholder: listen for event in a small wrapper component mounting MapPicker when requested */}
        <MapPickerWrapper />

        <div className="mt-12 space-y-4">
          <button
            onClick={handleContinueToCheckout}
            className="w-full bg-black text-white py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={isLoadingLocation}
          >
            Continue to Checkout
          </button>
          
          <p className="text-center text-sm text-gray-500">
            Start typing your address and select from suggestions
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesktopView;

function MapPickerWrapper() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('openMapPicker', handler as EventListener);
    return () => window.removeEventListener('openMapPicker', handler as EventListener);
  }, []);

  const handleConfirm = (result: { address: string; latitude: number; longitude: number }) => {
    localStorage.setItem('deliveryLatitude', result.latitude.toString());
    localStorage.setItem('deliveryLongitude', result.longitude.toString());
    localStorage.setItem('deliveryAddress', result.address || '');
    setOpen(false);
    showSimpleToast('Location selected', 'success');
  };

  return (
    <>
      {open && (
        <MapPicker
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
          initialLat={typeof window !== 'undefined' && localStorage.getItem('deliveryLatitude') ? Number(localStorage.getItem('deliveryLatitude')) : undefined}
          initialLng={typeof window !== 'undefined' && localStorage.getItem('deliveryLongitude') ? Number(localStorage.getItem('deliveryLongitude')) : undefined}
        />
      )}
    </>
  );
}