'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';

export type AppointmentStage = 'verification' | 'laboratory' | 'results' | 'checkup' | 'releasing';

interface AppointmentStageTrackerProps {
  currentStage: AppointmentStage | null;
  isHealthCardService: boolean;
  isVerified: boolean;
  isCompleted?: boolean;
}

const STAGES: { id: AppointmentStage; label: string; description: string }[] = [
  {
    id: 'verification',
    label: 'Verification',
    description: 'Patient verified at facility',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Laboratory tests in progress',
  },
  {
    id: 'results',
    label: 'Results',
    description: 'Test results ready for review',
  },
  {
    id: 'checkup',
    label: 'Check-up',
    description: 'Doctor consultation and approval',
  },
  {
    id: 'releasing',
    label: 'Releasing',
    description: 'Health card issued and completed',
  },
];

export default function AppointmentStageTracker({
  currentStage,
  isHealthCardService,
  isVerified,
  isCompleted = false,
}: AppointmentStageTrackerProps) {
  // Only show for health card services after verification
  if (!isHealthCardService || !isVerified) {
    return null;
  }

  const getCurrentStageIndex = () => {
    if (!currentStage) return 0;
    return STAGES.findIndex((s) => s.id === currentStage);
  };

  const currentIndex = getCurrentStageIndex();

  const getStageStatus = (index: number): 'completed' | 'current' | 'pending' => {
    // If appointment is completed, show all stages as completed
    if (isCompleted) return 'completed';

    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-gradient-to-br from-primary-teal/5 to-blue-50 rounded-lg p-6 border border-primary-teal/20">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-primary-teal" />
        <h3 className="text-lg font-semibold text-gray-900">Appointment Progress</h3>
      </div>

      <div className="space-y-4">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(index);
          const isLast = index === STAGES.length - 1;

          return (
            <div key={stage.id} className="relative">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : status === 'current' ? (
                    <div className="relative">
                      <Circle className="w-6 h-6 text-primary-teal animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-teal rounded-full" />
                      </div>
                    </div>
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium ${
                        status === 'completed'
                          ? 'text-green-700'
                          : status === 'current'
                          ? 'text-primary-teal'
                          : 'text-gray-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {status === 'completed' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Completed
                      </span>
                    )}
                    {status === 'current' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary-teal/10 text-primary-teal rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-0.5 ${
                      status === 'pending' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="ml-3 mt-2 mb-2 pl-0.5">
                  <div
                    className={`w-0.5 h-8 ${
                      status === 'completed' ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Note:</span> Your health card will be issued once all stages
          are completed and approved by the healthcare staff.
        </p>
      </div>
    </div>
  );
}
