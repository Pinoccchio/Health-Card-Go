'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, FileText } from 'lucide-react';

interface ServiceRequirementsProps {
  requirements: string[];
  className?: string;
}

export function ServiceRequirements({ requirements, className = '' }: ServiceRequirementsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // No requirements case
  if (!requirements || requirements.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No special requirements
      </div>
    );
  }

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent parent button click
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter or Space to toggle
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(e);
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <div
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
        aria-controls="requirements-list"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">
            Requirements to Bring ({requirements.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {/* Expandable requirements list */}
      {isExpanded && (
        <div
          id="requirements-list"
          className="px-4 py-3 bg-white border-t border-gray-200"
        >
          <ul className="space-y-2.5">
            {requirements.map((requirement, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{requirement}</span>
              </li>
            ))}
          </ul>

          {/* Helpful tip */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="font-medium">💡 Tip:</span>
              <span>Bring these documents to avoid rescheduling your appointment</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
