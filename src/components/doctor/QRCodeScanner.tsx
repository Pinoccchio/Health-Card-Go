'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, Camera } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRCodeScanner({ onScan, onClose, isOpen }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'camera' | 'upload'>('camera');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementId = 'qr-code-scanner';

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Create scanner instance
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId);
      }

      // Start scanning
      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10, // Scan 10 frames per second
          qrbox: { width: 250, height: 250 }, // Scanning area
        },
        (decodedText) => {
          // Successfully scanned
          console.log('QR Code scanned:', decodedText);
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error or no QR code detected (ignore these)
          // console.log('QR scan error:', errorMessage);
        }
      );
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start scanner. Please check camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleClose = () => {
    stopScanning();
    setUploadMode('camera');
    setError(null);
    onClose();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);

      // Create a unique temporary element ID for file scanning
      const tempElementId = `qr-file-scanner-${Date.now()}`;

      // Create temporary div for scanning (required by html5-qrcode library)
      const tempDiv = document.createElement('div');
      tempDiv.id = tempElementId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      try {
        // Create scanner instance for file scanning
        const html5QrCode = new Html5Qrcode(tempElementId);

        // Scan the uploaded file
        const decodedText = await html5QrCode.scanFile(file, true);
        console.log('QR Code decoded from file:', decodedText);

        // Clear the scanner
        html5QrCode.clear();

        // Call the onScan callback with decoded data
        onScan(decodedText);
        handleClose();
      } finally {
        // Always clean up the temporary element
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }
    } catch (err: any) {
      console.error('Error scanning uploaded file:', err);
      setError('Failed to decode QR code from image. Please ensure the image contains a valid QR code.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop with blur effect - Standard Pattern */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Centered container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary-teal" />
            <h2 className="text-lg font-semibold text-gray-900">Scan Health Card QR Code</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setUploadMode('camera');
                stopScanning();
                setError(null);
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMode === 'camera'
                  ? 'bg-primary-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-4 h-4" />
                <span>Camera Scan</span>
              </div>
            </button>
            <button
              onClick={() => {
                setUploadMode('upload');
                stopScanning();
                setError(null);
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMode === 'upload'
                  ? 'bg-primary-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>Upload Image</span>
              </div>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Camera Scanner Mode */}
          {uploadMode === 'camera' && (
            <div className="relative">
              <div id={elementId} className="w-full rounded-lg overflow-hidden"></div>

              {!isScanning && !error && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Camera className="w-16 h-16 text-gray-300" />
                  <p className="text-gray-600 text-center">
                    Click the button below to activate your camera and scan a QR code
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Mode */}
          {uploadMode === 'upload' && (
            <div className="relative">
              <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-gray-300 rounded-lg">
                <QrCode className="w-16 h-16 text-gray-300" />
                <p className="text-gray-600 text-center">
                  Upload an image containing a QR code
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="qr-upload-input"
                />
                <label
                  htmlFor="qr-upload-input"
                  className="px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-teal-700 transition-colors font-medium cursor-pointer"
                >
                  Choose Image
                </label>
              </div>
            </div>
          )}

          {/* Instructions */}
          {uploadMode === 'camera' && isScanning && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Position the QR code within the scanning area. The scanner will automatically detect and process the code.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {uploadMode === 'camera' && (
              !isScanning ? (
                <button
                  onClick={startScanning}
                  className="flex-1 bg-primary-teal text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  Start Scanning
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Stop Scanning
                </button>
              )
            )}
            <button
              onClick={handleClose}
              className={`${uploadMode === 'upload' ? 'flex-1' : ''} px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium`}
            >
              {uploadMode === 'upload' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
