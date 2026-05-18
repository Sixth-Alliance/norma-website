"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import GooglePlacesAutocomplete, {
  getLatLng,
  geocodeByPlaceId,
} from "react-google-places-autocomplete";

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
  const [selectedAddressOption, setSelectedAddressOption] = useState<any>(
    deliveryAddress
      ? { label: deliveryAddress, value: { description: deliveryAddress } }
      : null
  );
  const [isAddressGeocoded, setIsAddressGeocoded] = useState(false);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      address: deliveryAddress || "",
      phone: deliveryPhone || "",
    },
  });

  useEffect(() => {
    form.reset({
      address: deliveryAddress,
      phone: deliveryPhone,
    });
    setSelectedAddressOption(
      deliveryAddress
        ? { label: deliveryAddress, value: { description: deliveryAddress } }
        : null
    );
  }, [deliveryAddress, deliveryPhone, form]);

  // Persist coordinates and notify listeners used by checkout/cart flows.
  const saveAndDispatchCoordinates = (
    lat: number,
    lng: number,
    address: string
  ) => {
    localStorage.setItem("deliveryLatitude", lat.toString());
    localStorage.setItem("deliveryLongitude", lng.toString());

    window.dispatchEvent(
      new CustomEvent("coordinatesUpdated", {
        detail: { latitude: lat, longitude: lng, formattedAddress: address },
      })
    );
  };

  // Resolve coordinates from a place id chosen in the autocomplete list.
  const processCoordinatesByPlaceId = async (
    placeId: string,
    fallbackAddress: string
  ) => {
    try {
      const results = await geocodeByPlaceId(placeId);
      const { lat, lng } = await getLatLng(results[0]);
      const formattedAddress = results[0]?.formatted_address || fallbackAddress;
      console.log("dfaf ", formattedAddress);
      console.log("eatt ", results);
      saveAndDispatchCoordinates(lat, lng, formattedAddress);
      setIsAddressGeocoded(true);
      return true;
    } catch (error) {
      console.error("Error fetching geocode by place id:", error);
      setIsAddressGeocoded(false);
      return false;
    }
  };

  const onSubmit = async (data: DeliveryFormValues) => {
    setIsAutoPinning(true);
    console.log("oaafj");

    // If address was already geocoded during selection, proceed directly.
    // Otherwise, if user manually typed an address, attempt to geocode.
    if (isAddressGeocoded) {
      setIsAutoPinning(false);
      setDeliveryAddress(data.address);
      setDeliveryPhone(data.phone);
      onCheckout();
      return;
    }

    // Last attempt: geocode by selected place ID if available.
    console.log("ifaf ", selectedAddressOption);
    const placeId = selectedAddressOption?.value?.place_id;
    const isValidAddress = placeId
      ? await processCoordinatesByPlaceId(placeId, data.address)
      : false;

    setIsAutoPinning(false);

    if (isValidAddress) {
      setDeliveryAddress(data.address);
      setDeliveryPhone(data.phone);
      onCheckout();
    } else {
      form.setError("address", {
        type: "manual",
        message:
          "Please select an address suggestion from the list so we can pin your location.",
      });
    }
  };

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
                <GooglePlacesAutocomplete
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                  autocompletionRequest={{
                    componentRestrictions: {
                      country: ["ng"],
                    },
                  }}
                  selectProps={{
                    value: selectedAddressOption,
                    isDisabled: isAutoPinning,
                    isClearable: true,
                    placeholder: "Enter your address (e.g., Gwarinpa, Abuja)",
                    onBlur: field.onBlur,
                    onChange: async (option: any) => {
                      setSelectedAddressOption(option);
                      const address = option?.label || "";
                      field.onChange(address);
                      form.setValue("address", address, { shouldValidate: true });

                      if (option?.value?.placeId) {
                        await processCoordinatesByPlaceId(
                          option.value.placeId,
                          address
                        );
                      }
                    },
                    styles: {
                      control: (base: any) => ({
                        ...base,
                        minHeight: 48,
                        borderColor: fieldState.invalid ? "#ef4444" : base.borderColor,
                      }),
                      menu: (base: any) => ({
                        ...base,
                        zIndex: 60,
                      }),
                    },
                  }}
                />
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
        If your address is not listed, keep typing until a matching suggestion appears, then select it.
      </p>
    </form>
  );
};

// ----------------------------
// Main Component
// ----------------------------
const DeliveryModal: React.FC<DeliveryModalProps> = (props) => {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DialogContent className="bg-background p-8 max-w-sm [&>button]:hidden">
        <DialogTitle className="sr-only">Delivery Address</DialogTitle>
        <DialogDescription className="sr-only">
          Enter your delivery details
        </DialogDescription>

        <p className="text-3xl font-semibold mb-3">Enter your Delivery Address</p>

        <DeliveryForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryModal;