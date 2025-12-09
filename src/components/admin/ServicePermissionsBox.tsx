'use client';

import { Check, X, AlertTriangle, Shield } from 'lucide-react';
import { getServicePermissions, getPermissionBoxColors, ServiceProperties } from '@/lib/utils/permissionHelpers';

interface ServicePermissionsBoxProps {
  service: ServiceProperties | null;
  className?: string;
}

export default function ServicePermissionsBox({ service, className = '' }: ServicePermissionsBoxProps) {
  const permissions = getServicePermissions(service);
  const colors = getPermissionBoxColors(permissions.confidentialityLevel, service?.category);

  return (
    <div className={`rounded-lg border-2 overflow-hidden ${colors.bgColor} ${colors.borderColor} ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${colors.headerBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`text-sm font-bold ${colors.headerText}`}>
              Role: Healthcare Admin
            </p>
          </div>
          {permissions.confidentialityLevel === 'high' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-200 rounded-md">
              <Shield className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-semibold text-purple-900">CONFIDENTIAL</span>
            </div>
          )}
        </div>

        {/* Service Name and Description */}
        {permissions.serviceName ? (
          <div className="mt-2">
            <h3 className={`text-base font-bold ${colors.headerText}`}>
              {permissions.serviceName}
            </h3>
            {permissions.serviceDescription && (
              <p className={`text-xs ${colors.headerText} opacity-80 mt-1`}>
                {permissions.serviceDescription}
              </p>
            )}

            {/* Service Property Badges */}
            {service && (
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Appointment vs Walk-in Badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                  service.requires_appointment
                    ? 'bg-teal-200 text-teal-900'
                    : 'bg-blue-200 text-blue-900'
                }`}>
                  {service.requires_appointment ? '📅 Appointment-based' : '🚶 Walk-in'}
                </span>

                {/* Medical Records Badge */}
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                  service.requires_medical_record
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  📋 Medical Records: {service.requires_medical_record ? 'Yes' : 'No'}
                </span>

                {/* Duration Badge */}
                {service.duration_minutes && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-amber-200 text-amber-900">
                    ⏱️ {service.duration_minutes} minutes
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className={`text-xs ${colors.headerText} opacity-80 mt-1`}>
            {permissions.serviceType}
          </p>
        )}
      </div>

      {/* Warnings */}
      {permissions.warnings.length > 0 && (
        <div className={`mx-4 mt-3 p-3 rounded-lg border ${colors.warningBg} ${colors.warningBorder}`}>
          {permissions.warnings.map((warning, index) => (
            <div key={index} className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.warningText}`} />
              <p className={`text-xs font-medium ${colors.warningText}`}>{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Permissions Content */}
      <div className="px-4 py-3 space-y-3">
        {/* CAN DO */}
        <div>
          <p className={`text-sm font-bold ${colors.headerText} mb-2 flex items-center gap-1.5`}>
            <Check className={`w-4 h-4 ${colors.canIconColor}`} />
            This admin CAN:
          </p>
          <ul className="space-y-1.5">
            {permissions.can.map((permission) => (
              <li key={permission.id} className="flex items-start gap-2">
                <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.canIconColor}`} />
                <span className={`text-xs ${colors.headerText}`}>
                  {permission.text}
                  {permission.importance === 'high' && (
                    <span className="ml-1.5 text-[10px] font-semibold bg-teal-600 text-white px-1.5 py-0.5 rounded">
                      CORE
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* CANNOT DO */}
        <div>
          <p className={`text-sm font-bold ${colors.headerText} mb-2 flex items-center gap-1.5`}>
            <X className={`w-4 h-4 ${colors.cannotIconColor}`} />
            This admin CANNOT:
          </p>
          <ul className="space-y-1.5">
            {permissions.cannot.map((permission) => (
              <li key={permission.id} className="flex items-start gap-2">
                <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.cannotIconColor}`} />
                <span className={`text-xs ${colors.headerText} opacity-75`}>
                  {permission.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
