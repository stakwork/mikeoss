/**
 * useProposedFixes — fetches completed proposed-fix rows for a given eval run.
 *
 * Each ProposedFix carries the stakworkRunId from its parent eval StakworkRun
 * record so that super-admins can link directly to the Stakwork job.
 */

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProposedFixStatus = "pending" | "running" | "completed" | "error";

export interface ProposedFix {
  /** Unique identifier for this proposed fix row. */
  id: string;
  /** The eval run this fix belongs to. */
  evalRunId: string;
  /** The Stakwork run ID from the parent eval StakworkRun record. */
  stakworkRunId: number | string | null;
  /** Short label for the fix (e.g. "Fix attempt #1"). */
  label: string;
  /** Model that produced this fix. */
  model: string | null;
  /** Pass/fail status after applying the fix to the benchmark. */
  status: ProposedFixStatus;
  /** Score (0-1) if the benchmark was scored. */
  score: number | null;
  /** ISO timestamp of when the fix was created. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseProposedFixesResult {
  fixes: ProposedFix[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Returns the proposed fixes for a given eval run ID.
 *
 * Today the data is fetched from a placeholder — replace `loadFixes` with a
 * real API call (e.g. `getEvalRunFixes(evalRunId)`) once the backend endpoint
 * exists.
 */
export function useProposedFixes(evalRunId: string | null): UseProposedFixesResult {
  const [fixes, setFixes] = useState<ProposedFix[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!evalRunId) {
      setFixes([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadFixes = async () => {
      try {
        // TODO: replace with real API call, e.g.:
        //   const data = await getEvalRunFixes(evalRunId);
        //   if (!cancelled) { setFixes(data); }
        //
        // The response must include stakworkRunId on each fix row, joined from
        // the parent StakworkRun record.  Example backend query shape:
        //
        //   SELECT pf.*, sr.stakwork_run_id AS stakwork_run_id
        //   FROM proposed_fixes pf
        //   JOIN stakwork_runs sr ON sr.id = pf.eval_run_id
        //   WHERE pf.eval_run_id = $1

        await Promise.resolve(); // placeholder async boundary
        if (!cancelled) {
          setFixes([]);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load fixes.");
          setIsLoading(false);
        }
      }
    };

    void loadFixes();
    return () => {
      cancelled = true;
    };
  }, [evalRunId, generation]);

  const reload = () => setGeneration((g) => g + 1);

  return { fixes, isLoading, error, reload };
}
