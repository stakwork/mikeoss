/**
 * Unit tests for legal benchmarks URL state persistence logic.
 *
 * Covers:
 * - VALID_TABS guard: invalid tab value falls back to "benchmark"
 * - selectedArea derivation: unrecognised slug and missing param both fall back to first area
 * - handleScroll debounce: only one sessionStorage.setItem call fires per scroll burst
 * - Scroll restore guard: hasRestoredScroll ref prevents second restoration when isLoading pulses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers mirroring the production logic exactly
// ---------------------------------------------------------------------------

const VALID_TABS = ["benchmark", "runs", "recursion"] as const;
type Tab = (typeof VALID_TABS)[number];

function resolveTab(rawTab: string | null): Tab {
  return VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "benchmark";
}

interface PracticeArea {
  slug: string;
  name: string;
}
interface BenchmarksData {
  practice_areas: PracticeArea[];
}

function resolveSelectedArea(
  areaParam: string,
  data: BenchmarksData | null,
): string {
  if (!data) return "";
  return areaParam && data.practice_areas.some((a) => a.slug === areaParam)
    ? areaParam
    : (data.practice_areas[0]?.slug ?? "");
}

/**
 * Minimal simulation of the debounced scroll handler.
 * Returns a handle object so tests can inspect calls and advance timers.
 */
function makeScrollHandler(
  scrollKey: string,
  getScrollTop: () => number,
) {
  let debounceId: ReturnType<typeof setTimeout> | null = null;

  function handleScroll() {
    if (debounceId !== null) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      sessionStorage.setItem(scrollKey, String(getScrollTop()));
    }, 150);
  }

  function cleanup() {
    if (debounceId !== null) clearTimeout(debounceId);
  }

  return { handleScroll, cleanup };
}

/**
 * Minimal simulation of the scroll-restore guard.
 */
function makeScrollRestoreGuard(scrollKey: string) {
  const hasRestoredScroll = { current: false };
  let restoredCount = 0;

  function tryRestore(isLoading: boolean, hasRef: boolean): boolean {
    if (isLoading || !hasRef || hasRestoredScroll.current) return false;
    hasRestoredScroll.current = true;
    const saved = sessionStorage.getItem(scrollKey);
    if (saved) {
      restoredCount++;
      return true;
    }
    return false;
  }

  return { tryRestore, getRestoredCount: () => restoredCount };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VALID_TABS guard", () => {
  it("returns the tab unchanged when it is valid", () => {
    expect(resolveTab("benchmark")).toBe("benchmark");
    expect(resolveTab("runs")).toBe("runs");
    expect(resolveTab("recursion")).toBe("recursion");
  });

  it("falls back to 'benchmark' for an invalid tab value", () => {
    expect(resolveTab("invalid")).toBe("benchmark");
    expect(resolveTab("BENCHMARK")).toBe("benchmark");
    expect(resolveTab("foo")).toBe("benchmark");
  });

  it("falls back to 'benchmark' when the tab param is null (absent)", () => {
    expect(resolveTab(null)).toBe("benchmark");
  });

  it("falls back to 'benchmark' for an empty string", () => {
    expect(resolveTab("")).toBe("benchmark");
  });
});

describe("selectedArea derivation", () => {
  const areas: PracticeArea[] = [
    { slug: "contracts", name: "Contracts" },
    { slug: "litigation", name: "Litigation" },
  ];
  const data: BenchmarksData = { practice_areas: areas };

  it("returns the areaParam when it matches a known slug", () => {
    expect(resolveSelectedArea("litigation", data)).toBe("litigation");
  });

  it("falls back to the first area when areaParam is unrecognised", () => {
    expect(resolveSelectedArea("unknown-slug", data)).toBe("contracts");
  });

  it("falls back to the first area when areaParam is absent (empty string)", () => {
    expect(resolveSelectedArea("", data)).toBe("contracts");
  });

  it("returns empty string when data has no practice areas", () => {
    expect(resolveSelectedArea("", { practice_areas: [] })).toBe("");
    expect(resolveSelectedArea("contracts", { practice_areas: [] })).toBe("");
  });

  it("returns empty string when data is null (not yet loaded)", () => {
    expect(resolveSelectedArea("contracts", null)).toBe("");
  });
});

