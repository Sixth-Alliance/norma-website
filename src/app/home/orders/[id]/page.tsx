import { Suspense } from "react";
import OrderDetailPageClient from "./OrderDetailPageClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return (
    <Suspense>
      <OrderDetailPageClient />
    </Suspense>
  );
}