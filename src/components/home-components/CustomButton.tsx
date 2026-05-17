import React from "react";
import { Button } from "@/src/ui/button";

interface CustomButtonProps {
  title: string;
  others?: string;
  handleClick: () => void;
  disabled?: boolean;
}
const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  others,
  handleClick,
  disabled = false,
}) => {
  return (
    <Button
      type="button"
      disabled={disabled}
      className={`rounded-2xl w-full relative z-30 ${others} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleClick}
    >
      {title}
    </Button>
  );
};

export default CustomButton;
