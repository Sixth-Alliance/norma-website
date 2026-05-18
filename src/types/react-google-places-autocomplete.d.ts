declare module "react-google-places-autocomplete" {
  import * as React from "react";

  export interface GooglePlaceOption {
    label: string;
    value: {
      description?: string;
      place_id?: string;
      [key: string]: unknown;
    };
  }

  export interface GooglePlacesAutocompleteProps {
    apiKey?: string;
    autocompletionRequest?: {
      componentRestrictions?: {
        country?: string[];
      };
      [key: string]: unknown;
    };
    selectProps?: Record<string, unknown>;
  }

  const GooglePlacesAutocomplete: React.ComponentType<GooglePlacesAutocompleteProps>;

  export function geocodeByPlaceId(placeId: string): Promise<google.maps.GeocoderResult[]>;
  export function getLatLng(result: google.maps.GeocoderResult): Promise<{ lat: number; lng: number }>;

  export default GooglePlacesAutocomplete;
}
