import Image from "next/image";
import { Input } from "@/src/ui/input";
import SearchIcon from "@/src/assets/svg/dashboard-assets/SearchIcon.svg";

type InputSearchType = {
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  handleChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputClass?: string;
  className?: string;
  name?: string;
};

const AppSearchInput: React.FC<InputSearchType> = ({
  className,
  inputClass,
  value = "",
}) => {
  return (
    <>
      <div
        className={`flex-grow flex items-center rounded-lg text-black focus:border-none focus:outline-0 focus:ring-0  ${className}`}
      >
        <div className="relative w-2/5">
          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <Image src={SearchIcon} alt="search" height={16} />
          </div>
          <Input
            type="search"
            placeholder="Search"
            className={`pl-10 border py-5 bg-[#FCFCFC] focus:border-0 focus:ring-0 focus:outline-none ${inputClass}`}
            required={true}
          />
        </div>
      </div>
    </>
  );
};

export default AppSearchInput;
