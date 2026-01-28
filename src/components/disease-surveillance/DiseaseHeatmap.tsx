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
  area_km2?: number; // Barangay area in km² for geographic circle sizing
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

/**
 * Calculate severity percentage based on case count relative to population.
 * This creates a meaningful metric that scales with the actual impact on the community.
 *
 * @param caseCount - Number of disease cases
 * @param population - Barangay population (defaults to 5610 if not provided)
 * @returns Percentage of population affected (0-100+)
 */
function getSeverityPercentage(caseCount: number, population: number): number {
  if (!population || population <= 0) return 0;
  return (caseCount / population) * 100;
}

/**
 * Get gradient color based on severity percentage.
 * Uses a 6-level color scale from gray (no cases) to dark red (critical/epidemic level).
 *
 * @param percentage - Severity percentage (cases/population * 100)
 * @returns Object with color hex and risk level label
 */
function getGradientColor(percentage: number): { color: string; label: string } {
  // CRITICAL: ≥100% (epidemic level - cases exceed population, possible reinfections)
  if (percentage >= 100) {
    return { color: '#7f1d1d', label: 'CRITICAL' }; // red-900 (darkest)
  }
  // HIGH: 70-99%
  if (percentage >= 70) {
    return { color: '#dc2626', label: 'HIGH RISK' }; // red-600
  }
  // ELEVATED: 50-69%
  if (percentage >= 50) {
    return { color: '#f59e0b', label: 'MEDIUM RISK' }; // amber-500
  }
  // MODERATE: 25-49%
  if (percentage >= 25) {
    return { color: '#eab308', label: 'MODERATE' }; // yellow-500
  }
  // LOW: 1-24% (any cases below 25%)
  if (percentage > 0) {
    return { color: '#16a34a', label: 'LOW RISK' }; // green-600
  }
  // NO CASES
  return { color: '#9ca3af', label: 'NO CASES' }; // gray-400
}

/**
 * Calculate circle radius in METERS based on barangay area and case count.
 * This ensures circles scale properly with zoom and don't overlap adjacent barangays.
 *
 * @param areaKm2 - Barangay area in km² (defaults to 5.0 if null)
 * @param totalCases - Number of disease cases in this barangay
 * @param maxCasesInView - Maximum cases across all visible barangays (for relative scaling)
 * @returns Radius in meters
 */
function calculateCircleRadius(
  areaKm2: number | null | undefined,
  totalCases: number,
  maxCasesInView: number
): number {
  const area = areaKm2 || 5.0; // Default to 5.0 km² if not available

  // Calculate max radius that fits in barangay (30% of the theoretical max)
  // r = sqrt(Area/π) gives radius of circle with same area
  // We use 30% to leave space between circles
  const areaInSquareMeters = area * 1000000; // Convert km² to m²
  const maxRadiusFromArea = Math.sqrt(areaInSquareMeters / Math.PI) * 0.3;

  // Clamp the max radius between 200m and 2000m for visual balance
  const safeMaxRadius = Math.min(Math.max(maxRadiusFromArea, 200), 2000);

  // Minimum radius for visibility
  const minRadius = 200;

  // If no cases, return minimum radius
  if (totalCases === 0 || maxCasesInView === 0) {
    return minRadius;
  }

  // Scale radius by case ratio using sqrt for visual balance
  // sqrt makes the visual difference more proportional (area scales with cases)
  const caseRatio = totalCases / maxCasesInView;
  const scaledRadius = minRadius + (safeMaxRadius - minRadius) * Math.sqrt(caseRatio);

  return scaledRadius;
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

      // Calculate max cases across all barangays for relative circle sizing
      const maxCases = Math.max(...data.map(b => b.statistics.total_cases), 1);

      // Add geographic circles for each barangay with cases
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

        // Get population (default to 5610 if not provided)
        const population = barangay.population || 5610;
        const totalCases = barangay.statistics.total_cases;

        // Calculate severity percentage based on total cases vs population
        // This creates a gradient that intensifies as more cases are added
        const severityPercentage = getSeverityPercentage(totalCases, population);

        // Get gradient color based on percentage - color now scales with case count
        const { color, label: riskLevel } = getGradientColor(severityPercentage);

        // Calculate circle radius in METERS based on barangay area
        // This ensures circles scale properly with zoom and don't overlap
        const radiusMeters = calculateCircleRadius(
          barangay.area_km2,
          barangay.statistics.total_cases,
          maxCases
        );

        // Create geographic circle (radius in meters, scales with zoom)
        const circle = L.circle([lat, lng], {
          radius: radiusMeters,
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

        // Get appropriate text color class based on risk level
        const getRiskLevelColorClass = (level: string): string => {
          switch (level) {
            case 'CRITICAL': return 'text-red-900';
            case 'HIGH RISK': return 'text-red-600';
            case 'MEDIUM RISK': return 'text-amber-500';
            case 'MODERATE': return 'text-yellow-600';
            case 'LOW RISK': return 'text-green-600';
            default: return 'text-gray-400';
          }
        };

        // Popup with statistics and disease breakdown
        circle.bindPopup(`
          <div class="p-3" style="max-width: 280px;">
            <h3 class="font-bold text-lg mb-2">${barangay.barangay_name}</h3>

            <div class="space-y-1 text-sm mb-3">
              <div class="flex justify-between">
                <span>Status:</span>
                <span class="font-semibold ${getRiskLevelColorClass(riskLevel)}">${riskLevel}</span>
              </div>
              <div class="flex justify-between">
                <span>Severity:</span>
                <span class="font-semibold">${severityPercentage.toFixed(1)}%</span>
              </div>
              <div class="flex justify-between">
                <span>Total Cases:</span>
                <span class="font-semibold">${barangay.statistics.total_cases.toLocaleString()}</span>
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
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Severity by Population %</h4>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7f1d1d' }}></div>
            <span className="text-red-900 font-medium">Critical (≥100%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-red-600"></div>
            <span>High Risk (70-99%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span>Medium Risk (50-69%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span>Moderate (25-49%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-green-600"></div>
            <span>Low Risk (1-24%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span>No Cases (0%)</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-2 space-y-1">
          <p className="text-xs text-gray-700 font-medium">Severity Formula:</p>
          <p className="text-xs text-gray-600">
            (Total Cases ÷ Population) × 100
          </p>
          <p className="text-xs text-gray-500 italic">
            Color intensifies with more cases
          </p>
          <p className="text-xs text-gray-400 italic">
            Circle size ∝ case count
          </p>
        </div>
      </div>
    </div>
  );
}
