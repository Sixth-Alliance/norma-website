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
import { Field, FieldError, FieldGroup } from "@/src/ui/field";
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
    requestOptions: { componentRestrictions: { country: "ng" } },
    debounce: 300,
    defaultValue: deliveryAddress,
  });

  useEffect(() => {
    form.reset({
      address: deliveryAddress,
      phone: deliveryPhone,
    });
    setValue(deliveryAddress, false);
  }, [deliveryAddress, deliveryPhone, form, setValue]);

  const saveAndDispatchCoordinates = (lat: number, lng: number, address: string) => {
    localStorage.setItem("deliveryLatitude", lat.toString());
    localStorage.setItem("deliveryLongitude", lng.toString());
    window.dispatchEvent(
      new CustomEvent("coordinatesUpdated", {
        detail: { latitude: lat, longitude: lng, formattedAddress: address },
      })
    );
  };

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

  // ----------------------------
  // RENDER: Form View
  // ----------------------------
  // ✅ FIX 1: Removed 'h-full' so the form doesn't stretch
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="my-5 px-5 flex flex-col">
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
                  onBlur={() => field.onBlur()}
                  // iOS scroll correction
                  onFocus={() => {
                    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent);
                    if (isIOS) {
                      setTimeout(() => {
                        document.activeElement?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }, 300);
                    }
                  }}
                  className="bg-background py-5 border-none pr-10 w-full"
                />

                {/* Clear Button */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {value && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("");
                        form.setValue("address", "");
                        setDeliveryAddress("");
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Suggestions */}
                {status === "OK" && (
                  <div
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto overscroll-contain"
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
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
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

        {/* Phone Input */}
        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Input
                {...field}
                id="phone"
                type="tel"
                placeholder="Phone number"
                className="bg-background py-5 border-none w-full"
                disabled={isAutoPinning}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9+]/g, "");
                  field.onChange(raw);
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
          title={
            isResolvingAddress || isAutoPinning
              ? "Processing..."
              : "Checkout"
          }
          handleClick={form.handleSubmit(onSubmit)}
          disabled={
            isResolvingAddress || isAutoPinning || !form.formState.isValid
          }
          others="py-5 w-full"
        />
      </div>

      <p className="text-xs text-center text-gray-500 mt-2">
        If your address isn't listed, type it fully – we'll locate it automatically during checkout.
      </p>
    </form>
  );
};

// ----------------------------
// Main Component
// ----------------------------
const DeliveryMobileModal: React.FC<DeliveryModalProps> = (props) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (props.isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [props.isOpen]);

  return (
    <Drawer open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DrawerContent
        className="bg-background flex flex-col p-0 rounded-t-3xl"
        // ✅ FIX 2: Removed fixed height calculation. 
        // Using maxHeight ensures it hugs content but doesn't go off screen.
        style={{
          maxHeight: "90vh", 
        }}
      >
        <DrawerTitle className="sr-only">Delivery Address</DrawerTitle>
        <div
          className="flex flex-col w-full"
          // ✅ FIX 3: Set height to auto so the list defines the size
          style={{
            height: "auto",
            maxHeight: "85vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
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

export default DeliveryMobileModal;