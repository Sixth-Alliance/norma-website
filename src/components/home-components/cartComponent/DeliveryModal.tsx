"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Libraries, useJsApiLoader } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/src/ui/dialog";
import { Input } from "@/src/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/src/ui/field";
import CustomButton from "../CustomButton";

// Stable reference — must not be recreated on each render to avoid API reload warnings
const libraries: Libraries = ["places"];

// ----------------------------
// Zod Schema
// ----------------------------
const deliverySchema = z.object({
  address: z.string().min(3, { message: "Address is required" }),
  phone: z.string().min(10, { message: "Valid phone number is required" }),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

// ----------------------------
// Props Interfaces
// ----------------------------
interface DeliveryModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  deliveryPhone: string;
  setDeliveryPhone: (phone: string) => void;
  onCheckout: () => void;
  isResolvingAddress?: boolean;
}

// ----------------------------
// Internal Form Component
// ----------------------------
const DeliveryForm = ({
  deliveryAddress,
  setDeliveryAddress,
  deliveryPhone,
  setDeliveryPhone,
  onCheckout,
  isResolvingAddress,
}: Omit<DeliveryModalProps, "isOpen" | "setIsOpen">) => {
  const [isAutoPinning, setIsAutoPinning] = useState(false);
  // Cache coordinates resolved from the last selected suggestion so onSubmit
  // can use them directly without re-geocoding.
  const coordsRef = useRef<{ lat: number; lng: number; address: string } | null>(null);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      address: deliveryAddress || "",
      phone: deliveryPhone || "",
    },
  });

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: "ng" } },
    debounce: 300,
    defaultValue: deliveryAddress,
  });

  useEffect(() => {
    form.reset({ address: deliveryAddress, phone: deliveryPhone });
    setValue(deliveryAddress, false);
  }, [deliveryAddress, deliveryPhone, form, setValue]);

  // Write coordinates to localStorage and notify the cart page.
  const saveAndDispatchCoordinates = (lat: number, lng: number, address: string) => {
    localStorage.setItem("deliveryLatitude", lat.toString());
    localStorage.setItem("deliveryLongitude", lng.toString());
    window.dispatchEvent(
      new CustomEvent("coordinatesUpdated", {
        detail: { latitude: lat, longitude: lng, formattedAddress: address },
      })
    );
  };

  // Geocode an address string → returns { lat, lng } or null on failure.
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number; formatted: string } | null> => {
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      return { lat, lng, formatted: results[0].formatted_address || address };
    } catch {
      return null;
    }
  };

  // Called when the user clicks a suggestion — geocodes immediately and caches
  // the result so onSubmit can skip the geocode call entirely.
  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setValue(suggestion.description, false);
    clearSuggestions();
    form.setValue("address", suggestion.description, { shouldValidate: true });
    const coords = await geocodeAddress(suggestion.description);
    if (coords) {
      coordsRef.current = { lat: coords.lat, lng: coords.lng, address: suggestion.description };
      // Dispatch early so the cart page can start the auto-fee calculation.
      saveAndDispatchCoordinates(coords.lat, coords.lng, coords.formatted);
    }
  };

  const onSubmit = async (data: DeliveryFormValues) => {
    let coords: { lat: number; lng: number; formatted: string } | null = null;

    // If the user selected a suggestion, reuse the cached coords — no extra geocode needed.
    if (coordsRef.current && coordsRef.current.address === data.address) {
      coords = { lat: coordsRef.current.lat, lng: coordsRef.current.lng, formatted: data.address };
    } else {
      // User typed manually without picking a suggestion — geocode now.
      setIsAutoPinning(true);
      coords = await geocodeAddress(data.address);
      setIsAutoPinning(false);
    }

    if (!coords) {
      form.setError("address", {
        type: "manual",
        message: "We couldn't locate this address. Please select a suggestion from the list.",
      });
      return;
    }

    // Ensure localStorage and cart state are up to date before proceeding.
    saveAndDispatchCoordinates(coords.lat, coords.lng, coords.formatted);
    setDeliveryAddress(data.address);
    setDeliveryPhone(data.phone);
    onCheckout();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="">
      <FieldGroup>
        {/* Address */}
        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="">
              <FieldLabel htmlFor="address">Delivery Address</FieldLabel>
              <div className="relative">
                <Input
                  id="address"
                  placeholder="Enter your address (e.g., Gwarinpa, Abuja)"
                  autoComplete="off"
                  disabled={!ready || isAutoPinning}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    field.onChange(e.target.value);
                  }}
                  onBlur={() => field.onBlur()}
                  className="py-5 text-base pr-10"
                />

                {/* Clear button */}
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("");
                      form.setValue("address", "");
                      setDeliveryAddress("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}

                {/* Suggestions dropdown */}
                {status === "OK" && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <ul className="py-1">
                      {data.map((suggestion) => {
                        const {
                          place_id,
                          structured_formatting: { main_text, secondary_text },
                        } = suggestion;
                        return (
                          <li key={place_id}>
                            <button
                              type="button"
                              onClick={() => handleSelect(suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900 text-sm">{main_text}</div>
                              <div className="text-xs text-gray-500 truncate">{secondary_text}</div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Phone */}
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="">
              <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
              <Input
                {...field}
                id="phone"
                type="tel"
                placeholder="Phone number"
                className="py-5 text-base"
                disabled={isAutoPinning}
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/[^0-9+]/g, ""));
                }}
                onBlur={() => {
                  field.onBlur();
                  setDeliveryPhone(field.value);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="mt-5">
        <CustomButton
          title={isResolvingAddress || isAutoPinning ? "Processing..." : "Continue to Checkout"}
          handleClick={form.handleSubmit(onSubmit)}
          disabled={isResolvingAddress || isAutoPinning || !form.formState.isValid}
          others="py-5 w-full"
        />
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Start typing and select a suggestion to confirm your location.
      </p>
    </form>
  );
};

// ----------------------------
// Main Component
// ----------------------------
const DeliveryModal: React.FC<DeliveryModalProps> = (props) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  return (
    <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DialogContent className="bg-background p-8 max-w-sm [&>button]:hidden">
        <DialogTitle className="sr-only">Delivery Address</DialogTitle>
        <DialogDescription className="sr-only">
          Enter your delivery details
        </DialogDescription>

        <p className="text-3xl font-semibold mb-3">Enter your Delivery Address</p>

        {isLoaded ? (
          <DeliveryForm {...props} />
        ) : (
          <p className="text-sm text-gray-400 py-4">Loading address search…</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryModal;