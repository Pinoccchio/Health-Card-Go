'use client';

import { useState } from 'react';
import { X, FileDown, Printer, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoricalStatisticsReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  barangays: Array<{ id: number; name: string }>;
}

const DISEASE_TYPES = [
  { value: 'all', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'other', label: 'Other Diseases' },
];

export function HistoricalStatisticsReportGenerator({
  isOpen,
  onClose,
  barangays,
}: HistoricalStatisticsReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    disease_type: 'all',
    barangay_id: 'all',
    start_date: format(new Date(new Date().getFullYear() - 1, 0, 1), 'yyyy-MM-dd'), // Default to last year
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const generatePDF = async (printMode: boolean = false) => {
    setIsGenerating(true);
    setError('');

    try {
      // Fetch filtered historical statistics
      const params = new URLSearchParams();
      if (filters.disease_type !== 'all') {
        params.append('disease_type', filters.disease_type);
      }
      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch historical statistics');
      }

      const records = result.data || [];
      const summary = result.summary || {};

      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Historical Disease Statistics Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('City Health Office - Panabo City, Davao del Norte', pageWidth / 2, 27, { align: 'center' });

      // Report metadata
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const reportDate = `Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`;
      doc.text(reportDate, pageWidth / 2, 34, { align: 'center' });

      // Filter information
      let yPosition = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Report Filters:', 14, yPosition);

      doc.setFont('helvetica', 'normal');
      yPosition += 6;
      doc.text(`Period: ${format(new Date(filters.start_date), 'MMM d, yyyy')} - ${format(new Date(filters.end_date), 'MMM d, yyyy')}`, 14, yPosition);

      yPosition += 5;
      const diseaseLabel = DISEASE_TYPES.find(d => d.value === filters.disease_type)?.label || 'All Diseases';
      doc.text(`Disease Type: ${diseaseLabel}`, 14, yPosition);

      yPosition += 5;
      const barangayLabel = filters.barangay_id === 'all'
        ? 'All Barangays'
        : barangays.find(b => b.id === parseInt(filters.barangay_id))?.name || 'Unknown';
      doc.text(`Barangay: ${barangayLabel}`, 14, yPosition);

      // Statistics summary
      yPosition += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Statistics', 14, yPosition);

      yPosition += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const totalRecords = summary.totalRecords || records.length;
      const totalCases = summary.totalCases || records.reduce((sum: number, r: any) => sum + (r.case_count || 0), 0);

      doc.text(`Total Historical Records: ${totalRecords}`, 14, yPosition);
      doc.text(`Total Aggregate Cases: ${totalCases.toLocaleString()}`, 90, yPosition);

      yPosition += 5;
      if (summary.earliestDate && summary.latestDate) {
        const dateRange = `${format(new Date(summary.earliestDate), 'MMM yyyy')} - ${format(new Date(summary.latestDate), 'MMM yyyy')}`;
        doc.text(`Date Range: ${dateRange}`, 14, yPosition);
      } else {
        doc.text('Date Range: No data', 14, yPosition);
      }

      yPosition += 5;
      if (summary.mostCommonDisease) {
        const diseaseLabel = DISEASE_TYPES.find(d => d.value === summary.mostCommonDisease)?.label || summary.mostCommonDisease;
        const count = summary.diseaseTypeCounts?.[summary.mostCommonDisease] || 0;
        doc.text(`Most Common Disease: ${diseaseLabel} (${count} records)`, 14, yPosition);
      }

      // Disease breakdown by type (if "All Diseases" selected)
      if (filters.disease_type === 'all' && summary.diseaseTypeCounts) {
        yPosition += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Disease Breakdown (by record count):', 14, yPosition);

        yPosition += 5;
        doc.setFont('helvetica', 'normal');

        let xPos = 14;
        Object.entries(summary.diseaseTypeCounts).forEach(([disease, count]) => {
          const label = DISEASE_TYPES.find(d => d.value === disease)?.label || disease;
          doc.text(`${label}: ${count}`, xPos, yPosition);
          xPos += 60;
          if (xPos > 170) {
            xPos = 14;
            yPosition += 5;
          }
        });
      }

      // Data source breakdown
      const sourceBreakdown = records.reduce((acc: any, record: any) => {
        const source = record.source || 'Unknown Source';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      if (Object.keys(sourceBreakdown).length > 0) {
        yPosition += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Data Sources:', 14, yPosition);

        yPosition += 5;
        doc.setFont('helvetica', 'normal');

        let xPos = 14;
        Object.entries(sourceBreakdown).forEach(([source, count]) => {
          const displayText = `${source}: ${count}`;
          doc.text(displayText, xPos, yPosition);
          xPos += 70;
          if (xPos > 170) {
            xPos = 14;
            yPosition += 5;
          }
        });
      }

      // Records table
      yPosition += 12;

      const tableData = records.map((record: any) => {
        // Format created_by information
        let importedBy = 'Unknown';
        if (record.created_by) {
          const firstName = record.created_by.first_name || '';
          const lastName = record.created_by.last_name || '';
          importedBy = `${firstName} ${lastName}`.trim() || record.created_by.email || 'Staff';
        }

        return [
          format(new Date(record.record_date), 'MMM d, yyyy'),
          DISEASE_TYPES.find(d => d.value === record.disease_type)?.label || record.disease_type,
          record.custom_disease_name || '-',
          record.barangays?.name || 'All Barangays',
          record.case_count?.toLocaleString() || '0',
          record.source || '-',
          importedBy,
          record.notes || '-',
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Record Date', 'Disease', 'Custom', 'Barangay', 'Cases', 'Source', 'Imported By', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [20, 184, 166], // primary-teal color
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { top: 10, left: 14, right: 14 },
        styles: {
          cellPadding: 3,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Record Date
          1: { cellWidth: 20 }, // Disease
          2: { cellWidth: 15 }, // Custom
          3: { cellWidth: 22 }, // Barangay
          4: { cellWidth: 12 }, // Cases
          5: { cellWidth: 22 }, // Source
          6: { cellWidth: 20 }, // Imported By
          7: { cellWidth: 43 }, // Notes
        },
        didDrawPage: (data) => {
          // Footer on every page
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          const pageWidth = pageSize.getWidth();
          const pageCount = doc.internal.pages.length - 1;
          const pageNum = data.pageNumber;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100);

          // Center: Computer-generated notice
          doc.text(
            'This is a computer-generated report. Historical aggregate data for statistical analysis.',
            pageWidth / 2,
            pageHeight - 15,
            { align: 'center' }
          );

          // Right: Simple page numbers (PROFESSIONAL FORMAT)
          doc.text(
            `Page ${pageNum} of ${pageCount}`,
            pageWidth - 20,
            pageHeight - 10,
            { align: 'right' }
          );
        },
      });

      if (printMode) {
        // Open print dialog
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        // Download PDF
        const fileName = `Historical_Statistics_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
      }

    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => generatePDF(false);
  const handlePrint = () => generatePDF(true);

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileDown className="w-5 h-5 text-primary-teal" />
                Generate Historical Statistics Report
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Create a PDF report with aggregate historical disease data
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                Report Filters
              </h4>

              <div className="space-y-3">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      max={filters.end_date}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      min={filters.start_date}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                    />
                  </div>
                </div>

                {/* Disease Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={filters.disease_type}
                    onChange={(e) => setFilters({ ...filters, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    {DISEASE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barangay Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={filters.barangay_id}
                    onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isGenerating}
              >
                <Printer className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Print Report'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isGenerating}
              >
                <FileDown className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
