import Image from "next/image";
import React from "react";
import FrameImage from "@/src/assets/images/frame-10.svg";

const Ads = () => {
  return (
    <div className="relative w-full h-[108px] rounded-xl mt-8 md:hidden">
      <Image
        src={FrameImage}
        alt="Advertisement"
        fill
        style={{ objectFit: "cover" }}
        className="rounded-xl"
      />
    </div>
  );
};

export default Ads;
