import React, { useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/src/ui/drawer";
import CustomButton from "../CustomButton";
import { formatCurrency } from "@/src/lib/utils";

interface CartItem {
  id: string;
  title: string;
  sub_title: string;
  basePrice: number;
  delivery_time: string;
  image: any;
  quantity: number; // Add quantity to interface
  totalAmount: number; // Add totalAmount to interface
}
interface checkModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  cartItems: CartItem[]; // Receive cart items from parent
  grandTotal: number; // Receive grand total from parent
  deliveryFee?: number; // Optional delivery fee
  handleIncrement: (itemId: string) => void;
  handleDecrement: (itemId: string) => void;
  handleLoveClick: (itemId: string) => void;
  onCheckout: () => void; // Final checkout handler
  selectedMethod?: string | null; // Delivery method
  deliveryAddress?: string; // Delivery address
  calculatingFee?: boolean; // Loading state for fee calculation
  isProcessingPayment?: boolean; // Loading state for payment processing
}
const CheckOutMobile: React.FC<checkModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  deliveryFee = 0, // Default to 0
  onCheckout,
  selectedMethod,
  deliveryAddress,
  calculatingFee = false,
  isProcessingPayment = false,
}) => {
  const subtotal = grandTotal;
  // Calculate tax (7.5% of subtotal)
  const tax = subtotal * 0.075;
  const total = subtotal + tax + deliveryFee;

  // Debug log to track delivery fee value
  // useEffect(() => {
  //   if (isOpen) {
  //     console.log("💰 CheckOutMobile - Delivery Fee Props:", {
  //       deliveryFee,
  //       selectedMethod,
  //       calculatingFee,
  //       subtotal,
  //       total,
  //     });
  //   }
  // }, [isOpen, deliveryFee, selectedMethod, calculatingFee, subtotal, total]);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-background max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-t-3xl">
        <DrawerTitle></DrawerTitle>
        {/* Chart Summary */}
        {/* Email is captured from authenticated user on server; no client-side email input required for checkout */}
        <div className="mt-8 p-3 mx-5 rounded-lg">
          {/* Delivery Method Display */}
          {selectedMethod && (
            <div className="mb-4 p-3 bg-background-dark rounded-lg border overflow-hidden">
              <p className="text-sm font-medium text-foreground-lighter">
                Delivery Method:
              </p>
              <p className="text-lg font-semibold capitalize">
                {selectedMethod}
              </p>
              {selectedMethod === "delivery" && deliveryAddress && (
                <p className="text-sm text-foreground-lighter mt-1 wrap-break-word">
                  {deliveryAddress}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
            <p className="text-lg font-medium">Subtotal:</p>
            <p className="text-lg font-medium">₦{formatCurrency(subtotal)}</p>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-lg font-medium">
              {selectedMethod === "pickup" ? "Pickup Fee:" : "Delivery Fee:"}
            </p>
            <p className="text-lg font-medium">
              {calculatingFee ? (
                <span className="text-sm">Calculating...</span>
              ) : (
                `₦${formatCurrency(deliveryFee)}`
              )}
            </p>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-lg font-medium">VAT (7.5%):</p>
            <p className="text-lg font-medium">₦{formatCurrency(tax)}</p>
          </div>

          <div className="border border-dashed border-[#CFCFCF] my-3"></div>

          <div className="flex justify-between items-center">
            <p className="text-xl font-extrabold">Total</p>
            <p className="text-xl font-extrabold">₦{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="mx-5 mb-5">
          <CustomButton
            title={
              isProcessingPayment
                ? "Processing..."
                : calculatingFee
                ? "Calculating..."
                : "Proceed to Payment"
            }
            handleClick={() => {
              if (!calculatingFee && !isProcessingPayment) onCheckout();
            }}
            disabled={calculatingFee || isProcessingPayment}
            others={`mt-5 py-5 w-full ${
              calculatingFee || isProcessingPayment
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CheckOutMobile;