describe("handleScroll debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("writes to sessionStorage only once per burst of scroll events", () => {
    let scrollTop = 0;
    const { handleScroll, cleanup } = makeScrollHandler(
      "legal-bench-area-scroll:my-workspace",
      () => scrollTop,
    );

    const setSpy = vi.spyOn(Storage.prototype, "setItem");

    // Simulate rapid scrolling
    scrollTop = 100;
    handleScroll();
    scrollTop = 200;
    handleScroll();
    scrollTop = 300;
    handleScroll();

    // Before debounce fires — nothing written yet
    expect(setSpy).not.toHaveBeenCalled();

    // Advance past the 150ms debounce
    vi.advanceTimersByTime(200);

    // Only one write, with the final scroll position
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(
      "legal-bench-area-scroll:my-workspace",
      "300",
    );

    cleanup();
    setSpy.mockRestore();
  });

  it("does not write if cleanup is called within the debounce window (unmount scenario)", () => {
    let scrollTop = 0;
    const { handleScroll, cleanup } = makeScrollHandler(
      "legal-bench-area-scroll:my-workspace",
      () => scrollTop,
    );

    const setSpy = vi.spyOn(Storage.prototype, "setItem");

    scrollTop = 50;
    handleScroll();

    // Unmount before 150ms
    cleanup();
    vi.advanceTimersByTime(200);

    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it("resets the debounce timer on each new scroll event", () => {
    let scrollTop = 0;
    const { handleScroll, cleanup } = makeScrollHandler(
      "legal-bench-area-scroll:my-workspace",
      () => scrollTop,
    );

    const setSpy = vi.spyOn(Storage.prototype, "setItem");

    scrollTop = 100;
    handleScroll();
    vi.advanceTimersByTime(100); // not yet fired

    scrollTop = 200;
    handleScroll(); // resets the timer
    vi.advanceTimersByTime(100); // still not fired (only 100ms since last scroll)

    expect(setSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60); // now 160ms since last scroll event — should fire
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(
      "legal-bench-area-scroll:my-workspace",
      "200",
    );

    cleanup();
    setSpy.mockRestore();
  });
});

describe("scroll restore guard (hasRestoredScroll)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("restores scroll on the first load", () => {
    const key = "legal-bench-area-scroll:ws1";
    sessionStorage.setItem(key, "250");

    const { tryRestore, getRestoredCount } = makeScrollRestoreGuard(key);

    const restored = tryRestore(false, true);
    expect(restored).toBe(true);
    expect(getRestoredCount()).toBe(1);
  });

  it("does NOT restore scroll a second time when isLoading pulses (re-fetch scenario)", () => {
    const key = "legal-bench-area-scroll:ws2";
    sessionStorage.setItem(key, "400");

    const { tryRestore, getRestoredCount } = makeScrollRestoreGuard(key);

    // First call: data has loaded
    tryRestore(false, true);
    expect(getRestoredCount()).toBe(1);

    // Simulate background re-fetch: isLoading goes true → false again
    const restoredOnRefetch = tryRestore(false, true);
    expect(restoredOnRefetch).toBe(false); // guard blocks second restoration
    expect(getRestoredCount()).toBe(1);
  });

  it("does not restore when isLoading is true", () => {
    const key = "legal-bench-area-scroll:ws3";
    sessionStorage.setItem(key, "100");

    const { tryRestore, getRestoredCount } = makeScrollRestoreGuard(key);

    expect(tryRestore(true, true)).toBe(false);
    expect(getRestoredCount()).toBe(0);
  });

  it("does not restore when the scroll ref is not yet attached", () => {
    const key = "legal-bench-area-scroll:ws4";
    sessionStorage.setItem(key, "100");

    const { tryRestore, getRestoredCount } = makeScrollRestoreGuard(key);

    expect(tryRestore(false, false)).toBe(false);
    expect(getRestoredCount()).toBe(0);
  });

  it("returns false (no-op) when there is no saved scroll position", () => {
    const key = "legal-bench-area-scroll:ws5";
    // No sessionStorage entry set

    const { tryRestore, getRestoredCount } = makeScrollRestoreGuard(key);

    const restored = tryRestore(false, true);
    expect(restored).toBe(false);
    expect(getRestoredCount()).toBe(0);
  });
});
