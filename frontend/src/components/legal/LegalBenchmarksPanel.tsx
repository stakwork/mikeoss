"use client";

import { useEffect, useRef, useState } from "react";

export interface PracticeArea {
  slug: string;
  name: string;
}

export interface BenchmarksData {
  practice_areas: PracticeArea[];
}

interface LegalBenchmarksPanelProps {
  slug: string;
  areaParam: string; // raw URL param value from parent
  onAreaChange: (slug: string) => void;
}

/**
 * Fetches and displays legal benchmark data for a workspace.
 * Practice area selection is owned by the parent via areaParam / onAreaChange.
 * Sidebar scroll position is persisted to sessionStorage with a 150ms debounce.
 */
export function LegalBenchmarksPanel({
  slug,
  areaParam,
  onAreaChange,
}: LegalBenchmarksPanelProps) {
  const [data, setData] = useState<BenchmarksData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll persistence
  const scrollKey = `legal-bench-area-scroll:${slug}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredScroll = useRef(false); // guard: restore only on the first load, not on re-fetches

  // Derive the effective selected area from the URL param + loaded data.
  const selectedArea =
    areaParam && data?.practice_areas.some((a) => a.slug === areaParam)
      ? areaParam
      : (data?.practice_areas[0]?.slug ?? "");

  // Load benchmark data for this workspace slug.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Placeholder fetch — replace with real API call when backend endpoint exists.
    const loadData = async () => {
      try {
        // TODO: replace with real API call, e.g. getLegalBenchmarks(slug)
        // Simulating an async load with empty practice areas until backend exists.
        await Promise.resolve();
        if (!cancelled) {
          setData({ practice_areas: [] });
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load benchmarks.");
          setIsLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Normalise unrecognised or absent ?area= once data loads.
  useEffect(() => {
    if (isLoading || !data) return;
    if (areaParam && !data.practice_areas.some((a) => a.slug === areaParam)) {
      onAreaChange(data.practice_areas[0]?.slug ?? "");
    } else if (!areaParam && data.practice_areas[0]?.slug) {
      onAreaChange(data.practice_areas[0].slug);
    }
  }, [isLoading, data]); // runs only when data availability changes

  // Restore scroll once, after data first becomes available.
  useEffect(() => {
    if (isLoading || !scrollRef.current || hasRestoredScroll.current) return;
    hasRestoredScroll.current = true;
    const saved = sessionStorage.getItem(scrollKey);
    if (saved) {
      const target = Number(saved);
      // Defer to after layout paint — synchronous assignment can silently clamp to 0.
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = target;
      });
    }
  }, [isLoading, scrollKey]);

  // Cancel any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleScroll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (scrollRef.current) {
        sessionStorage.setItem(scrollKey, String(scrollRef.current.scrollTop));
      }
    }, 150);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Practice area sidebar */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-none w-56 border-r border-gray-200 flex-1 min-h-0 overflow-y-auto"
      >
        {isLoading ? (
          <div className="p-4 text-sm text-gray-400">Loading…</div>
        ) : data && data.practice_areas.length > 0 ? (
          <ul className="py-2">
            {data.practice_areas.map((area) => (
              <li key={area.slug}>
                <button
                  type="button"
                  onClick={() => onAreaChange(area.slug)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
                    selectedArea === area.slug
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-700"
                  }`}
                >
                  {area.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-sm text-gray-400">No practice areas.</div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-sm text-gray-400">Loading benchmarks…</div>
        ) : selectedArea ? (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {data?.practice_areas.find((a) => a.slug === selectedArea)?.name ?? selectedArea}
            </h2>
            <p className="text-sm text-gray-500">
              Benchmark results for this practice area will appear here.
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Select a practice area to view benchmarks.</div>
        )}
      </div>
    </div>
  );
}
