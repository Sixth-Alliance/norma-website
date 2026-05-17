"use client";
import Image from "next/image";
import React from "react";
import { StaticImageData } from "next/image";
import TimerIcon from "@/src/assets/images/timer-02.svg";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";
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
}
const CheckOutCard: React.FC<singleCartProps> = ({
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
}) => {
  const newTagRegex = /\[\s*new\s*\]$/i;
  
  // Safe title processing with enhanced error handling
  const cleanedTitle = (() => {
    try {
      if (typeof title !== 'string') {
        console.warn('CheckOutCard: title is not a string:', title, 'Type:', typeof title);
        return String(title || 'Product');
      }
      const replaced = title.replace(newTagRegex, '');
      return typeof replaced === 'string' ? replaced.trim() : title;
    } catch (error) {
      console.error('Error processing title in CheckOutCard:', error, 'Original title:', title);
      return String(title || 'Product');
    }
  })();
  
  const normalizedImageUrl = typeof image === 'string' ? normalizeCloudinaryUrl(image) : image;
  
  return (
    <div className="bg-background p-3  rounded-2xl relative w-full">
      {/* Mobile Layout */}
      <div className="flex gap-3">
        {/* Image Section */}
        <div className="flex-shrink-0 w-1/3">
          <div className="relative">
            <Image
              src={normalizedImageUrl}
              alt=""
              width={164}
              height={113}
              className="rounded-md md:rounded-2xl w-full h-[113px]  object-cover"
            />
            {/* Favorite icon intentionally hidden on checkout */}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-0">
          <div>
            <p className="text-lg  font-medium">{cleanedTitle}</p>
            <p className="text-xs  font-medium text-foreground-lighter">
              {sub_title}
            </p>
          </div>

          <div className="mt-2  flex gap-2 items-center">
            <Image
              src={TimerIcon}
              alt="Delivery time"
              width={10}
              height={10}
              className="md:w-[16px] md:h-[16px] object-cover"
            />
            <p className="text-[8px] md:text-[12px] font-medium">
              {delivery_time}
            </p>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <p className="text-lg  font-bold">
              ₦{amount.toLocaleString()}
            </p>
          </div>
        </div>
        <div className=" flex flex-col justify-center items-center gap-2 bg-background-dark rounded-full">
          <div
            onClick={handleIncrement}
            className="w-[33px] h-[33px] text-2xl font-semibold bg-orange text-background flex justify-center items-center rounded-full cursor-pointer"
          >
            <span className="relative -top-[2px]">+</span>
          </div>
          <p className="font-bold text-sm">{quantity}</p>
          <div
            onClick={handleDecrement}
            className="w-[33px] h-[33px] text-2xl font-semibold bg-background flex justify-center items-center rounded-full cursor-pointer"
          >
            <span className="relative -top-[2px]">-</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOutCard;
