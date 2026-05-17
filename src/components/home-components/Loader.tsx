import { Skeleton } from "@/src/ui/skeleton";
import React from "react";

const Loader = () => {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[125px] w-[330px] md:w-[500px] rounded-xl" />
      {/* <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div> */}
    </div>
  );
};

export default Loader;
