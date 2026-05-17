"use client";
import Image from "next/image";
import { formatCurrency } from '@/src/lib/utils';
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "../CustomButton";
import Image5 from '@/src/assets/images/image-5.jpg';
import BackIcon from '@/src/assets/images/back.svg';
import LoveIcon from '@/src/assets/images/love-icon.svg';
const SingleFoodMobile = () => {
  const [count, setCount] = useState(1);
  const router = useRouter();

  const handleIncrement = () => {
    setCount(count + 1);
  };
  const handleDecrement = () => {
    if (count > 1) {
      setCount(count - 1);
    }
  };
  const handleAddToCart = () => {
    alert(`Added to cart`);
  };
  return (
    <div className="relative">
      <div className="w-full">
        <Image
          src={Image5}
          alt=""
          width={390}
          height={284}
          className="object-contain w-full"
        />
      </div>
      <Image
        src={BackIcon}
        alt=""
        width={28}
        height={28}
        className="absolute top-8 left-8"
        onClick={() => router.back()}
      />
      <div className="bg-background-lighter w-full h-screen -mt-20 relative rounded-t-3xl">
        <div
          className="flex justify-end absolute right-0 -top-3 mr-10"
          onClick={(e) => {
            e.stopPropagation();
            // console.log("clicked loved");
          }}
        >
          <Image
            src={LoveIcon}
            alt=""
            width={28}
            height={28}
          />
        </div>
        <div className="p-3 relative">
          <p className="mt-5 text-2xl font-semibold">
            Jollof RIce, Plantain & Chicken
          </p>
          <div className="mt-3 flex justify-between items-center">
            <p className="text-3xl font-bold">₦{formatCurrency(12000)}</p>
            <div className="flex gap-4 items-center">
              <div
                onClick={handleDecrement}
                className={`w-[28px] h-[28px] text-2xl font-semibold border-2 border-foreground flex justify-center items-center rounded-full ${
                  count === 1
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <span className="relative -top-[2px]">-</span>
              </div>
              <p className="font-bold text-3xl">{count}</p>
              <div
                onClick={handleIncrement}
                className="w-[28px] h-[28px] text-2xl font-semibold border-2 border-orange text-orange flex justify-center items-center rounded-full"
              >
                <span className="relative -top-[2px]">+</span>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <p className="text-xl font-medium">About</p>
            <p className="mt-2 text-[#828181] text-lg">
              Fluffy, spicy jollof rice served with juicy grilled chicken and a
              side of golden-fried plantains for the perfect balance of flavor.
              A classic comfort dish that always hits the spot.
            </p>
          </div>
          <div className="fixed bottom-0 left-0 w-full px-4 pb-8 bg-background-lighter z-10">
            <CustomButton
              title="Add to Cart"
              others="w-full py-6 rounded-full"
              handleClick={handleAddToCart}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleFoodMobile;
