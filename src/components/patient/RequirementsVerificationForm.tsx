'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react';
import {
  RequirementType,
  REQUIREMENT_TYPES,
  LabLocationType,
  LAB_LOCATIONS,
  AppointmentRequirement,
} from '@/types/appointment';

interface RequirementsVerificationFormProps {
  /** Lab location determines which requirements are needed */
  labLocation: LabLocationType;

  /** Callback when all required requirements are confirmed */
  onRequirementsConfirmed: (requirements: AppointmentRequirement[]) => void;

  /** Appointment ID (if appointment already created) */
  appointmentId?: string;

  /** Whether to disable the form */
  disabled?: boolean;
}

interface RequirementState {
  isConfirmed: boolean;
  confirmedAt: string | null;
}

/**
 * RequirementsVerificationForm Component
 * Replaces DocumentUploadForm with checkbox-based verification
 * Patient confirms they have the required documents (no file upload)
 */
export function RequirementsVerificationForm({
  labLocation,
  onRequirementsConfirmed,
  appointmentId,
  disabled = false,
}: RequirementsVerificationFormProps) {
  // Get required requirements for this lab location
  const requiredRequirements = LAB_LOCATIONS[labLocation].requirements;
  const requirementLabels = LAB_LOCATIONS[labLocation].requirementLabels;

  // State for each requirement
  const [requirements, setRequirements] = useState<Record<RequirementType, RequirementState>>(() => {
    const initialState: Record<RequirementType, RequirementState> = {} as any;
    requiredRequirements.forEach((type) => {
      initialState[type] = {
        isConfirmed: false,
        confirmedAt: null,
      };
    });
    return initialState;
  });

  const hasNotifiedComplete = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Monitor requirements state and submit to backend when all are confirmed
  useEffect(() => {
    const allConfirmed = requiredRequirements.every((type) => requirements[type]?.isConfirmed);

    if (allConfirmed && !hasNotifiedComplete.current && appointmentId) {
      // Submit requirements to backend (for persistence)
      submitRequirements();
    } else if (!allConfirmed) {
      hasNotifiedComplete.current = false;
    }
  }, [requirements, requiredRequirements, appointmentId]);

  // Handle checkbox change
  const handleCheckboxChange = (requirementType: RequirementType, checked: boolean) => {
    const newRequirements = {
      ...requirements,
      [requirementType]: {
        isConfirmed: checked,
        confirmedAt: checked ? new Date().toISOString() : null,
      },
    };
    setRequirements(newRequirements);

    // Notify parent of current checkbox state (for validation)
    // Convert to AppointmentRequirement-like objects for the parent to track
    const confirmedList = requiredRequirements
      .filter((type) => newRequirements[type]?.isConfirmed)
      .map((type) => ({
        id: `local-${type}`,
        appointment_id: appointmentId || '',
        file_type: type,
        requirement_label: requirementLabels[type],
        is_checkbox_verified: true,
        checkbox_verified_at: newRequirements[type]?.confirmedAt || null,
        uploaded_by_id: '',
        verification_status: 'pending' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    // Always notify parent of current state (even if not all confirmed)
    onRequirementsConfirmed(confirmedList);
  };

  // Submit requirements to backend (for persistence only)
  const submitRequirements = async () => {
    if (!appointmentId) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: requiredRequirements.map((type) => ({
            type,
            label: requirementLabels[type],
            isConfirmed: requirements[type].isConfirmed,
            confirmedAt: requirements[type].confirmedAt,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm requirements');
      }

      hasNotifiedComplete.current = true;
      // Note: Parent state is already updated via handleCheckboxChange
      // We don't need to call onRequirementsConfirmed again here
    } catch (err: any) {
      console.error('Error submitting requirements:', err);
      setError(err.message || 'Failed to confirm requirements');
      hasNotifiedComplete.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if all requirements are confirmed
  const allConfirmed = requiredRequirements.every((type) => requirements[type]?.isConfirmed);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Requirements
        </h3>
        <p className="text-sm text-gray-600">
          Please confirm you have the following requirements. These will be verified during check-in.
        </p>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-4">
        {requiredRequirements.map((requirementType) => {
          const state = requirements[requirementType];
          const typeInfo = REQUIREMENT_TYPES[requirementType];
          const label = requirementLabels[requirementType];

          return (
            <div
              key={requirementType}
              className={`
                border rounded-lg p-4 transition-all
                ${state.isConfirmed
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-primary-teal/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={state.isConfirmed}
                    onChange={(e) => !disabled && handleCheckboxChange(requirementType, e.target.checked)}
                    disabled={disabled}
                    className="w-5 h-5 text-primary-teal rounded border-gray-300 focus:ring-primary-teal cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {typeInfo.checkboxLabel}
                    </span>
                    {state.isConfirmed && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {typeInfo.description}
                  </p>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Confirmation Status */}
      {allConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                All requirements confirmed
              </p>
              <p className="text-xs text-green-700 mt-1">
                Please bring these documents on your appointment day for verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          <ClipboardCheck className="w-4 h-4 inline mr-1" />
          Important Reminders:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 ml-5">
          <li>- Bring all confirmed requirements on your appointment day</li>
          <li>- Staff will verify your documents during check-in</li>
          <li>- Original documents are required (no photocopies)</li>
          <li>- Keep your payment receipt for your records</li>
        </ul>
      </div>
    </div>
  );
}
