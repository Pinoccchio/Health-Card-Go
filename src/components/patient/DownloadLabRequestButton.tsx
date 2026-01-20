'use client';

/**
 * Download Lab Request Button Component
 *
 * Reusable button for downloading laboratory request PDFs
 * Used in booking confirmation and appointment dashboard
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Download } from 'lucide-react';
import { generateLabRequestPDF, type HealthCardType } from '@/lib/utils/labRequestGenerator';

interface DownloadLabRequestButtonProps {
  healthCardType: HealthCardType;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullWidth?: boolean;
}

export default function DownloadLabRequestButton({
  healthCardType,
  variant = 'outline',
  size = 'md',
  className = '',
  fullWidth = false,
}: DownloadLabRequestButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateLabRequestPDF(healthCardType);
    } catch (error) {
      console.error('Error downloading lab request:', error);
      alert('Failed to download laboratory request. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getCardLabel = () => {
    switch (healthCardType) {
      case 'food_handler':
        return 'Yellow Card';
      case 'non_food':
        return 'Green Card';
      case 'pink':
        return 'Pink Card';
      default:
        return 'Health Card';
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={variant}
      size={size}
      icon={Download}
      className={`cursor-pointer transition-all ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isDownloading ? 'Generating PDF...' : `Download Lab Request (${getCardLabel()})`}
    </Button>
  );
}
