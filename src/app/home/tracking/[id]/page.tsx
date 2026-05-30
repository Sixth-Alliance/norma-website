import { Suspense } from "react";
import TrackingPageClient from "./TrackingPageClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return (
    <Suspense>
      <TrackingPageClient />
    </Suspense>
  );
}