'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download, Printer, Maximize2, Minimize2 } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType?: string;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType = 'image/jpeg',
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Determine if document is PDF or image
  const isPDF = documentType === 'application/pdf' || documentUrl.toLowerCase().endsWith('.pdf');

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      // Focus on close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus trap within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab as any);
    return () => modal.removeEventListener('keydown', handleTab as any);
  }, [isOpen]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleDownload = async () => {
    try {
      // Fetch the file as a blob to handle cross-origin and Supabase signed URLs
      const response = await fetch(documentUrl);
      const blob = await response.blob();

      // Create a temporary object URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback: try opening in new tab
      window.open(documentUrl, '_blank');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(documentUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-white/10 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
    >
      <div
        ref={modalRef}
        className={`relative bg-white rounded-lg shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'w-11/12 h-5/6 max-w-6xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h2 id="document-viewer-title" className="text-lg font-semibold text-gray-900 truncate">
            {documentName}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close document viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            {!isPDF && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              aria-label="Print document"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-[#20C997] text-white text-sm font-medium rounded-md hover:bg-[#1AA179] transition-colors"
              aria-label="Download document"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex items-center justify-center min-h-full">
            {isPDF ? (
              <iframe
                src={documentUrl}
                className="w-full h-full min-h-[600px] bg-white rounded shadow-lg"
                title={documentName}
              />
            ) : (
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full h-auto rounded shadow-lg"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
              />
            )}
          </div>
        </div>

        {/* Mobile-friendly bottom actions */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[#20C997] text-white text-sm font-medium rounded-md hover:bg-[#1AA179] transition-colors mr-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
