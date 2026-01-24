'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import { parseDiseasesExcel, type ParseResult } from '@/lib/utils/excelParser';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [barangays, setBarangays] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch barangays when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('📍 Fetching barangays for Excel validation...');
      fetchBarangays();
    }
  }, [isOpen]);

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/barangays');
      const data = await response.json();
      console.log(`📍 Barangays API response:`, data);
      if (data.success && data.data) {
        console.log(`✅ Loaded ${data.data.length} barangays for validation`);
        setBarangays(data.data);
      } else {
        console.error(`❌ Failed to fetch barangays:`, data);
      }
    } catch (error) {
      console.error('❌ Error fetching barangays:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Invalid file type. Please select an Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setParseResult(null);

    // Parse file
    await parseFile(selectedFile);
  };

  const parseFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setError('');

    try {
      // Ensure barangays are loaded
      console.log(`🔍 Current barangays state: ${barangays.length} barangays loaded`);
      if (barangays.length === 0) {
        console.log(`⚠️  No barangays loaded, fetching now...`);
        await fetchBarangays();
      } else {
        console.log(`✅ Using ${barangays.length} cached barangays for validation`);
        console.log(`   Sample barangays:`, barangays.slice(0, 5).map(b => b.name).join(', '));
      }

      const result = await parseDiseasesExcel(selectedFile, barangays);
      setParseResult(result);

      if (!result.success) {
        if (result.errors.length > 0) {
          setError(`Found ${result.errors.length} validation error(s). Please review and fix.`);
        }
      }
    } catch (error) {
      console.error('Parse error:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse Excel file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.records.length === 0) {
      setError('No valid records to import');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const response = await fetch('/api/diseases/historical/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parseResult.records,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Success!
        onImportSuccess();
        handleClose();
      } else {
        setError(data.error || 'Failed to import records');
      }
    } catch (error) {
      console.error('Import error:', error);
      setError(error instanceof Error ? error.message : 'Failed to import records');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    setError('');
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[1002] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import Disease Data from Excel</h2>
              <p className="text-sm text-gray-600">Upload an Excel file to batch import historical disease statistics</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing || isImporting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Download Template Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-1">Need a template?</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Download the Excel template with realistic mock data (216 rows) demonstrating Critical, Severe, and Moderate severity levels.
                  </p>
                  <a
                    href="/templates/disease-historical-import-template-MOCKUP.xlsx"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download MOCKUP Template
                  </a>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isProcessing || isImporting}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={isProcessing || isImporting}
                >
                  <Upload className="h-5 w-5" />
                  {file ? 'Change File' : 'Select Excel File'}
                </button>
                {file && (
                  <p className="mt-3 text-sm text-gray-600">
                    Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Supported formats: .xlsx, .xls (Maximum 5MB, 1000 rows)
                </p>
              </div>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <p className="text-gray-700">Parsing Excel file...</p>
              </div>
            )}

            {/* Parse Results */}
            {parseResult && !isProcessing && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Import Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{parseResult.totalRows}</p>
                      <p className="text-sm text-gray-600">Total Rows</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{parseResult.validRows}</p>
                      <p className="text-sm text-gray-600">Valid Records</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{parseResult.errors.length}</p>
                      <p className="text-sm text-gray-600">Errors</p>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {parseResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900">Validation Errors ({parseResult.errors.length})</h4>
                        <p className="text-sm text-red-800">Please fix these errors in your Excel file before importing.</p>
                      </div>
                    </div>
                    <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                      {parseResult.errors.slice(0, 20).map((error, index) => (
                        <div key={index} className="text-sm bg-white rounded p-2">
                          <span className="font-medium text-red-900">Row {error.row}:</span>{' '}
                          <span className="text-gray-700">{error.field}</span> - {error.message}
                          {error.value && <span className="text-gray-500"> (value: "{error.value}")</span>}
                        </div>
                      ))}
                      {parseResult.errors.length > 20 && (
                        <p className="text-sm text-red-700 italic">
                          ...and {parseResult.errors.length - 20} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Preview */}
                {parseResult.validRows > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900">Ready to Import</h4>
                        <p className="text-sm text-green-800 mt-1">
                          {parseResult.validRows} record(s) are valid and ready to be imported into the database.
                        </p>
                        {parseResult.records.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-green-700 font-medium mb-2">Preview (first 5 records):</p>
                            <div className="bg-white rounded p-3 text-xs space-y-1">
                              {parseResult.records.slice(0, 5).map((record, index) => (
                                <div key={index} className="flex justify-between text-gray-700">
                                  <span>{record.record_date}</span>
                                  <span className="font-medium">{record.disease_type}</span>
                                  <span>{record.case_count} cases</span>
                                  <span className="text-gray-500">{record.barangay_name || `ID: ${record.barangay_id}`}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Error</h4>
                    <p className="text-sm text-red-800 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parseResult || parseResult.validRows === 0 || isImporting || parseResult.errors.length > 0}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {parseResult?.validRows || 0} Record(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
