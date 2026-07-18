"use client";

import { use, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LegalBenchmarksPanel } from "@/components/legal/LegalBenchmarksPanel";

const VALID_TABS = ["benchmark", "runs", "recursion"] as const;
type Tab = (typeof VALID_TABS)[number];

interface Props {
  params: Promise<{ slug: string }>;
}

export default function LegalBenchmarksPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "benchmark";

  // Normalise invalid tab values in the URL (run once after mount).
  useEffect(() => {
    if (rawTab && !VALID_TABS.includes(rawTab as Tab)) {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", "benchmark");
      router.replace(`${pathname}?${p.toString()}`);
    }
  }, []); // intentionally empty — fires once on mount to sanitise a bad URL

  // Single owner of ALL URL writes for this page.
  function handleTabChange(value: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", value);
    router.replace(`${pathname}?${p.toString()}`);
  }

  function handleAreaChange(areaSlug: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("area", areaSlug);
    router.replace(`${pathname}?${p.toString()}`);
  }

  const areaParam = searchParams.get("area") ?? "";

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col h-full">
      <TabsList>
        <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
        <TabsTrigger value="runs">Runs</TabsTrigger>
        <TabsTrigger value="recursion">Recursion</TabsTrigger>
      </TabsList>
      <TabsContent value="benchmark" className="flex-1 min-h-0">
        <LegalBenchmarksPanel
          slug={slug}
          areaParam={areaParam}
          onAreaChange={handleAreaChange}
        />
      </TabsContent>
      {/* TabsContent for "runs" and "recursion" as needed */}
    </Tabs>
  );
}
