import type React from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/src/ui/drawer";
import CustomButton from "../CustomButton";
import Image, { StaticImageData } from "next/image";
import Image5 from "@/src/assets/images/image_food.svg";
import { normalizeCloudinaryUrl } from '@/src/lib/imageUtils';
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from '@/src/lib/utils';
import type { ProductExtra } from "@/src/app/api/action";

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem?: {
    id: string;
    title: string;
    sub_title: string;
    price: number;
    delivery_time?: string;
    description?: string;
    image: string | StaticImageData;
    extras?: ProductExtra[];
  } | null;
  handleIncrement: () => void;
  handleDecrement: () => void;
  handleAddToCart: () => void;
  count: number;
  isAddingToCart?: boolean;
  selectedExtras: Record<string, any>;
  onExtrasChange: (extras: Record<string, any>) => void;
}

const parsePrice = (price: string | number | null | undefined): number => {
  const n = parseFloat(String(price ?? 0));
  return isNaN(n) ? 0 : n;
};

const FoodModalMobile: React.FC<FoodModalProps> = ({
  isOpen,
  onClose,
  foodItem,
  count,
  handleAddToCart,
  handleDecrement,
  handleIncrement,
  isAddingToCart = false,
  selectedExtras,
  onExtrasChange,
}) => {
  const extras = (foodItem?.extras ?? []).filter((e) => e.status === "active");

  const extrasTotalPerUnit = extras.reduce((sum, extra) => {
    const value = selectedExtras[extra.id];
    if (value === undefined || value === null) return sum;

    switch (extra.extras_format) {
      case "radio": {
        if (typeof value !== "string") return sum;
        const selectedOption = extra.options.find(
          (opt) => opt.status === "active" && opt.id === value
        );
        return sum + (selectedOption ? parsePrice(selectedOption.price) : 0);
      }
      case "check": {
        if (!Array.isArray(value)) return sum;
        const checkedTotal = value.reduce((acc, optionValue) => {
          const optionId =
            typeof optionValue === "string"
              ? optionValue
              : optionValue && typeof optionValue === "object"
              ? optionValue.id
              : undefined;
          if (!optionId) return acc;
          const selectedOption = extra.options.find(
            (opt) => opt.status === "active" && opt.id === optionId
          );
          return acc + (selectedOption ? parsePrice(selectedOption.price) : 0);
        }, 0);
        return sum + checkedTotal;
      }
      case "toggle": {
        if (value !== true) return sum;
        const activeOption = extra.options.find((opt) => opt.status === "active");
        return sum + (activeOption ? parsePrice(activeOption.price) : 0);
      }
      case "number": {
        if (typeof value !== "number" || value <= 0) return sum;
        const activeOption = extra.options.find((opt) => opt.status === "active");
        const optionPrice = activeOption ? parsePrice(activeOption.price) : 0;
        return sum + optionPrice * value;
      }
      case "text":
      default:
        return sum;
    }
  }, 0);

  const unitPrice = parsePrice(foodItem?.price) + extrasTotalPerUnit;
  const totalPrice = unitPrice * Math.max(count, 1);

  const handleOptionChange = (extraId: string, value: any) => {
    onExtrasChange({ ...selectedExtras, [extraId]: value });
  };

  const renderExtra = (extra: ProductExtra) => {
    switch (extra.extras_format) {
      case "radio": {
        const selected = selectedExtras[extra.id] as string | undefined;
        return (
          <div className="space-y-2">
            {extra.options
              .filter((o) => o.status === "active")
              .map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    selected === opt.id
                      ? "border-orange bg-orange/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleOptionChange(extra.id, opt.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected === opt.id ? "border-orange" : "border-gray-300"
                      }`}
                    >
                      {selected === opt.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-orange" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{opt.name}</span>
                  </div>
                  {parsePrice(opt.price) > 0 && (
                    <span className="text-sm font-semibold text-orange">
                      +₦{parsePrice(opt.price).toLocaleString()}
                    </span>
                  )}
                </label>
              ))}
          </div>
        );
      }
      case "check": {
        const selections = (selectedExtras[extra.id] as string[]) || [];
        const atMax =
          extra.max_selections > 0 && selections.length >= extra.max_selections;
        return (
          <div className="space-y-2">
            {extra.max_selections > 0 && (
              <p className="text-xs text-gray-400 mb-1">
                Select up to {extra.max_selections}
              </p>
            )}
            {extra.options
              .filter((o) => o.status === "active")
              .map((opt) => {
                const isChecked = selections.includes(opt.id);
                const isDisabled = !isChecked && atMax;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed border-gray-100"
                        : isChecked
                        ? "border-orange bg-orange/5 cursor-pointer"
                        : "border-gray-200 hover:border-gray-300 cursor-pointer"
                    }`}
                    onClick={() => {
                      if (isDisabled) return;
                      const newSel = isChecked
                        ? selections.filter((id) => id !== opt.id)
                        : [...selections, opt.id];
                      handleOptionChange(extra.id, newSel);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          isChecked ? "border-orange bg-orange" : "border-gray-300"
                        }`}
                      >
                        {isChecked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium">{opt.name}</span>
                    </div>
                    {parsePrice(opt.price) > 0 && (
                      <span className="text-sm font-semibold text-orange">
                        +₦{parsePrice(opt.price).toLocaleString()}
                      </span>
                    )}
                  </label>
                );
              })}
          </div>
        );
      }
      case "toggle": {
        const isOn = !!(selectedExtras[extra.id]);
        return (
          <button
            type="button"
            onClick={() => handleOptionChange(extra.id, !isOn)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              isOn ? "bg-orange" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isOn ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        );
      }
      case "text": {
        return (
          <textarea
            value={(selectedExtras[extra.id] as string) || ""}
            onChange={(e) => handleOptionChange(extra.id, e.target.value)}
            placeholder={
              extra.description || `Enter ${extra.title.toLowerCase()}...`
            }
            rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-orange resize-none bg-background"
          />
        );
      }
      case "number": {
        const num = (selectedExtras[extra.id] as number) || 0;
        return (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleOptionChange(extra.id, Math.max(0, num - 1))}
              className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-semibold hover:border-orange transition-colors"
            >
              -
            </button>
            <span className="text-lg font-bold w-8 text-center">{num}</span>
            <button
              type="button"
              onClick={() => handleOptionChange(extra.id, num + 1)}
              className="w-8 h-8 rounded-full border-2 border-orange text-orange flex items-center justify-center text-lg font-semibold transition-colors"
            >
              +
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  };

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
                  ₦{formatCurrency(totalPrice)}
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

              {foodItem?.description && (
                <div className="mt-6">
                  <p className="text-xl font-medium">About</p>
                  <p className="mt-2 text-[#828181] text-[16px] leading-relaxed">
                    {foodItem.description}
                  </p>
                </div>
              )}

              {/* Extras Section */}
              {extras.length > 0 && (
                <div className="mt-6 space-y-4">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-base">{extra.title}</p>
                        {extra.is_required && (
                          <span className="text-xs font-medium bg-orange/10 text-orange px-2 py-0.5 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      {extra.description && (
                        <p className="text-sm text-gray-400 mb-3">
                          {extra.description}
                        </p>
                      )}
                      {renderExtra(extra)}
                    </div>
                  ))}
                </div>
              )}
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
