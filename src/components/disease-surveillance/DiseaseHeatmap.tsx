'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

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
  population?: number; // Barangay population for percentage calculation
  statistics: {
    total_cases: number;
    active_cases: number;
    high_risk_cases: number;
    medium_risk_cases: number;
    recovered_cases: number;
  };
  diseases: Array<{
    disease_type: string;
    custom_disease_name: string | null;
    total_count: number;
    active_count: number;
    high_risk_count: number;
  }>;
  intensity: number;
  risk_level: 'low' | 'medium' | 'high';
}

interface DiseaseHeatmapProps {
  data: HeatmapData[];
  diseaseType: string;
  severityFilter?: string; // 'all', 'high', 'medium', 'low'
}

export default function DiseaseHeatmap({ data, diseaseType, severityFilter = 'all' }: DiseaseHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

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

      // Create a layer group for markers
      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup only on unmount
    return () => {
      try {
        if (mapRef.current) {
          // Stop any ongoing animations/transitions
          mapRef.current.stop();

          // Remove all event listeners
          mapRef.current.off();

          // Clear layers before removing map
          if (layerGroupRef.current) {
            layerGroupRef.current.clearLayers();
            layerGroupRef.current.remove();
            layerGroupRef.current = null;
          }

          // Finally remove the map
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (error) {
        console.error('Error cleaning up map:', error);
      }
    };
  }, []); // Empty deps - initialize once

  // Effect 2: Update data layers when data or diseaseType changes
  useEffect(() => {
    // Safety checks - ensure map and layer group are ready
    if (!mapRef.current || !layerGroupRef.current || !data || data.length === 0) return;

    // Additional check: ensure map container still exists and map is loaded
    if (!mapContainerRef.current || !mapRef.current._container) return;

    // Check if map is fully loaded and not in transition
    if (!mapRef.current._loaded || !mapRef.current._panes) {
      console.warn('Map not fully loaded, skipping layer update');
      return;
    }

    try {
      // Clear previous markers safely using LayerGroup
      if (layerGroupRef.current && layerGroupRef.current._layers) {
        layerGroupRef.current.clearLayers();
      } else {
        return; // Don't proceed if layer group is null or invalid
      }

      const bounds = L.latLngBounds([]);

      // Add circle markers for each barangay with cases
      data.forEach((barangay) => {
        if (!barangay.coordinates) return;

        // Apply severity filter BEFORE rendering
        if (severityFilter !== 'all') {
          if (severityFilter === 'high') {
            // Show ONLY barangays with high-risk cases
            if (barangay.statistics.high_risk_cases === 0) {
              return; // Skip if no high risk cases
            }
          } else if (severityFilter === 'medium') {
            // Show ONLY barangays with medium-risk cases AND no high-risk cases
            if (barangay.statistics.medium_risk_cases === 0 || barangay.statistics.high_risk_cases > 0) {
              return; // Skip if no medium risk cases OR if has high risk cases
            }
          } else if (severityFilter === 'low') {
            // Show ONLY barangays with low-risk cases (no high or medium)
            if (barangay.statistics.high_risk_cases > 0 || barangay.statistics.medium_risk_cases > 0) {
              return; // Skip if has high or medium risk cases
            }
            // Also skip if no cases at all
            if (barangay.statistics.total_cases === 0) {
              return;
            }
          } else if (severityFilter === 'no_cases') {
            // Show ONLY barangays with NO cases (gray markers only)
            if (barangay.statistics.total_cases !== 0) {
              return; // Skip if has any cases
            }
          }
        }

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

        // Determine color based on case severity
        let color: string;
        let riskLevel: string;

        if (barangay.statistics.high_risk_cases > 0) {
          // Has high-risk cases (≥70%)
          color = '#dc2626'; // red-600
          riskLevel = 'HIGH RISK';
        } else if (barangay.statistics.medium_risk_cases > 0) {
          // Has medium-risk cases (50-69%)
          color = '#f59e0b'; // amber-500
          riskLevel = 'MEDIUM RISK';
        } else if (barangay.statistics.total_cases > 0) {
          // Has cases but all low-risk (<50%)
          color = '#16a34a'; // green-600
          riskLevel = 'LOW RISK';
        } else {
          // No cases
          color = '#9ca3af'; // gray-400
          riskLevel = 'NO CASES';
        }

        const population = barangay.population || 5610;

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

        // Add to layer group instead of directly to map
        if (layerGroupRef.current) {
          circle.addTo(layerGroupRef.current);
        }

        // Create disease breakdown HTML
        const diseaseBreakdown = barangay.diseases
          .map(d => {
            const displayName = getDiseaseDisplayName(d.disease_type, d.custom_disease_name);
            return `<div class="text-xs text-gray-700 pl-2 py-0.5">
              <span class="font-medium">${displayName}:</span>
              <span class="text-gray-600">${d.total_count} case${d.total_count !== 1 ? 's' : ''}</span>
              <span class="text-gray-500 text-xs">(${d.active_count} active, ${d.high_risk_count} high risk)</span>
            </div>`;
          })
          .join('');

        // Popup with statistics and disease breakdown
        circle.bindPopup(`
          <div class="p-3" style="max-width: 280px;">
            <h3 class="font-bold text-lg mb-2">${barangay.barangay_name}</h3>

            <div class="space-y-1 text-sm mb-3">
              <div class="flex justify-between">
                <span>Status:</span>
                <span class="font-semibold ${
                  color === '#dc2626' ? 'text-red-600' :
                  color === '#f59e0b' ? 'text-amber-500' :
                  color === '#16a34a' ? 'text-green-600' : 'text-gray-400'
                }">${riskLevel}</span>
              </div>
              <div class="flex justify-between">
                <span>Total Cases:</span>
                <span class="font-semibold">${barangay.statistics.total_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Population:</span>
                <span class="font-semibold">${population.toLocaleString()}</span>
              </div>
            </div>

            ${barangay.diseases.length > 0 ? `
              <div class="border-t border-gray-200 pt-2 mt-2">
                <h4 class="text-xs font-semibold text-gray-800 mb-1.5">Diseases Present:</h4>
                <div class="space-y-0.5">
                  ${diseaseBreakdown}
                </div>
              </div>
            ` : ''}

            <div class="border-t border-gray-200 pt-2 mt-2 space-y-1 text-xs">
              <div class="flex justify-between">
                <span>Active:</span>
                <span class="font-semibold text-orange-600">${barangay.statistics.active_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>High Risk:</span>
                <span class="font-semibold text-red-600">${barangay.statistics.high_risk_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Medium Risk:</span>
                <span class="font-semibold text-amber-500">${barangay.statistics.medium_risk_cases}</span>
              </div>
              <div class="flex justify-between">
                <span>Recovered:</span>
                <span class="font-semibold text-green-600">${barangay.statistics.recovered_cases}</span>
              </div>
            </div>
          </div>
        `);

        bounds.extend([lat, lng]);
      });

      // Fit map bounds to show all circles
      if (bounds.isValid() && mapRef.current && mapRef.current._container && mapContainerRef.current) {
        try {
          // Additional check: ensure map has valid panes before fitBounds
          if (mapRef.current._loaded && mapRef.current._panes) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
          }
        } catch (fitBoundsError) {
          console.warn('Could not fit bounds, map may be in transition:', fitBoundsError);
        }
      }
    } catch (error) {
      console.error('Error updating map layers:', error);
    }
  }, [data, diseaseType, severityFilter]); // Update when data, disease type, or severity filter changes

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-96 rounded-lg border border-gray-200" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-[1000] max-w-xs">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Case Severity</h4>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span>High Risk (≥70%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span>Medium Risk (50-69%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span>Low Risk (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span>No Cases</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2 space-y-1">
          <p className="text-xs text-gray-700 font-medium">Severity Calculation:</p>
          <p className="text-xs text-gray-600">
            (Cases / Population) × 100
          </p>
          <p className="text-xs text-gray-500 italic">
            Circle size = case count
          </p>
        </div>
      </div>
    </div>
  );
}
