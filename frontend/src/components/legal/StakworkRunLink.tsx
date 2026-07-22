"use client";

/**
 * StakworkRunLink — super-admin-only link to a Stakwork run page.
 *
 * Renders an anchor that opens the Stakwork run in a new tab.
 * The caller is responsible for the super-admin gate; this component
 * renders nothing when `runId` is null/undefined.
 */

interface StakworkRunLinkProps {
  runId: number | string | null | undefined;
}

const STAKWORK_RUN_BASE_URL = "https://jobs.stakwork.com/admin/projects";

export function StakworkRunLink({ runId }: StakworkRunLinkProps) {
  if (runId == null || runId === "") return null;

  const href = `${STAKWORK_RUN_BASE_URL}/${runId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      SW #{runId}
    </a>
  );
}
