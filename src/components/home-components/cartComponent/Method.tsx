'use client'
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/src/ui/dialog";
import Image from "next/image";
import DeliveryIcon from "@/src/assets/images/delivery.svg";
import PickUpIcon from "@/src/assets/images/pickup.svg";
interface methodProps {
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  onMethodSelect?: (method: string) => void;
}
const Method: React.FC<methodProps> = ({
  isCheckoutModalOpen,
  setIsCheckoutModalOpen,
  onMethodSelect,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const select = (method: string) => {
    setSelectedMethod(method);
    if (onMethodSelect) {
      onMethodSelect(method);
    }
  };
  return (
    <div>
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="bg-background p-8 flex flex-col justify-center items-center [&>button]:hidden">
          <DialogTitle></DialogTitle>
          <div className="text-center">
            <p className="text-lg md:text-3xl">Delivery or Pickup?</p>
            <p className="text-sm md:text-lg text-foreground-lighter">
              Get it at your door or grab it at Norma.
            </p>
          </div>

          <div className="flex gap-3 items-center mt-5">
            <div
              className="flex flex-col justify-center items-center gap-2"
              onClick={() => select("delivery")}
            >
              <div
                className={`border-1 p-4 rounded-lg ${
                  selectedMethod === "delivery"
                    ? "border-black bg-black/10"
                    : "border-background-dark"
                }`}
              >
                <Image
                  src={DeliveryIcon}
                  alt="delivery icon"
                  width={136}
                  height={142}
                />
              </div>
              <p className="text-sm md:text-xl font-semibold">Delivery</p>
            </div>
            <div
              className="flex flex-col justify-center items-center gap-2"
              onClick={() => select("pickup")}
            >
              <div
                className={`border-1 p-4 rounded-lg ${
                  selectedMethod === "pickup"
                    ? "border-black bg-black/10"
                    : "border-background-dark"
                }`}
              >
                <Image
                  src={PickUpIcon}
                  alt="delivery icon"
                  width={136}
                  height={142}
                />
              </div>
              <p className="text-sm md:text-xl font-semibold">Pickup</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Method;
