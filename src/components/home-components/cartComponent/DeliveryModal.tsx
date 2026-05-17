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
import { X } from "lucide-react";

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
const DeliveryForm = ({
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

  useEffect(() => {
    form.reset({
      address: deliveryAddress,
      phone: deliveryPhone
    });
    setValue(deliveryAddress, false);
  }, [deliveryAddress, deliveryPhone, form, setValue]);

  // --- Helper: Save Coordinates ---
  const saveAndDispatchCoordinates = (lat: number, lng: number, address: string) => {
    localStorage.setItem("deliveryLatitude", lat.toString());
    localStorage.setItem("deliveryLongitude", lng.toString());

    window.dispatchEvent(
      new CustomEvent("coordinatesUpdated", {
        detail: { latitude: lat, longitude: lng, formattedAddress: address },
      })
    );
  };

  // --- Helper: Process Address string to Lat/Lng ---
  const processCoordinates = async (address: string) => {
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      saveAndDispatchCoordinates(lat, lng, address);
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
    await processCoordinates(suggestion.description);
  };

  const onSubmit = async (data: DeliveryFormValues) => {
    setIsAutoPinning(true);
    const isValidAddress = await processCoordinates(data.address);
    setIsAutoPinning(false);

    if (isValidAddress) {
      setDeliveryAddress(data.address);
      setDeliveryPhone(data.phone);
      onCheckout();
    } else {
      form.setError("address", {
        type: "manual",
        message: "We couldn't locate this address. Please try selecting a suggestion.",
      });
    }
  };

  // -------------------------------------
  // RENDER: Form View (Default)
  // -------------------------------------
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="">
      <FieldGroup>
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
                  onBlur={() => {
                    field.onBlur();
                  }}
                  // iOS FIX: text-base added, padding reduced to pr-10
                  className="py-5 pr-10 text-base"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {value && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("");
                        form.setValue("address", "");
                        setDeliveryAddress("");
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {status === "OK" && (
                  <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {data.map((suggestion) => {
                      const {
                        place_id,
                        structured_formatting: { main_text, secondary_text },
                      } = suggestion;
                      return (
                        <div
                          key={place_id}
                          onClick={() => handleSelect(suggestion)}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-bold text-gray-800">{main_text}</p>
                          <p className="text-xs text-gray-500">{secondary_text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
                // iOS FIX: text-base added
                className="py-5 text-base"
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

      <div className="mt-5">
        <CustomButton
          title={isResolvingAddress || isAutoPinning ? "Processing..." : "Continue to Checkout"}
          handleClick={form.handleSubmit(onSubmit)}
          disabled={isResolvingAddress || isAutoPinning || !form.formState.isValid}
          others="py-5 w-full"
        />
      </div>

      <p className="text-xs text-gray-500 mt-2">
        If your address isn't listed, type it fully – we'll locate it automatically during checkout.
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
    libraries: libraries,
  });

  return (
    <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DialogContent className="bg-background p-8 max-w-sm [&>button]:hidden">
        <DialogTitle className="sr-only">Delivery Address</DialogTitle>
        <DialogDescription className="sr-only">
          Enter your delivery details
        </DialogDescription>

        <p className="text-3xl font-semibold mb-3">
          Enter your Delivery Address
        </p>

        {isLoaded ? (
          <DeliveryForm {...props} />
        ) : (
          <div className="py-10 text-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Initializing Maps...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryModal;