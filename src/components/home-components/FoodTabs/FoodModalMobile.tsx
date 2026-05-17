import { Drawer, DrawerContent, DrawerTitle } from "@/src/ui/drawer";
import CustomButton from "../CustomButton";
import Image, { StaticImageData } from "next/image";
import Image5 from "@/src/assets/images/image_food.svg";
import { normalizeCloudinaryUrl } from '@/src/lib/imageUtils';
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from '@/src/lib/utils';

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem?: {
    id: string;
    title: string;
    sub_title: string;
    price: number; // Fixed: number to match FoodItem interface
    delivery_time?: string;
    description?: string;
    image: string | StaticImageData;
  } | null;
  handleIncrement: () => void;
  handleDecrement: () => void;
  handleAddToCart: () => void;
  count: number;
  isAddingToCart?: boolean;
}

const FoodModalMobile: React.FC<FoodModalProps> = ({
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
    <div>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-background max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Image section - covering the top */}
          <div className="relative w-full -top-6">
            <Image
              src={foodItem?.image ? normalizeCloudinaryUrl(foodItem.image as string) : Image5}
              alt={foodItem?.title || "Food image"}
              width={446}
              height={180}
              style={{ width: "auto", height: "auto" }}
              className="w-full h-[180px] object-cover" // Removed rounded corners
            />

            {/* Drag handle indicator - positioned at the top inside the image */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-12 h-1.5 bg-white/70 rounded-full"></div>
            </div>

            {/* Close button on top of image */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-20 bg-black/30 rounded-full p-2 hover:bg-black/40 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          </div>

          <DrawerTitle></DrawerTitle>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 -mt-6">
            <div className="p-3">
              {(() => {
                const newTagRegex = /\[\s*new\s*\]$/i;
                const title = foodItem?.title || '';
                
                // Safe title processing with enhanced error handling
                const cleanedTitle = (() => {
                  try {
                    if (typeof title !== 'string') {
                      console.warn('FoodModalMobile: title is not a string:', title, 'Type:', typeof title);
                      return String(title || 'Product');
                    }
                    const replaced = title.replace(newTagRegex, '');
                    return typeof replaced === 'string' ? replaced.trim() : title;
                  } catch (error) {
                    console.error('Error processing title in FoodModalMobile:', error, 'Original title:', title);
                    return String(title || 'Product');
                  }
                })();
                
                return <p className="text-2xl font-semibold mt-2">{cleanedTitle}</p>;
              })()}

              <div className="mt-3 flex justify-between items-center">
                <p className="text-3xl font-bold">
                  ₦{formatCurrency(foodItem?.price || 12000)}
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

              <div className="mt-6">
                <p className="text-xl font-medium">About</p>
                <p className="mt-2 text-[#828181] text-[16px] leading-relaxed">
                  {foodItem?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Fixed button at bottom */}
          <div className="p-5 bg-background border-t border-gray-200 sticky bottom-0">
            <CustomButton
              title={isAddingToCart ? "Adding..." : "Add to Cart"}
              others={`w-full py-4 rounded-full text-lg ${isAddingToCart ? "opacity-70 cursor-not-allowed" : ""}`}
              handleClick={isAddingToCart ? () => {} : handleAddToCart}
              disabled={isAddingToCart}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default FoodModalMobile;
