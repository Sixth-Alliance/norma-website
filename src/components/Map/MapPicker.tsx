"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import CustomButton from "@/src/components/home-components/CustomButton";

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: { address: string; latitude: number; longitude: number }) => void;
  outletLat?: number;
  outletLng?: number;
  outletRadiusMeters?: number;
}

const containerStyle = {
  width: "100%",
  height: "320px",
};

const defaultCenter = { lat: 6.5244, lng: 3.3792 }; // Lagos fallback
const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function MapPicker({
  initialLat,
  initialLng,
  initialAddress,
  isOpen,
  onClose,
  onConfirm,
  outletLat,
  outletLng,
  outletRadiusMeters,
}: MapPickerProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [currentAddress, setCurrentAddress] = useState<string | undefined>(initialAddress);
  const [searchInput, setSearchInput] = useState<string>("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isFetchingPredictions, setIsFetchingPredictions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    // use default stable Maps JS (weekly) for wider compatibility
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialLat && initialLng) {
      setMarker({ lat: initialLat, lng: initialLng });
    }
    if (initialAddress) {
      setCurrentAddress(initialAddress);
      setSearchInput(initialAddress);
    }
  }, [initialLat, initialLng, initialAddress]);

  useEffect(() => {
    if (!isLoaded || !window.google) return;

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }

    if (!placesServiceRef.current) {
      const container = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(container);
    }
  }, [isLoaded]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat, lng } }, 
      (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === "OK" && results && results[0]) {
          const address = results[0].formatted_address;
          setCurrentAddress(address);
          setSearchInput(address);
        }
      }
    );
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

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
        sessionToken: sessionTokenRef.current || undefined,
        // You can add componentRestrictions here, e.g., { country: 'ng' }
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
        const address = place.formatted_address || prediction.description;

        setMarker({ lat, lng });
        setCurrentAddress(address || "");
        setSearchInput(address || "");
        setPredictions([]);
        sessionTokenRef.current = null;

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }
      }
    );
  }, []);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarker({ lat, lng });
        
        // Center map on current location
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }
        
        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error("Error getting current location:", error);
      }
    );
  }, [reverseGeocode]);

  const handleConfirm = () => {
    if (!marker) return;
    onConfirm({ address: currentAddress || "", latitude: marker.lat, longitude: marker.lng });
    onClose();
  };

  // Live predictions when typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPredictions(searchInput);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInput, fetchPredictions]);

  if (!isOpen || !mounted) return null;

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl">
          <p className="text-red-500">Error loading maps</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">Close</button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl">
          <div className="h-80 w-full flex items-center justify-center">Loading map...</div>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/40" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Pick location on map</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Input with custom Google Places predictions */}
        <div className="mb-3 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for an address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
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
        </div>

        {/* Google Map */}
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={marker || defaultCenter}
          zoom={marker ? 15 : 12}
          onLoad={(map) => { mapRef.current = map; }}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {marker && (
            <Marker
              position={marker}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
        
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {currentAddress || "Search for an address, tap the map, or use your current location"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleCurrentLocation}
            className="px-4 py-3 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            📍 My Location
          </button>
          <CustomButton 
            title="Use this location" 
            handleClick={handleConfirm} 
            others="flex-1 py-3 min-w-[140px]" 
          />
          <CustomButton 
            title="Cancel" 
            handleClick={onClose} 
            others="flex-1 py-3 bg-gray-100 text-gray-800 hover:bg-gray-200 min-w-[100px]" 
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
