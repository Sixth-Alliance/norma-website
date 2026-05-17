"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Libraries, useJsApiLoader } from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

import { Drawer, DrawerContent, DrawerTitle } from "@/src/ui/drawer";
import { Input } from "@/src/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
} from "@/src/ui/field";
import CustomButton from "../CustomButton";
import { X, ChevronDown } from "lucide-react";

// ----------------------------
// Configuration
// ----------------------------
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
const DeliveryMobileForm = ({
  deliveryAddress,
  setDeliveryAddress,
  deliveryPhone,
  setDeliveryPhone,
  onCheckout,
  isResolvingAddress,
}: Omit<DeliveryModalProps, "isOpen" | "setIsOpen">) => {

  const [isAutoPinning, setIsAutoPinning] = useState(false);

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
    requestOptions: {
      componentRestrictions: { country: "ng" },
    },
    debounce: 300,
    defaultValue: deliveryAddress,
  });

  // Sync props to form on mount
  useEffect(() => {
    form.reset({
      address: deliveryAddress,
      phone: deliveryPhone,
    });
    setValue(deliveryAddress, false);
  }, [deliveryAddress, deliveryPhone, form, setValue]);

  // Helper function to fetch and save coordinates
  const processCoordinates = async (address: string) => {
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);

      localStorage.setItem("deliveryLatitude", lat.toString());
      localStorage.setItem("deliveryLongitude", lng.toString());

      window.dispatchEvent(
        new CustomEvent("coordinatesUpdated", {
          detail: { latitude: lat, longitude: lng, formattedAddress: address },
        })
      );
      return true;
    } catch (error) {
      console.error("Error fetching geocode: ", error);
      return false;
    }
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setValue(suggestion.description, false);
    clearSuggestions();

    form.setValue("address", suggestion.description, { shouldValidate: true });
    
    // Process coordinates immediately
    await processCoordinates(suggestion.description);
  };

  const onSubmit = async (data: DeliveryFormValues) => {
    setIsAutoPinning(true);

    // Sync state to parent
    setDeliveryAddress(data.address);
    setDeliveryPhone(data.phone);

    // Attempt JIT Geocoding (Pinning)
    await processCoordinates(data.address);

    setIsAutoPinning(false);
    onCheckout();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 px-5 flex flex-col h-full">
      <p className="text-sm font-semibold mb-3 text-center">
        Enter your Delivery Address & Phone Number.
      </p>

      <FieldGroup>
        {/* Address Input */}
        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="relative">
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
                  onBlur={() => {
                    field.onBlur();
                    setDeliveryAddress(field.value);
                  }}
                  className="bg-background py-5 border-none pr-20 w-full"
                />

                {/* Clear Button */}
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("");
                      form.setValue("address", "");
                      setDeliveryAddress("");
                    }}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}

                {/* Dropdown Arrow Indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {/* Suggestions List (Mobile Style) */}
                {status === "OK" && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
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
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 active:bg-gray-100"
                            >
                              <div className="font-medium text-gray-900 text-sm">
                                {main_text}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {secondary_text}
                              </div>
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

        {/* Dynamic Helper Text */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          {!value
            ? "Start typing your address (minimum 3 characters) to see suggestions"
            : "If your address isn't listed, type it fully – we'll locate it automatically during checkout."
          }
        </p>

        {/* Phone Input */}
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="mt-5">
              <Input
                {...field}
                id="phone"
                type="tel"
                placeholder="Phone number"
                className="bg-background py-5 border-none w-full"
                disabled={isAutoPinning}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  const filteredValue = rawValue.replace(/[^0-9+]/g, "");
                  field.onChange(filteredValue);
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

      <div className="mt-8 mb-8">
        <CustomButton
          title={isResolvingAddress || isAutoPinning ? "Processing..." : "Checkout"}
          handleClick={form.handleSubmit(onSubmit)}
          disabled={isResolvingAddress || isAutoPinning || !form.formState.isValid}
          others="py-5 w-full"
        />
      </div>
    </form>
  );
};

// ----------------------------
// Main Component
// ----------------------------
const NewDeliveryMobileModal: React.FC<DeliveryModalProps> = (props) => {
  const { isLoaded } = useJsApiLoader({
    id: "delivery-mobile-google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

  return (
    <Drawer open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DrawerContent className="bg-background max-h-[85vh] flex flex-col p-0 rounded-t-3xl">
        <DrawerTitle className="sr-only">Delivery Address</DrawerTitle>
        
        <div className="flex flex-col h-full overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {isLoaded ? (
            <DeliveryMobileForm {...props} />
          ) : (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading Maps...</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default NewDeliveryMobileModal;