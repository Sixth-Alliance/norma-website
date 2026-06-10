import React from "react";
import { formatCurrency } from "@/src/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/src/ui/dialog";
import { X } from "lucide-react";
import CustomButton from "../CustomButton";
import CheckOutCard from "./CheckOutCard";

interface CartItem {
	id: string;
	title: string;
	sub_title: string;
	basePrice: number;
	delivery_time: string;
	image: any;
	quantity: number;
	totalAmount: number;
	backendCartItemId?: string;
	extras_total?: number;
	extras?: Array<{ option_name: string; extra_title: string; option_unit_price?: string; line_total?: string; quantity?: number }> | null;
}

interface checkModalProps {
	isOpen: boolean;
	onClose: (open: boolean) => void;
	cartItems: CartItem[];
	grandTotal: number;
	deliveryFee?: number;
	handleIncrement: (itemId: string) => void;
	handleDecrement: (itemId: string) => void;
	handleLoveClick: (itemId: string) => void;
	onCheckout: () => void;
	selectedMethod?: string | null;
	deliveryAddress?: string;
	calculatingFee?: boolean;
	isProcessingPayment?: boolean;
}

const CheckOutDesktop: React.FC<checkModalProps> = ({
	isOpen,
	onClose,
	cartItems,
	grandTotal,
	deliveryFee = 0,
	handleIncrement,
	handleDecrement,
	handleLoveClick,
	onCheckout,
	selectedMethod,
	deliveryAddress,
	calculatingFee = false,
	isProcessingPayment = false,
}) => {
	const subtotal = grandTotal;
	const vat = subtotal * 0.075;
	const total = subtotal + deliveryFee + vat;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg w-[100vw] bg-transparent fixed py-5 border-0 right-0 top-0 bottom-0 left-auto translate-x-0! translate-y-0! data-[state=open]:translate-x-0! overflow-hidden">
				<div className="bg-background p-0 rounded-2xl relative flex flex-col overflow-y-auto">
					{/* Close button */}
					<button
						onClick={() => onClose(false)}
						className="absolute top-4 right-4 z-20 bg-background-dark/80 rounded-full p-2 hover:bg-background-lighter transition-colors"
					>
						<X size={20} />
					</button>

					<DialogTitle></DialogTitle>

					<div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-5 pb-5 mt-10">
						<div className="grid grid-cols-1 gap-3 mt-10 mb-5">
							{cartItems.map((item) => (
								<CheckOutCard
									key={item.backendCartItemId ?? item.id}
									handleLoveClick={() => handleLoveClick(item.id)}
									image={item.image}
									title={item.title}
									sub_title={item.sub_title}
									price={item.basePrice.toLocaleString()}
									amount={item.totalAmount}
									delivery_time={item.delivery_time}
									handleDecrement={() => handleDecrement(item.id)}
									handleIncrement={() => handleIncrement(item.id)}
									quantity={item.quantity}
								extras={item.extras}
								extras_total={item.extras_total}
								/>
							))}
						</div>

						{/* Summary Section */}
						<div className="bg-background-dark mt-8 p-3 mx-5 rounded-lg">
							{selectedMethod && (
								<div className="mb-4 p-3 bg-background rounded-lg border">
									<p className="text-sm font-medium text-foreground-lighter">Delivery Method:</p>
									<p className="text-lg font-semibold capitalize">{selectedMethod}</p>
									{selectedMethod === "delivery" && deliveryAddress && (
										<p className="text-sm text-foreground-lighter mt-1">{deliveryAddress}</p>
									)}
								</div>
							)}

							<div className="flex justify-between items-center mb-3">
								<p className="text-lg font-medium">Subtotal:</p>
								<p className="text-lg font-medium">
									₦{formatCurrency(subtotal)}
								</p>
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
								<p className="text-lg font-medium">₦{formatCurrency(vat)}</p>
							</div>

							<div className="border border-dashed border-[#CFCFCF] my-3"></div>

							<div className="flex justify-between items-center">
								<p className="text-xl font-extrabold">Total</p>
								<p className="text-xl font-extrabold">₦{formatCurrency(total)}</p>
							</div>
						</div>

						<div className="mx-5">
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
								others={`mt-5 py-5 w-full ${calculatingFee || isProcessingPayment
										? "opacity-50 cursor-not-allowed"
										: ""
									}`}
							/>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default CheckOutDesktop;
