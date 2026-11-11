import { Suspense } from "react";
import { ModulePage } from "@/components/ModulePage";
import { MODULES } from "@/modules/pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(MODULES).map((module) => ({ module }));
}

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module: slug } = await params;
  return (
    <Suspense>
      <ModulePage slug={slug} />
    </Suspense>
  );
}
