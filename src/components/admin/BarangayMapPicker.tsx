'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, X, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BarangayMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

// Calculate distance between two coordinates using Haversine formula (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BarangayMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  readOnly = false,
}: BarangayMapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const boundaryCircleRef = useRef<L.Circle | null>(null);
  const [hasLocation, setHasLocation] = useState<boolean>(false);
  const [distanceFromCenter, setDistanceFromCenter] = useState<number | null>(null);
  const [isOutOfBounds, setIsOutOfBounds] = useState<boolean>(false);

  // Panabo City center coordinates
  const PANABO_CENTER: [number, number] = [7.3101, 125.6831];
  const BOUNDARY_RADIUS_KM = 12; // 12 km radius for Panabo City service area

  // Initialize map once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    try {
      // Create map centered on Panabo City
      mapRef.current = L.map(mapContainerRef.current, {
        center: PANABO_CENTER,
        zoom: 13,
        zoomControl: true,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);

      // Add Panabo City boundary circle (12km radius)
      boundaryCircleRef.current = L.circle(PANABO_CENTER, {
        radius: BOUNDARY_RADIUS_KM * 1000, // Convert km to meters
        color: '#0369a1', // Strong sky blue (professional, high contrast)
        weight: 3, // Thicker line for better visibility
        opacity: 0.9, // Higher opacity for clarity
        fill: true,
        fillColor: '#0369a1',
        fillOpacity: 0.12, // Subtle area indication
        lineCap: 'round', // Smooth line ends
        lineJoin: 'round', // Smooth line joins
      }).addTo(mapRef.current);

      // Add boundary label
      boundaryCircleRef.current.bindTooltip('Panabo City Service Area (12km radius)', {
        permanent: false,
        direction: 'center',
        className: 'boundary-tooltip',
      });

      // Add click handler for location selection (if not readonly)
      if (!readOnly) {
        mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          onLocationSelect(lat, lng);
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [readOnly]); // Re-initialize if readOnly changes

  // Update marker when latitude/longitude props change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Add new marker if coordinates are valid
    if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
      const position: [number, number] = [latitude, longitude];

      // Calculate distance from Panabo center
      const distance = calculateDistance(
        PANABO_CENTER[0],
        PANABO_CENTER[1],
        latitude,
        longitude
      );
      setDistanceFromCenter(distance);
      setIsOutOfBounds(distance > BOUNDARY_RADIUS_KM);

      markerRef.current = L.marker(position, {
        draggable: !readOnly,
        autoPan: true,
      }).addTo(mapRef.current);

      // Handle marker drag (if not readonly)
      if (!readOnly) {
        markerRef.current.on('dragend', (e: L.LeafletEvent) => {
          const marker = e.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          onLocationSelect(lat, lng);
        });
      }

      // Bind popup with coordinates and distance
      markerRef.current.bindPopup(`
        <div class="p-2">
          <h4 class="font-semibold text-sm mb-1">Selected Location</h4>
          <div class="text-xs space-y-0.5">
            <div><span class="font-medium">Latitude:</span> ${latitude.toFixed(6)}</div>
            <div><span class="font-medium">Longitude:</span> ${longitude.toFixed(6)}</div>
            <div><span class="font-medium">Distance:</span> ${distance.toFixed(2)} km from center</div>
          </div>
        </div>
      `);

      // Pan to marker
      mapRef.current.panTo(position);
      setHasLocation(true);
    } else {
      setHasLocation(false);
      setDistanceFromCenter(null);
      setIsOutOfBounds(false);
    }
  }, [latitude, longitude, readOnly, onLocationSelect]);

  // Clear location handler
  const handleClear = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onLocationSelect(0, 0); // Reset to null values
    setHasLocation(false);

    // Pan back to Panabo center
    if (mapRef.current) {
      mapRef.current.setView(PANABO_CENTER, 13);
    }
  };

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[350px] md:h-[300px] sm:h-[250px] rounded-lg border-2 border-gray-300 shadow-sm"
        />

        {/* Instructions Overlay (show when no location selected) */}
        {!hasLocation && !readOnly && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-primary-teal/20 z-[1000]">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-primary-teal" />
              <span className="font-medium">Click on the map to select a location</span>
            </div>
          </div>
        )}

        {/* Clear Button (show when location is selected) */}
        {hasLocation && !readOnly && (
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 bg-white hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg shadow-md border border-red-200 transition-colors z-[1000] flex items-center gap-2 text-sm font-medium"
            type="button"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Out of Bounds Warning */}
      {hasLocation && isOutOfBounds && !readOnly && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900 mb-1">Outside Service Area</p>
              <p className="text-sm text-yellow-800">
                Selected location is <span className="font-bold">{distanceFromCenter?.toFixed(2)} km</span> from Panabo City center
                (outside the 12 km service area). Please verify this is the correct location.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate Display */}
      {hasLocation && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-primary-teal mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-teal-900 mb-1">Selected Coordinates</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-teal-700 font-medium">Latitude:</span>
                  <span className="ml-2 text-teal-900 font-mono">{latitude?.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-teal-700 font-medium">Longitude:</span>
                  <span className="ml-2 text-teal-900 font-mono">{longitude?.toFixed(6)}</span>
                </div>
              </div>
              {distanceFromCenter !== null && (
                <div className="mt-2 text-sm">
                  <span className="text-teal-700 font-medium">Distance from center:</span>
                  <span className="ml-2 text-teal-900 font-semibold">{distanceFromCenter.toFixed(2)} km</span>
                  {!isOutOfBounds && (
                    <span className="ml-2 text-xs text-green-600">✓ Within service area</span>
                  )}
                </div>
              )}
              {!readOnly && (
                <p className="text-xs text-teal-600 mt-2 italic">
                  💡 Drag the marker to fine-tune the position
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
