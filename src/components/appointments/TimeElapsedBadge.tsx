'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getPhilippineTime } from '@/lib/utils/timezone';

interface TimeElapsedBadgeProps {
  timestamp: string | null;
  label: string;
  type?: 'waiting' | 'consulting';
}

export function TimeElapsedBadge({ timestamp, label, type = 'waiting' }: TimeElapsedBadgeProps) {
  const [elapsed, setElapsed] = useState<string>('');
  const [colorClass, setColorClass] = useState<string>('');

  useEffect(() => {
    if (!timestamp) return;

    const updateElapsed = () => {
      // Use Philippine time for elapsed calculation
      const now = getPhilippineTime();
      const start = new Date(timestamp); // UTC timestamp from database
      const diffMs = now.getTime() - start.getTime();

      // Handle future timestamps (scheduled but not yet occurred)
      if (diffMs < 0) {
        setElapsed('Scheduled');
        setColorClass('bg-blue-100 text-blue-800');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);

      // Format elapsed time
      if (diffMins < 1) {
        setElapsed('Just now');
      } else if (diffMins < 60) {
        setElapsed(`${diffMins} min`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setElapsed(`${hours}h ${mins}m`);
      }

      // Set color based on elapsed time and type
      if (type === 'waiting') {
        if (diffMins < 5) {
          setColorClass('bg-green-100 text-green-800');
        } else if (diffMins < 15) {
          setColorClass('bg-yellow-100 text-yellow-800');
        } else {
          setColorClass('bg-red-100 text-red-800');
        }
      } else {
        // Consulting time
        if (diffMins < 20) {
          setColorClass('bg-blue-100 text-blue-800');
        } else if (diffMins < 40) {
          setColorClass('bg-purple-100 text-purple-800');
        } else {
          setColorClass('bg-orange-100 text-orange-800');
        }
      }
    };

    // Update immediately
    updateElapsed();

    // Update every minute
    const interval = setInterval(updateElapsed, 60000);

    return () => clearInterval(interval);
  }, [timestamp, type]);

  if (!timestamp || !elapsed) return null;

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}
      title={
        type === 'waiting'
          ? 'Time elapsed since original check-in (preserved for audit trail and wait time metrics)'
          : 'Time elapsed since consultation started'
      }
    >
      <Clock className="w-3 h-3 mr-1" />
      {label}: {elapsed}
    </div>
  );
}
