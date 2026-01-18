'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react';
import { parseHealthcardExcel, validateHealthcardExcelFile } from '@/lib/utils/healthcardExcelParser';

interface HealthcardExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface ParseResult {
  validRecords: any[];
  errors: ValidationError[];
}

export default function HealthcardExcelImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: HealthcardExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParseResult(null);
      setError('');
      setIsProcessing(false);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    const validationError = validateHealthcardExcelFile(selectedFile);
    if (validationError) {
      setError(validationError);
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
      const result = await parseHealthcardExcel(selectedFile);
      setParseResult(result);

      if (result.errors.length > 0) {
        setError(`Found ${result.errors.length} validation error(s). Please review and fix.`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse Excel file');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validRecords.length === 0) {
      setError('No valid records to import');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const response = await fetch('/api/healthcards/historical/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parseResult.validRecords,
        }),
      });

      const data = await response.json();

      if (data.success) {
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

  const totalRows = parseResult ? parseResult.validRecords.length + parseResult.errors.length : 0;
  const validRows = parseResult ? parseResult.validRecords.length : 0;
  const errorCount = parseResult ? parseResult.errors.length : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[1002] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import HealthCard Data from Excel</h2>
              <p className="text-sm text-gray-600">Upload an Excel file to batch import historical healthcard issuance statistics</p>
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
                    Download the Excel template with pre-filled examples and validation rules.
                  </p>
                  <a
                    href="/templates/healthcard-historical-import-template.xlsx"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </a>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                      <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
                      <p className="text-sm text-gray-600">Total Rows</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{validRows}</p>
                      <p className="text-sm text-gray-600">Valid Records</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{errorCount}</p>
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
                        <h4 className="font-semibold text-red-900">Validation Errors ({errorCount})</h4>
                        <p className="text-sm text-red-800">Please fix these errors in your Excel file before importing.</p>
                      </div>
                    </div>
                    <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                      {parseResult.errors.slice(0, 20).map((error, index) => (
                        <div key={index} className="text-sm bg-white rounded p-2">
                          <span className="font-medium text-red-900">Row {error.row}:</span>{' '}
                          <span className="text-gray-700">{error.errors.join(', ')}</span>
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
                {validRows > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900">Ready to Import</h4>
                        <p className="text-sm text-green-800 mt-1">
                          {validRows} record(s) are valid and ready to be imported into the database.
                        </p>
                        {parseResult.validRecords.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-green-700 font-medium mb-2">Preview (first 5 records):</p>
                            <div className="bg-white rounded p-3 text-xs space-y-1">
                              {parseResult.validRecords.slice(0, 5).map((record, index) => (
                                <div key={index} className="flex justify-between text-gray-700">
                                  <span>{record.record_date}</span>
                                  <span className="font-medium">{record.healthcard_type === 'food_handler' ? 'Food Handler' : 'Non-Food'}</span>
                                  <span>{record.cards_issued} cards</span>
                                  <span className="text-gray-500">{record.barangay || 'System-wide'}</span>
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
            {error && !parseResult && (
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
            disabled={!parseResult || validRows === 0 || isImporting || errorCount > 0}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {validRows || 0} Record(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
