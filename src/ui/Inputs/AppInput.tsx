import React from "react";
import { Input } from "../input";

const AppInput = ({
  value,
  type,
  label,
  placeholder,
  className,
  inputClassName,
  labelClassName,
  errorMessage,
}: any) => {
  return (
    <div className={`${className} flex flex-col gap-2`}>
      {label && (
        <label htmlFor={label} className={`${labelClassName} font-medium`}>
          {label}
        </label>
      )}
      <Input
        id={label}
        type={type}
        placeholder={placeholder}
        className={`${inputClassName} px-5 py-6 rounded-xl bg-background outline-none border-none placeholder:text-foreground-lighter placeholder:font-normal focus:outline-none`}
      />
      {/* {errorMessage && (
        <p className="text-gold-500 text-sm italic">{errorMessage}</p>
      )} */}
    </div>
  );
};

export default AppInput;
