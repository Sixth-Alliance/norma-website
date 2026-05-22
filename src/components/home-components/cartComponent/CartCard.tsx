"use client";
import Image from "next/image";
import React from "react";
import { StaticImageData } from "next/image";
import LoveIcon from "@/src/assets/images/love-icon.svg";
import TimerIcon from "@/src/assets/images/timer-02.svg";
import AddCircle from "@/src/assets/images/add-circle.svg";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";

interface CartItemExtraSnapshot {
  option_name: string;
  extra_title: string;
  option_unit_price?: string;
  line_total?: string;
  quantity?: number;
}

interface singleCartProps {
  image: string | StaticImageData;
  title: string;
  sub_title: string;
  delivery_time: string;
  price: string;
  handleLoveClick: () => void;
  handleIncrement: () => void;
  handleDecrement: () => void;
  quantity: number;
  amount: number;
  extras?: CartItemExtraSnapshot[] | null;
  extras_total?: number;
}

const CartCard: React.FC<singleCartProps> = ({
  image,
  title,
  sub_title,
  delivery_time,
  price,
  handleLoveClick,
  handleDecrement,
  handleIncrement,
  quantity,
  amount,
  extras,
  extras_total,
}) => {
  const newTagRegex = /\[\s*new\s*\]$/i;
  
  // Safe title processing with enhanced error handling
  const cleanedTitle = (() => {
    try {
      if (typeof title !== 'string') {
        console.warn('CartCard: title is not a string:', title, 'Type:', typeof title);
        return String(title || 'Product');
      }
      const replaced = title.replace(newTagRegex, '');
      return typeof replaced === 'string' ? replaced.trim() : title;
    } catch (error) {
      console.error('Error processing title in CartCard:', error, 'Original title:', title);
      return String(title || 'Product');
    }
  })();
  
  const normalizedImageUrl = typeof image === 'string' ? normalizeCloudinaryUrl(image) : image;
  
  return (
    <div className="bg-background p-3 md:p-4 rounded-2xl relative overflow-hidden flex flex-col h-full min-h-[280px] md:min-h-[360px]">
      <div className="flex-shrink-0 w-full overflow-hidden rounded-md md:rounded-2xl">
        <div className="w-full h-[164px] md:h-[241px] relative">
          <Image
            src={normalizedImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover w-full h-full rounded-md md:rounded-2xl"
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-0 md:p-3 flex flex-col">
        <div className="mt-3 flex-1">
          <p className="text-[16px] md:text-xl font-medium">{cleanedTitle}</p>
          <p className="text-sm md:text-lg font-medium text-foreground-lighter mt-1">
            {sub_title}
          </p>
          {extras && extras.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-lighter">Extras</p>
              {extras.map((e, i) => {
                const unitPrice = parseFloat(e.option_unit_price || "0");
                return (
                  <div key={i} className="flex justify-between items-start gap-2">
                    <p className="text-xs text-foreground-lighter">
                      {e.extra_title}:{" "}
                      <span className="font-medium text-foreground">{e.option_name}</span>
                    </p>
                    {unitPrice > 0 && (
                      <p className="text-xs font-semibold text-orange shrink-0">+₦{unitPrice.toLocaleString()}</p>
                    )}
                  </div>
                );
              })}
              {extras_total != null && extras_total > 0 && (
                <p className="text-xs font-semibold text-foreground-lighter border-t border-border/40 pt-1 mt-1">
                  Extras total:{" "}
                  <span className="text-foreground">+₦{Number(extras_total).toLocaleString()}</span>
                </p>
              )}
            </div>
          )}
        </div>
        {/* <div className="mt-3 flex gap-2 items-center">
          <Image
            src={TimerIcon}
            alt=""
            width={12}
            height={12}
            className="md:w-[16px] md:h-[16px] object-cover"
            style={{width: 12, height: 12}}
          />
          <p className="text-[10px] md:text-[12px] font-medium">
            {delivery_time}
          </p>
        </div> */}

        {/* Desktop: Price and Quantity Controls */}
        <div className="hidden md:flex justify-between items-end mt-6">
          <p className="text-2xl md:text-xl font-bold">₦{amount.toLocaleString()}</p>
          <div className="flex gap-3 items-center">
            <div
              onClick={handleDecrement}
              className="cursor-pointer"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="14" cy="14" r="13.5" fill="white" stroke="#000" />
                <path d="M9 14H19" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-bold text-lg">{quantity}</p>
            <div onClick={handleIncrement} className="cursor-pointer">
              <Image src={AddCircle} alt="" width={28} height={28} style={{width: 28, height: 28}} />
            </div>
          </div>
        </div>

        {/* Mobile: Price and Quantity Controls */}
        <div className="md:hidden flex items-center justify-between mt-4">
          <p className="bg-orange text-background inline-block px-3 py-1 rounded-2xl font-bold text-sm">₦{amount.toLocaleString()}</p>
          <div className="flex items-center gap-3">
            <div
              onClick={handleDecrement}
              className="cursor-pointer"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="15.5" fill="white" stroke="#000" />
                <path d="M10 16H22" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="font-bold text-sm">{quantity}</p>
            <div onClick={handleIncrement} className="cursor-pointer">
              <Image src={AddCircle} alt="" width={32} height={32} style={{width: 32, height: 32}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartCard;
