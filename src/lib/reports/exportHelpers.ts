// Export utilities for PDF, CSV, and Print

import jsPDF from 'jspdf';
import Papa from 'papaparse';
import { format } from 'date-fns';

// PDF Export Helper
export interface PDFExportOptions {
  title: string;
  dateRange: {
    start_date: string;
    end_date: string;
  };
  filters?: Record<string, unknown>;
  data: unknown[];
  summary?: Record<string, unknown>;
  filename?: string;
}

export function exportToPDF(options: PDFExportOptions): void {
  const { title, dateRange, filters, summary, filename } = options;

  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, yPosition);
  yPosition += 10;

  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Period: ${format(new Date(dateRange.start_date), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end_date), 'MMM dd, yyyy')}`,
    14,
    yPosition
  );
  yPosition += 6;

  // Generated date
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, yPosition);
  yPosition += 10;

  // Filters (if any)
  if (filters && Object.keys(filters).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Filters Applied:', 14, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        doc.text(`• ${key.replace('_', ' ')}: ${String(value)}`, 18, yPosition);
        yPosition += 5;
      }
    });
    yPosition += 5;
  }

  // Summary section (if provided)
  if (summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Summary', 14, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    Object.entries(summary).forEach(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      doc.text(`${label}: ${String(value)}`, 18, yPosition);
      yPosition += 5;

      // Add new page if needed
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, 285, { align: 'center' });
    doc.text('HealthCard - City Health Office of Panabo City', 14, 285);
  }

  // Save PDF
  const pdfFilename = filename || `${title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(pdfFilename);
}

// CSV Export Helper
export interface CSVExportOptions {
  data: Record<string, unknown>[];
  filename?: string;
  headers?: string[];
}

export function exportToCSV(options: CSVExportOptions): void {
  const { data, filename, headers } = options;

  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Convert data to CSV string
  const csv = Papa.unparse(data, {
    columns: headers,
    header: true,
  });

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const csvFilename = filename || `report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', csvFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Print Helper
export function printReport(): void {
  window.print();
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Format currency (if needed)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

// Prepare appointment data for CSV export
export function prepareAppointmentCSVData(appointments: unknown[]): Record<string, unknown>[] {
  return (appointments as Record<string, unknown>[]).map((apt) => ({
    'Appointment ID': apt.id,
    'Patient Name': apt.patient_name || 'N/A',
    'Service': apt.service_name || 'N/A',
    'Date': apt.appointment_date ? format(new Date(apt.appointment_date as string), 'MMM dd, yyyy') : 'N/A',
    'Time': apt.appointment_time || 'N/A',
    'Status': apt.status || 'N/A',
    'Queue Number': apt.appointment_number || 'N/A',
  }));
}

// Prepare disease data for CSV export
export function prepareDiseaseCSVData(diseases: unknown[]): Record<string, unknown>[] {
  return (diseases as Record<string, unknown>[]).map((disease) => ({
    'Disease ID': disease.id,
    'Disease Type': disease.disease_type,
    'Patient Name': disease.patient_name || 'N/A',
    'Barangay': disease.barangay_name || 'N/A',
    'Diagnosis Date': disease.diagnosis_date ? format(new Date(disease.diagnosis_date as string), 'MMM dd, yyyy') : 'N/A',
    'Severity': disease.severity || 'N/A',
    'Status': disease.status || 'N/A',
  }));
}

// Prepare patient data for CSV export
export function preparePatientCSVData(patients: unknown[]): Record<string, unknown>[] {
  return (patients as Record<string, unknown>[]).map((patient) => ({
    'Patient ID': patient.id,
    'Patient Number': patient.patient_number || 'N/A',
    'Name': `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'N/A',
    'Email': patient.email || 'N/A',
    'Contact Number': patient.contact_number || 'N/A',
    'Barangay': patient.barangay_name || 'N/A',
    'Status': patient.status || 'N/A',
    'Registration Date': patient.created_at ? format(new Date(patient.created_at as string), 'MMM dd, yyyy') : 'N/A',
    'Approved Date': patient.approved_at ? format(new Date(patient.approved_at as string), 'MMM dd, yyyy') : 'Not Approved',
  }));
}

// Prepare feedback data for CSV export
export function prepareFeedbackCSVData(feedback: unknown[]): Record<string, unknown>[] {
  return (feedback as Record<string, unknown>[]).map((fb) => ({
    'Feedback ID': fb.id,
    'Patient Name': fb.patient_name || 'N/A',
    'Service': fb.service_name || 'N/A',
    'Overall Rating': fb.rating || 'N/A',
    'Facility Rating': fb.facility_rating || 'N/A',
    'Wait Time Rating': fb.wait_time_rating || 'N/A',
    'Would Recommend': fb.would_recommend ? 'Yes' : 'No',
    'Comments': fb.comments || 'None',
    'Submitted Date': fb.created_at ? format(new Date(fb.created_at as string), 'MMM dd, yyyy') : 'N/A',
  }));
}
