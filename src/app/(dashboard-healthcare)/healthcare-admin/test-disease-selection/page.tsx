'use client';

import { useState } from 'react';
import { DiseaseSelectionField, EnhancedMedicalRecordForm } from '@/components/medical-records';
import type { EnhancedMedicalRecordFormData } from '@/components/medical-records';

/**
 * TESTING PAGE for Task 5.1.1: Enhanced Disease Selection UI
 *
 * Access: http://localhost:3000/healthcare-admin/test-disease-selection
 *
 * What to Test:
 * 1. ✅ Autocomplete disease search
 * 2. ✅ Visual severity indicators (color buttons)
 * 3. ✅ Custom disease name field (when "Other" selected)
 * 4. ✅ Disease surveillance notification banner
 * 5. ✅ Form validation
 * 6. ✅ Data output in console
 */
export default function TestDiseaseSelectionPage() {
  const [testMode, setTestMode] = useState<'standalone' | 'integrated'>('standalone');
  const [diseaseData, setDiseaseData] = useState<any>(null);
  const [medicalRecordData, setMedicalRecordData] = useState<EnhancedMedicalRecordFormData | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Testing Page: Enhanced Disease Selection UI
          </h1>
          <p className="text-gray-600">
            Task 5.1.1 - Test autocomplete, severity indicators, and disease tracking integration
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Test Mode:</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setTestMode('standalone')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                testMode === 'standalone'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Standalone Component
            </button>
            <button
              onClick={() => setTestMode('integrated')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                testMode === 'integrated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Integrated in Medical Record Form
            </button>
          </div>
        </div>

        {/* Test Area */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {testMode === 'standalone' ? '📋 Standalone Disease Selection' : '🏥 Medical Record Form with Disease Tracking'}
          </h2>

          {testMode === 'standalone' ? (
            <div>
              <DiseaseSelectionField
                value={diseaseData}
                onChange={(data) => {
                  setDiseaseData(data);
                  console.log('✅ Disease Data Changed:', data);
                }}
                required={true}
              />
            </div>
          ) : (
            <div>
              <EnhancedMedicalRecordForm
                patientId="test-patient-123"
                serviceCategory="general"
                isRequired={true}
                enableDiseaseTracking={true}
                onChange={(data, isValid) => {
                  setMedicalRecordData(data);
                  console.log('✅ Medical Record Data:', data);
                  console.log('✅ Form Valid:', isValid);
                }}
                showLabels={true}
              />
            </div>
          )}
        </div>

        {/* Data Output */}
        <div className="bg-gray-900 rounded-lg shadow p-6 text-green-400 font-mono text-sm">
          <h2 className="text-lg font-semibold mb-4 text-white">📊 Data Output (Check Console for Full Details):</h2>
          {testMode === 'standalone' ? (
            <pre className="overflow-auto">
              {diseaseData ? JSON.stringify(diseaseData, null, 2) : '// Select disease and severity to see data...'}
            </pre>
          ) : (
            <pre className="overflow-auto">
              {medicalRecordData ? JSON.stringify(medicalRecordData, null, 2) : '// Fill out form to see data...'}
            </pre>
          )}
        </div>

        {/* Testing Checklist */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">✅ Testing Checklist:</h2>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Autocomplete Search:</strong> Type "den" and verify "Dengue" appears</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>All Disease Types:</strong> Verify dropdown shows HIV/AIDS, Dengue, Malaria, Measles, Rabies, Pregnancy Complications, Other</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Custom Disease Name:</strong> Select "Other" and verify text input field appears</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Severity Buttons:</strong> Click each severity level and verify:
                <ul className="ml-6 mt-1 space-y-1">
                  <li>🟢 Mild = Green background</li>
                  <li>🟡 Moderate = Yellow background</li>
                  <li>🟠 Severe = Orange background</li>
                  <li>🔴 Critical = Red background</li>
                </ul>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Severity Descriptions:</strong> Verify description text updates when clicking different severity levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Surveillance Banner:</strong> Blue info banner shows "This disease will be tracked in the surveillance system"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Data Output:</strong> Check console and data panel shows correct disease_type, custom_disease_name (if "other"), and severity</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Integrated Mode:</strong> Toggle to "Integrated" mode and verify disease section appears when "Track Disease" is enabled</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">□</span>
              <span><strong>Validation:</strong> Try submitting without selecting disease/severity and verify validation messages appear</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
