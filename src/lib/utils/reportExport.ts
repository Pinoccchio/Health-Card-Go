import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Convert data to CSV string
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export report to PDF format
 */
export function exportToPDF(reportData: {
  title: string;
  dateRange: { start: string; end: string };
  summary: Array<{ label: string; value: string | number }>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: any[][];
  }>;
  charts?: Array<{
    title: string;
    canvas: HTMLCanvasElement;
  }>;
}) {
  const { title, dateRange, summary, tables = [], charts = [] } = reportData;

  const doc = new jsPDF();
  let yPosition = 20;

  // Add header
  doc.setFontSize(20);
  doc.setTextColor(32, 201, 151); // Primary teal
  doc.text('HealthCardGo', 14, yPosition);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  yPosition += 10;
  doc.text(title, 14, yPosition);

  // Add date range
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  yPosition += 7;
  doc.text(`Period: ${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`, 14, yPosition);

  yPosition += 3;
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, yPosition);

  // Add summary section
  if (summary && summary.length > 0) {
    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, yPosition);

    yPosition += 5;
    const summaryData = summary.map(item => [item.label, item.value.toString()]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [32, 201, 151] }, // Primary teal
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add charts
  if (charts && charts.length > 0) {
    for (const chart of charts) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.text(chart.title, 14, yPosition);
      yPosition += 5;

      try {
        const imgData = chart.canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 14, yPosition, 180, 90);
        yPosition += 100;
      } catch (error) {
        console.error('Error adding chart to PDF:', error);
        yPosition += 10;
      }
    }
  }

  // Add tables
  if (tables && tables.length > 0) {
    for (const table of tables) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.text(table.title, 14, yPosition);
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [table.headers],
        body: table.rows,
        theme: 'striped',
        headStyles: { fillColor: [32, 201, 151] }, // Primary teal
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Add footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
  doc.save(filename);
}

/**
 * Prepare summary data for PDF export
 */
export function prepareSummaryForPDF(summary: Record<string, any>): Array<{ label: string; value: string | number }> {
  return Object.entries(summary).map(([key, value]) => ({
    label: key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    value: typeof value === 'number' ? value.toLocaleString() : value,
  }));
}

/**
 * Get chart canvas elements from the page
 */
export function getChartCanvases(): HTMLCanvasElement[] {
  const canvases = document.querySelectorAll('canvas');
  return Array.from(canvases);
}

/**
 * Convert table data for CSV export
 */
export function prepareTableDataForCSV(data: any[], keys?: string[]): any[] {
  if (!data || data.length === 0) return [];

  const keysToUse = keys || Object.keys(data[0]);

  return data.map(item => {
    const row: Record<string, any> = {};
    keysToUse.forEach(key => {
      row[key] = item[key];
    });
    return row;
  });
}
