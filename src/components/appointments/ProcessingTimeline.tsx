'use client';

import { CheckCircle, Clock, UserCheck, Calendar } from 'lucide-react';
import { getAdminRoleLabel } from '@/lib/utils/serviceHelpers';

interface ProcessingTimelineProps {
  currentStep: 'booking' | 'admin_review' | 'doctor_assignment' | 'confirmed';
  serviceCategory: string;
  compact?: boolean;
}

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

export function ProcessingTimeline({
  currentStep,
  serviceCategory,
  compact = false,
}: ProcessingTimelineProps) {
  const adminRole = getAdminRoleLabel(serviceCategory);

  const steps: TimelineStep[] = [
    {
      id: 'booking',
      label: 'Booking Submitted',
      description: 'Your appointment request has been received',
      icon: CheckCircle,
    },
    {
      id: 'admin_review',
      label: 'Admin Review',
      description: `Our ${adminRole} will review your booking`,
      icon: Clock,
    },
    {
      id: 'doctor_assignment',
      label: 'Doctor Assignment',
      description: 'A qualified doctor will be assigned to your appointment',
      icon: UserCheck,
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      description: "You'll receive a confirmation notification",
      icon: Calendar,
    },
  ];

  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={`w-full ${compact ? 'py-4' : 'py-6'}`}>
      {/* Timeline Steps */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />
        <div
          className="absolute left-4 top-0 w-0.5 bg-primary-teal transition-all duration-500"
          style={{
            height: `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
          aria-hidden="true"
        />

        {/* Steps */}
        <div className="relative space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={step.id} className="relative flex items-start">
                {/* Icon Circle */}
                <div
                  className={`
                    relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all
                    ${
                      isCompleted
                        ? 'border-primary-teal bg-primary-teal'
                        : isActive
                        ? 'border-primary-teal bg-white'
                        : 'border-gray-300 bg-white'
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isCompleted
                        ? 'text-white'
                        : isActive
                        ? 'text-primary-teal'
                        : 'text-gray-400'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <h4
                    className={`text-sm font-semibold ${
                      isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {!compact && (
                    <p
                      className={`mt-1 text-sm ${
                        isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {step.description}
                    </p>
                  )}
                  {isActive && !compact && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-primary-teal/10 px-2.5 py-0.5 text-xs font-medium text-primary-teal">
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-primary-teal animate-pulse" />
                        In Progress
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expected Time */}
      {!compact && currentStep !== 'confirmed' && (
        <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-semibold text-blue-900">Expected Timeline</h5>
              <p className="mt-1 text-sm text-blue-700">
                Your appointment confirmation usually arrives within 24 hours. You'll receive a
                notification once a doctor is assigned.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
