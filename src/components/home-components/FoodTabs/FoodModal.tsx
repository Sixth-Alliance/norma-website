import type React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/src/ui/dialog";
import Image, { StaticImageData } from "next/image";
import Image5 from "@/src/assets/images/image_food.svg";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";
import TimerIcon from "@/src/assets/images/timer-02.svg";
import { X } from "lucide-react";
import CustomButton from "../CustomButton";
import { formatCurrency } from "@/src/lib/utils";

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem?: {
    id: string;
    title: string;
    sub_title: string;
    price: number; // Fixed: number to match FoodItem interface
    delivery_time: string;
    description?: string;
    image: string | StaticImageData;
  } | null;
  handleIncrement: () => void;
  handleDecrement: () => void;
  handleAddToCart: () => void;
  count: number;
  isAddingToCart?: boolean;
}

const FoodModal: React.FC<FoodModalProps> = ({
  isOpen,
  onClose,
  foodItem,
  count,
  handleAddToCart,
  handleDecrement,
  handleIncrement,
  isAddingToCart = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg w-[100vw] bg-transparent fixed py-5 border-0 right-0 top-0 bottom-0  left-auto  translate-x-0! translate-y-0! data-[state=open]:translate-x-0! overflow-y-auto ">
        <div className="bg-background p-0 rounded-2xl relative flex flex-col">
          {/* Close icon positioned on top of the image */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-background/80 rounded-full p-2 hover:bg-background-lighter transition-colors"
          >
            <X size={20} />
          </button>

          {/* Image with responsive aspect ratio and object-contain to avoid cropping */}
          <div className="relative flex-shrink-0 z-10 w-full">
            <div className="relative w-full aspect-[3/2] sm:aspect-[16/9] overflow-hidden rounded-t-2xl bg-gray-100">
              <Image
                src={
                  foodItem?.image
                    ? normalizeCloudinaryUrl(foodItem.image as string)
                    : Image5
                }
                alt={foodItem?.title || "Food image"}
                fill
                sizes="(max-inline-size: 640px) 100vw, 50vw"
                className="object-contain"
              />
            </div>
          </div>

          <DialogTitle></DialogTitle>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-5 ">
            <div className="p-3 relative">
              {(() => {
                const newTagRegex = /\[\s*new\s*\]$/i;
                const title = foodItem?.title || "";

                // Safe title processing with enhanced error handling
                const cleanedTitle = (() => {
                  try {
                    if (typeof title !== "string") {
                      console.warn(
                        "FoodModal: title is not a string:",
                        title,
                        "Type:",
                        typeof title
                      );
                      return String(title || "Product");
                    }
                    const replaced = title.replace(newTagRegex, "");
                    return typeof replaced === "string"
                      ? replaced.trim()
                      : title;
                  } catch (error) {
                    console.error(
                      "Error processing title in FoodModal:",
                      error,
                      "Original title:",
                      title
                    );
                    return String(title || "Product");
                  }
                })();

                return (
                  <p className="mt-5 text-3xl font-semibold">{cleanedTitle}</p>
                );
              })()}
              <p className="text-lg text-[#656565]">{foodItem?.sub_title}</p>

              <div className="mt-5">
                <p className="mt-2 text-[#656565] text-lg">
                  {foodItem?.description}
                </p>
              </div>
              <div className="mt-5 flex justify-between items-center">
                <p className="text-xl font-bold bg-grey text-background py-2 px-5 rounded-3xl">
                  ₦{formatCurrency(foodItem?.price)}
                </p>
                <div className="flex gap-4 items-center">
                  <div
                    onClick={handleDecrement}
                    className={`w-[28px] h-[28px] text-2xl font-semibold border-2 border-foreground flex justify-center items-center rounded-full ${
                      count === 1
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <span>-</span>
                  </div>
                  <p className="font-bold text-3xl">{count}</p>
                  <div
                    onClick={handleIncrement}
                    className="w-[28px] h-[28px] text-2xl font-semibold border-2 border-orange text-orange flex justify-center items-center rounded-full cursor-pointer"
                  >
                    <span>+</span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-background mt-10 pb-8">
                <CustomButton
                  title={isAddingToCart ? "Adding..." : "Add to Cart"}
                  others={`w-full py-6 rounded-full ${
                    isAddingToCart ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  handleClick={isAddingToCart ? () => {} : handleAddToCart}
                  disabled={isAddingToCart}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodModal;
