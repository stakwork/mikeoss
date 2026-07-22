"use client";

/**
 * EvalRunsBox — displays eval runs and their proposed-fix rows.
 *
 * Super-admins see a StakworkRunLink on every fix row (both the optimistic
 * pending row and every completed fix row).  Non-super-admins see no link.
 */

import { useState } from "react";
import { useProposedFixes, type ProposedFix } from "@/app/hooks/useProposedFixes";
import { StakworkRunLink } from "@/components/legal/StakworkRunLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalRun {
  /** Unique identifier for the eval StakworkRun record. */
  id: string;
  /** The Stakwork run ID (numeric job ID). */
  stakworkRunId: number | string | null;
  /** Human-readable label, e.g. "Run #42 — contracts". */
  label: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Current status of the eval run. */
  status: "pending" | "running" | "completed" | "error";
}

interface EvalRunsBoxProps {
  /** List of eval runs to display. */
  runs: EvalRun[];
  /** Whether the current user is a super-admin. Controls StakworkRunLink visibility. */
  isSuperAdmin: boolean;
  /** Whether the data is still loading. */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function statusLabel(status: EvalRun["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
  }
}

function statusClasses(status: EvalRun["status"]): string {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-600";
    case "running":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "error":
      return "bg-red-100 text-red-700";
  }
}

function fixStatusLabel(status: ProposedFix["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "error":
      return "Error";
  }
}

function fixStatusClasses(status: ProposedFix["status"]): string {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-600";
    case "running":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "error":
      return "bg-red-100 text-red-700";
  }
}

// ---------------------------------------------------------------------------
// FixesTable — renders completed fix rows for a single eval run
// ---------------------------------------------------------------------------

interface FixesTableProps {
  run: EvalRun;
  isSuperAdmin: boolean;
}

function FixesTable({ run, isSuperAdmin }: FixesTableProps) {
  const { fixes, isLoading, error } = useProposedFixes(run.id);

  // Optimistic pending row — shown while the run is still active and we have
  // no completed fixes yet.
  const showOptimisticRow =
    (run.status === "pending" || run.status === "running") && fixes.length === 0;

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400 italic">
        Loading fixes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2 text-xs text-red-500">{error}</div>
    );
  }

  if (!showOptimisticRow && fixes.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400 italic">
        No proposed fixes yet.
      </div>
    );
  }

  return (
    <table className="w-full text-xs border-t border-gray-100">
      <thead>
        <tr className="bg-gray-50 text-gray-500">
          <th className="px-4 py-2 text-left font-medium">Fix</th>
          <th className="px-4 py-2 text-left font-medium">Model</th>
          <th className="px-4 py-2 text-left font-medium">Status</th>
          <th className="px-4 py-2 text-left font-medium">Score</th>
          {isSuperAdmin && (
            <th className="px-4 py-2 text-left font-medium">Stakwork</th>
          )}
        </tr>
      </thead>
      <tbody>
        {/* Optimistic pending row — rendered while the run is still in-flight */}
        {showOptimisticRow && (
          <tr className="border-t border-gray-100 animate-pulse">
            <td className="px-4 py-2 text-gray-400 italic">Pending…</td>
            <td className="px-4 py-2 text-gray-400">—</td>
            <td className="px-4 py-2">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                Pending
              </span>
            </td>
            <td className="px-4 py-2 text-gray-400">—</td>
            {isSuperAdmin && (
              <td className="px-4 py-2">
                {/* Show the run-level link on the optimistic row */}
                <StakworkRunLink runId={run.stakworkRunId} />
              </td>
            )}
          </tr>
        )}

        {/* Completed fix rows */}
        {fixes.map((fix) => (
          <tr key={fix.id} className="border-t border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-2 text-gray-800">{fix.label}</td>
            <td className="px-4 py-2 text-gray-600">{fix.model ?? "—"}</td>
            <td className="px-4 py-2">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs ${fixStatusClasses(fix.status)}`}
              >
                {fixStatusLabel(fix.status)}
              </span>
            </td>
            <td className="px-4 py-2 text-gray-600">
              {fix.score != null ? `${Math.round(fix.score * 100)}%` : "—"}
            </td>
            {isSuperAdmin && (
              <td className="px-4 py-2">
                {/* StakworkRunLink on every completed fix row */}
                <StakworkRunLink runId={fix.stakworkRunId} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// EvalRunRow — a single collapsible eval-run card
// ---------------------------------------------------------------------------

interface EvalRunRowProps {
  run: EvalRun;
  isSuperAdmin: boolean;
}

function EvalRunRow({ run, isSuperAdmin }: EvalRunRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Run header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Expand / collapse chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-none text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          <span className="text-sm font-medium text-gray-900 truncate">
            {run.label}
          </span>

          <span
            className={`flex-none inline-block px-2 py-0.5 rounded-full text-xs ${statusClasses(run.status)}`}
          >
            {statusLabel(run.status)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-none ml-4">
          <span className="text-xs text-gray-400">
            {new Date(run.createdAt).toLocaleDateString()}
          </span>

          {/* Super-admin run-level Stakwork link (always visible in the header) */}
          {isSuperAdmin && run.status !== "pending" && run.status !== "running" && (
            <StakworkRunLink runId={run.stakworkRunId} />
          )}
        </div>
      </button>

      {/* Expandable fixes table */}
      {expanded && (
        <FixesTable run={run} isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvalRunsBox — main export
// ---------------------------------------------------------------------------

export function EvalRunsBox({ runs, isSuperAdmin, isLoading = false }: EvalRunsBoxProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        Loading runs…
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No eval runs yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <EvalRunRow key={run.id} run={run} isSuperAdmin={isSuperAdmin} />
      ))}
    </div>
  );
}
