"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useRef, useEffect, useState } from "react";
import { Input } from "@/src/ui/input";
import { showSimpleToast } from "@/src/utils/alertFunctions";

declare global {
  interface Window {
    google: any;
  }
}

const MobileView = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [hasCoordinates, setHasCoordinates] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      if (window.google && window.google.maps) {
        setIsGoogleMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => {
        setIsGoogleMapsLoaded(true);
      };
      script.onerror = () => {
        showSimpleToast("Failed to load Google Maps", "failed");
      };
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (isGoogleMapsLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
          }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setAddress(place.formatted_address);
            
            // Store coordinates if available
            if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              localStorage.setItem('deliveryLatitude', lat.toString());
              localStorage.setItem('deliveryLongitude', lng.toString());
              setHasCoordinates(true);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places autocomplete:', error);
        showSimpleToast("Error initializing address autocomplete", "failed");
      }
    }
  }, [isGoogleMapsLoaded]);

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
    if (!address.trim()) {
      showSimpleToast("Please enter your delivery address", "failed");
      return;
    }

    if (!phoneNumber.trim()) {
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
    
    showSimpleToast("Delivery details saved successfully", "success");
    
    // Navigate to cart or checkout page
    router.push("/home/cart");
  };

  const handleClick = () => {
    if (!isGoogleMapsLoaded) {
      showSimpleToast("Please wait, loading location services...", "failed");
      return;
    }
    getCurrentLocation();
  };

  return (
    <div className="mt-8 md:hidden">
      <div className="flex justify-between items-center">
        <p className="text-xl font-semibold">Enter your Delivery Address.</p>
        <Image
          src="/assets/images/cancel-01.svg"
          alt=""
          width={20}
          height={20}
          onClick={() => router.push("/home")}
          className="cursor-pointer"
        />
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Delivery Address</p>
          <div className="relative">
            <Input 
              ref={inputRef}
              placeholder="Start typing your address and select from suggestions"
              className="bg-[#F5F5F5] py-5 border-none text-[#656565] placeholder:text-[#999]" 
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                // Reset coordinates indicator when user manually types
                if (e.target.value !== address) {
                  setHasCoordinates(false);
                }
              }}
            />
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

        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Phone Number</p>
          <Input 
            type="tel"
            placeholder="+14317730809"
            className="bg-[#F5F5F5] py-5 border-none text-[#656565] placeholder:text-[#999]" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
      </div>

      <div 
        className={`mt-5 flex gap-2 items-center cursor-pointer ${isLoadingLocation ? 'opacity-50' : ''}`} 
        onClick={handleClick}
      >
        <Image
          src="/assets/images/location-03.svg"
          alt=""
          width={20}
          height={20}
        />
        <p className="text-lg text-[#656565]">
          {isLoadingLocation ? "Getting your location..." : "Use your current location"}
        </p>
      </div>

      <div className="mt-8">
        <button
          onClick={handleContinueToCheckout}
          className="w-full bg-black text-white py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          disabled={isLoadingLocation}
        >
          Continue to Checkout
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Start typing your address and select from suggestions
        </p>
      </div>
    </div>
  );
};

export default MobileView;
