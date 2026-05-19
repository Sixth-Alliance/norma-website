import type React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/src/ui/dialog";
import Image, { StaticImageData } from "next/image";
import Image5 from "@/src/assets/images/image_food.svg";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";
import { X } from "lucide-react";
import CustomButton from "../CustomButton";
import { formatCurrency } from "@/src/lib/utils";
import type { ProductExtra } from "@/src/app/api/action";

interface FoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodItem?: {
    id: string;
    title: string;
    sub_title: string;
    price: number;
    delivery_time: string;
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

const parsePrice = (price: string): number => {
  const n = parseFloat(price);
  return isNaN(n) ? 0 : n;
};

const FoodModal: React.FC<FoodModalProps> = ({
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
              onClick={() =>
                handleOptionChange(extra.id, Math.max(0, num - 1))
              }
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

              {foodItem?.description && (
                <div className="mt-5">
                  <p className="mt-2 text-[#656565] text-lg">
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
