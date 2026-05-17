"use client";
import Image from "next/image";
import { formatCurrency } from '@/src/lib/utils';
import { normalizeCloudinaryUrl } from '@/src/lib/imageUtils';
import React from "react";
import { StaticImageData } from "next/image";
import LoveIcon from "@/src/assets/images/love-icon.svg";
import TimerIcon from "@/src/assets/images/timer-02.svg";
import AddCircle from "@/src/assets/images/add-circle.svg";
interface singleFoodProps {
  image: string | StaticImageData;
  title: string;
  sub_title: string;
  delivery_time?: string;
  price: string;
  handleLoveClick: () => void;
  handleModalBox: () => void;
  rawTitle?: string;
}
const SingleFood: React.FC<singleFoodProps> = ({
  image,
  title,
  sub_title,
  delivery_time,
  price,
  handleLoveClick,
  handleModalBox,
  rawTitle,
}) => {
  // Prefer rawTitle for detection of [new] if provided (keeps original source tag)
  const detectionSource = rawTitle || title;
  const newTagRegex = /\[\s*new\s*\]$/i;
  const isNew = typeof detectionSource === 'string' && newTagRegex.test(detectionSource);
  
  // Safe title processing with enhanced error handling
  const cleanedTitle = (() => {
    try {
      if (typeof title !== 'string') {
        console.warn('SingleFood: title is not a string:', title, 'Type:', typeof title);
        return String(title || 'Product');
      }
      const replaced = title.replace(newTagRegex, '');
      return typeof replaced === 'string' ? replaced.trim() : title;
    } catch (error) {
      console.error('Error processing title in SingleFood:', error, 'Original title:', title);
      return String(title || 'Product');
    }
  })();

  // Normalize the image URL to ensure it's a valid Cloudinary URL
  const normalizedImageUrl = typeof image === 'string' ? normalizeCloudinaryUrl(image) : image;

  return (
    <div
      className="bg-background p-3 md:p-4 rounded-2xl relative overflow-hidden flex flex-col h-full min-h-[280px] md:min-h-[360px]"
      onClick={handleModalBox}
    >
      {/* NEW badge */}
      {isNew && (
        <div className="absolute top-3 right-3 z-30">
          <span className="inline-block bg-orange text-background text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            NEW
          </span>
        </div>
      )}
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
      {/* <div
        className="absolute top-5 right-5 z-20"
        onClick={(e) => {
          e.stopPropagation();
          handleLoveClick();
        }}
      >
        <Image src={LoveIcon} alt="" width={28} height={28} style={{ width: "auto", height: "auto" }} />
      </div> */}

      {/* Mobile: price shown in the bottom bar only (removed duplicate badge) */}
      <div className="flex-1 p-0 md:p-3 flex flex-col">
        <div className="mt-3 flex-1">
          <p className="text-[16px] md:text-xl font-medium">{cleanedTitle}</p>
          <p className="text-sm md:text-lg font-medium text-foreground-lighter mt-1">
            {sub_title}
          </p>
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
        <div className="hidden md:flex justify-between items-end mt-6">
          <p className="text-2xl md:text-xl font-bold">₦{(() => {
            try {
              return formatCurrency(price);
            } catch (error) {
              console.error('Error in formatCurrency (desktop):', error, 'Price:', price, 'Type:', typeof price);
              return '0.00';
            }
          })()}</p>
          <div onClick={(e) => { e.stopPropagation(); handleModalBox(); }} className="cursor-pointer">
            <Image src={AddCircle} alt="" width={28} height={28} style={{width: 28, height: 28}} />
          </div>
        </div>

        {/* Mobile price and add button at bottom */}
        <div className="md:hidden flex items-center justify-between mt-4">
          <p className="bg-orange text-background inline-block px-3 py-1 rounded-2xl font-bold text-sm">₦{(() => {
            try {
              return formatCurrency(price);
            } catch (error) {
              console.error('Error in formatCurrency (mobile):', error, 'Price:', price, 'Type:', typeof price);
              return '0.00';
            }
          })()}</p>
          <div onClick={(e) => { e.stopPropagation(); handleModalBox(); }} className="cursor-pointer">
            <Image src={AddCircle} alt="" width={32} height={32} style={{width: 32, height: 32}} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleFood;
