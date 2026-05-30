import OutletDetailPageClient from "./OutletDetailPageClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <OutletDetailPageClient />;
}