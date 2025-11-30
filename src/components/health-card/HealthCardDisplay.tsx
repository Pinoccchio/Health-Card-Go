'use client';

import { Download, Calendar, Heart, Phone, MapPin, Droplet, AlertTriangle, QrCode, Upload } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import { domToPng, domToJpeg } from 'modern-screenshot';
import jsPDF from 'jspdf';
import { useState, useRef } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import { Html5Qrcode } from 'html5-qrcode';

interface HealthCardData {
  id: string;
  card_number: string;
  qr_code_data: string;
  issue_date: string;
  expiry_date: string | null;
  is_active: boolean | null;
  patient: {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    contact_number: string;
    blood_type?: string;
    barangay: string;
    allergies?: string;
    current_medications?: string;
    emergency_contact: {
      name: string;
      phone: string;
      relationship?: string;
    };
  };
}

interface HealthCardDisplayProps {
  healthCard: HealthCardData;
}

export default function HealthCardDisplay({ healthCard }: HealthCardDisplayProps) {
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);
  const [testingQR, setTestingQR] = useState(false);
  const [qrTestResult, setQrTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const isExpired = healthCard.expiry_date
    ? new Date(healthCard.expiry_date) < new Date()
    : false;

  const status = !healthCard.is_active
    ? 'inactive'
    : isExpired
    ? 'expired'
    : 'active';

  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setDownloading('pdf');

    try {
      // modern-screenshot directly generates image data URL - no oklab/oklch issues!
      const dataUrl = await domToPng(cardRef.current, {
        scale: 3, // Increased for better quality
        backgroundColor: '#ffffff',
        width: cardRef.current.scrollWidth,
        height: cardRef.current.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      // Create temporary image to get dimensions
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;

      pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`health-card-${healthCard.card_number}.pdf`);

      toast.success('Health card PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setDownloading('png');

    try {
      // modern-screenshot directly generates blob - no oklab/oklch issues!
      const dataUrl = await domToPng(cardRef.current, {
        scale: 3, // Increased for better quality
        backgroundColor: '#ffffff',
        width: cardRef.current.scrollWidth,
        height: cardRef.current.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `health-card-${healthCard.card_number}.png`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Health card image downloaded successfully!');
    } catch (error) {
      console.error('Error generating PNG:', error);
      toast.error('Failed to generate PNG. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleTestQRCode = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTestingQR(true);
    setQrTestResult(null);

    try {
      // Create a unique temporary element ID for file scanning
      const tempElementId = `qr-test-scanner-${Date.now()}`;

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
        console.log('QR Code decoded:', decodedText);

        // Clear the scanner
        html5QrCode.clear();

        // Parse and validate the QR data
        try {
          const qrData = JSON.parse(decodedText);
          const expectedData = JSON.parse(healthCard.qr_code_data);

          // Compare key fields - check both user_id and patient_id for compatibility
          const isValid = (qrData.patient_id === expectedData.patient_id ||
                          qrData.user_id === expectedData.user_id) &&
                         qrData.patient_number === expectedData.patient_number;

          if (isValid) {
            setQrTestResult({
              success: true,
              message: 'QR code is valid and matches your health card! Healthcare staff will be able to scan this successfully.'
            });
            toast.success('QR code verified successfully!');
          } else {
            setQrTestResult({
              success: false,
              message: 'QR code does not match your current health card. Please download a fresh copy.'
            });
            toast.error('QR code mismatch detected');
          }
        } catch (parseError) {
          setQrTestResult({
            success: false,
            message: 'QR code format is invalid. Please ensure you uploaded the correct health card QR code.'
          });
          toast.error('Invalid QR code format');
        }
      } finally {
        // Always clean up the temporary element
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }
    } catch (err: any) {
      console.error('Error scanning uploaded file:', err);
      setQrTestResult({
        success: false,
        message: 'Failed to decode QR code from image. Please ensure the image contains a clear, readable QR code.'
      });
      toast.error('Failed to scan QR code');
    } finally {
      setTestingQR(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {status !== 'active' && (
        <div className={`border rounded-lg p-4 ${
          status === 'expired' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start">
            <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${
              status === 'expired' ? 'text-red-600' : 'text-gray-600'
            }`} />
            <div>
              <h3 className={`font-semibold ${
                status === 'expired' ? 'text-red-900' : 'text-gray-900'
              }`}>
                {status === 'expired' ? 'Health Card Expired' : 'Health Card Inactive'}
              </h3>
              <p className={`text-sm mt-1 ${
                status === 'expired' ? 'text-red-700' : 'text-gray-700'
              }`}>
                {status === 'expired'
                  ? 'Your health card has expired. Please contact the health office for renewal.'
                  : 'This health card is currently inactive. Please contact the health office for assistance.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Health Card */}
      <div
        ref={cardRef}
        data-health-card
        className="relative rounded-2xl shadow-2xl overflow-hidden p-8"
        style={{
          minHeight: '400px',
          background: 'linear-gradient(135deg, rgb(147, 51, 234) 0%, rgb(59, 130, 246) 50%, rgb(37, 99, 235) 100%)'
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Patient Info */}
          <div className="text-white space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider opacity-75 mb-1">Card Number</h3>
              <p className="text-lg font-bold">{healthCard.card_number}</p>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider opacity-75 mb-1">Patient Name</h3>
              <p className="text-xl font-bold">
                {healthCard.patient.first_name} {healthCard.patient.last_name}
              </p>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider opacity-75 mb-1">Patient Number</h3>
              <p className="text-sm font-semibold">{healthCard.patient.patient_number}</p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <div>
                <p className="text-xs opacity-75">Date of Birth</p>
                <p className="text-sm font-semibold">
                  {new Date(healthCard.patient.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <div>
                <p className="text-xs opacity-75">Barangay</p>
                <p className="text-sm font-semibold">{healthCard.patient.barangay}</p>
              </div>
            </div>
          </div>

          {/* Column 2: Medical Info */}
          <div className="text-white space-y-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider opacity-75 mb-3">Medical Information</h3>
            </div>

            {healthCard.patient.blood_type && (
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4" />
                <div>
                  <p className="text-xs opacity-75">Blood Type</p>
                  <p className="text-lg font-bold">{healthCard.patient.blood_type}</p>
                </div>
              </div>
            )}

            {healthCard.patient.allergies && (
              <div>
                <p className="text-xs opacity-75">Allergies</p>
                <p className="text-sm font-semibold">{healthCard.patient.allergies}</p>
              </div>
            )}

            {healthCard.patient.current_medications && (
              <div>
                <p className="text-xs opacity-75">Current Medications</p>
                <p className="text-sm font-semibold">{healthCard.patient.current_medications}</p>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs opacity-75">Emergency Contact</p>
                <p className="text-sm font-semibold break-words">{healthCard.patient.emergency_contact.name}</p>
                <p className="text-sm break-all">{healthCard.patient.emergency_contact.phone}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/20">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="opacity-75">Issued</p>
                  <p className="font-semibold">
                    {new Date(healthCard.issue_date).toLocaleDateString()}
                  </p>
                </div>
                {healthCard.expiry_date && (
                  <div className="text-right">
                    <p className="opacity-75">Expires</p>
                    <p className="font-semibold">
                      {new Date(healthCard.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: QR Code & Status */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`px-4 py-2 rounded-full border ${statusConfig[status].color} font-semibold text-sm`}>
              {statusConfig[status].label}
            </div>

            <QRCodeGenerator
              data={healthCard.qr_code_data}
              size={180}
            />

            <div className="text-center text-white">
              <Heart className="w-6 h-6 mx-auto mb-2 opacity-75" />
              <p className="text-xs text-white opacity-90">Scan for quick access</p>
              <p className="text-xs text-white opacity-75">City Health Office</p>
              <p className="text-xs text-white font-semibold">Panabo City, Davao del Norte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading !== null}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          {downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
        </button>

        <button
          onClick={handleDownloadPNG}
          disabled={downloading !== null}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-5 h-5" />
          {downloading === 'png' ? 'Generating PNG...' : 'Download PNG'}
        </button>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">How to Use Your Digital Health Card</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Present this health card at any City Health Office facility in Panabo City</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Healthcare staff can scan the QR code for quick access to your information</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Download and print the PDF version for physical use</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Keep your digital copy on your phone for easy access</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Update your personal information if any details change</span>
          </li>
        </ul>
      </div>

      {/* QR Code Test Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <QrCode className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-1">Test Your QR Code</h3>
            <p className="text-sm text-purple-700">
              Upload your downloaded health card image to verify that the QR code is readable and valid.
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleTestQRCode}
            className="hidden"
            id="qr-test-input"
            disabled={testingQR}
          />
          <label
            htmlFor="qr-test-input"
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
              testingQR
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <Upload className="w-5 h-5" />
            {testingQR ? 'Testing QR Code...' : 'Upload QR Code Image'}
          </label>

          {/* Test Result */}
          {qrTestResult && (
            <div className={`p-4 rounded-lg border ${
              qrTestResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                qrTestResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {qrTestResult.success ? '✓ Valid QR Code' : '✗ Invalid QR Code'}
              </p>
              <p className={`text-sm mt-1 ${
                qrTestResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {qrTestResult.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
