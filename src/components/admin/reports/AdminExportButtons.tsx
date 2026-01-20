'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Download, FileSpreadsheet } from 'lucide-react';
import { generateCSV, generateExcel, formatFileName } from '@/lib/utils/exportUtils';

interface AdminExportButtonsProps {
  activeTab: string;
  startDate: string;
  endDate: string;
  serviceId?: number;
  barangayId?: number;
  data?: any;
}

export default function AdminExportButtons({
  activeTab,
  startDate,
  endDate,
  serviceId,
  barangayId,
  data,
}: AdminExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      if (!data?.table_data || data.table_data.length === 0) {
        alert('No data available to export');
        return;
      }

      const filename = formatFileName(`admin_report_${activeTab}`, 'csv');
      generateCSV(data.table_data, filename.replace('.csv', ''));
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      if (!data) {
        alert('No data available to export');
        return;
      }

      const filename = formatFileName(`admin_report_${activeTab}`, 'xlsx');

      // Prepare Excel data with all available sheets
      const excelData: any = {
        summary: data.summary,
        tableData: data.table_data || [],
      };

      // Add tab-specific breakdowns
      if (data.status_breakdown) {
        excelData.statusBreakdown = data.status_breakdown;
      }

      if (data.service_breakdown) {
        excelData.serviceBreakdown = data.service_breakdown;
      }

      if (data.disease_breakdown) {
        excelData.diseaseBreakdown = data.disease_breakdown;
      }

      if (data.barangay_breakdown) {
        excelData.barangayBreakdown = data.barangay_breakdown;
      }

      if (data.rating_distribution) {
        excelData.ratingDistribution = data.rating_distribution;
      }

      if (data.trend_data) {
        excelData.trendData = data.trend_data;
      }

      generateExcel(excelData, filename.replace('.xlsx', ''));
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleExportCSV}
        disabled={exporting || !data}
        variant="outline"
        size="sm"
        icon={Download}
      >
        {exporting ? 'Exporting...' : 'Export CSV'}
      </Button>

      <Button
        onClick={handleExportExcel}
        disabled={exporting || !data}
        variant="outline"
        size="sm"
        icon={FileSpreadsheet}
      >
        {exporting ? 'Exporting...' : 'Export Excel'}
      </Button>
    </div>
  );
}
