'use client';

import { Popover } from '@/components/ui/Popover';

interface RequirementsDisplayProps {
  requirements: string[];
  maxVisible?: number;
}

export function RequirementsDisplay({
  requirements,
  maxVisible = 2
}: RequirementsDisplayProps) {
  // No requirements case
  if (!requirements || requirements.length === 0) {
    return (
      <span className="text-xs text-gray-400">No requirements</span>
    );
  }

  // Show all requirements if within limit
  if (requirements.length <= maxVisible) {
    return (
      <div className="flex flex-wrap gap-1">
        {requirements.map((req, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
          >
            {req}
          </span>
        ))}
      </div>
    );
  }

  // Show first N requirements + expandable popover for rest
  const visibleRequirements = requirements.slice(0, maxVisible);
  const hiddenRequirements = requirements.slice(maxVisible);

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {/* First N requirements */}
      {visibleRequirements.map((req, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
        >
          {req}
        </span>
      ))}

      {/* Expandable "+N more" button */}
      <Popover
        trigger={
          <button
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label={`Show ${hiddenRequirements.length} more requirements`}
          >
            +{hiddenRequirements.length} more
          </button>
        }
      >
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            All Requirements ({requirements.length})
          </h4>
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {requirements.map((req, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-700 flex items-start"
              >
                <span className="text-amber-600 mr-2 flex-shrink-0">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </div>
  );
}
