'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface HeatmapData {
  barangay_id: number;
  barangay_name: string;
  coordinates: any; // Can be GeoJSON or {lat, lng}
  statistics: {
    total_cases: number;
    active_cases: number;
    critical_cases: number;
    severe_cases: number;
    recovered_cases: number;
  };
  intensity: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface DiseaseHeatmapProps {
  data: HeatmapData[];
  diseaseType: string;
}

export default function DiseaseHeatmap({ data, diseaseType }: DiseaseHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.Layer[]>([]);

  // Effect 1: Initialize map ONCE (runs only on mount)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapRef.current) return; // Already initialized

    try {
      // Center on Panabo City, Davao del Norte
      mapRef.current = L.map(mapContainerRef.current).setView([7.5167, 125.6833], 12);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup only on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty deps - initialize once

  // Effect 2: Update data layers when data or diseaseType changes
  useEffect(() => {
    if (!mapRef.current || !data || data.length === 0) return;

    try {
      // Clear previous data layers safely
      layersRef.current.forEach(layer => {
        if (mapRef.current && mapRef.current.hasLayer(layer)) {
          mapRef.current.removeLayer(layer);
        }
      });
      layersRef.current = [];

      const bounds = L.latLngBounds([]);

      // Add circle markers for each barangay with cases
      data.forEach((barangay) => {
        if (!barangay.coordinates) return;

        // Parse coordinates
        let coords = barangay.coordinates;
        if (typeof coords === 'string') {
          try {
            coords = JSON.parse(coords);
          } catch (e) {
            console.error('Failed to parse coordinates for', barangay.barangay_name);
            return;
          }
        }

        // Extract lat/lng (handle both point {lat, lng} and GeoJSON formats)
        let lat: number, lng: number;

        if (coords.lat !== undefined && coords.lng !== undefined) {
          // Point format: {lat: 7.xxx, lng: 125.xxx}
          lat = coords.lat;
          lng = coords.lng;
        } else if (coords.type === 'Point' && coords.coordinates) {
          // GeoJSON Point: {type: "Point", coordinates: [lng, lat]}
          lng = coords.coordinates[0];
          lat = coords.coordinates[1];
        } else if (coords.type === 'Polygon' || coords.type === 'MultiPolygon') {
          // For polygons, calculate centroid (average of all coordinates)
          const polygonCoords = coords.type === 'Polygon'
            ? coords.coordinates[0]
            : coords.coordinates[0][0];

          if (!polygonCoords || polygonCoords.length === 0) return;

          const sumLat = polygonCoords.reduce((sum: number, point: number[]) => sum + point[1], 0);
          const sumLng = polygonCoords.reduce((sum: number, point: number[]) => sum + point[0], 0);
          lat = sumLat / polygonCoords.length;
          lng = sumLng / polygonCoords.length;
        } else {
          console.warn('Unsupported coordinate format for', barangay.barangay_name, coords);
          return;
        }

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
          console.error('Invalid coordinates for', barangay.barangay_name);
          return;
        }

        // Color based on risk level
        const getColor = (risk: string) => {
          switch (risk) {
            case 'critical': return '#dc2626'; // red-600
            case 'high': return '#ea580c'; // orange-600
            case 'medium': return '#ca8a04'; // yellow-600
            default: return '#16a34a'; // green-600
          }
        };

        const color = getColor(barangay.risk_level);

        // Calculate circle radius based on case count (10-30px range)
        const baseCases = barangay.statistics.total_cases;
        const radius = Math.max(10, Math.min(30, baseCases * 2));

        // Create circle marker
        const circle = L.circleMarker([lat, lng], {
          radius: radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4 + (barangay.intensity * 0.4), // Intensity affects opacity
        });

        if (mapRef.current) {
          circle.addTo(mapRef.current);
        }

        // Popup with statistics
        circle.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg mb-2">${barangay.barangay_name}</h3>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Risk Level:</span>
                <span class="font-semibold ${
                  barangay.risk_level === 'critical' ? 'text-red-600' :
                  barangay.risk_level === 'high' ? 'text-orange-600' :
                  barangay.risk_level === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }">${barangay.risk_level.toUpperCase()}</span>
              </div>
              <div class="flex justify-between">
                <span>Total Cases:</span>
                <span class="font-semibold">${barangay.statistics.total_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Active:</span>
                <span class="font-semibold text-orange-600">${barangay.statistics.active_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Critical:</span>
                <span class="font-semibold text-red-600">${barangay.statistics.critical_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Recovered:</span>
                <span class="font-semibold text-green-600">${barangay.statistics.recovered_cases}</span>
              </div>
            </div>
          </div>
        `);

        layersRef.current.push(circle);
        bounds.extend([lat, lng]);
      });

      // Fit map bounds to show all circles
      if (bounds.isValid() && mapRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error updating map layers:', error);
    }
  }, [data, diseaseType]); // Update when data or disease type changes

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-96 rounded-lg border border-gray-200" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Risk Level</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-orange-600"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-yellow-600"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span>Low</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">
          Circle size = case count
        </p>
      </div>
    </div>
  );
}
