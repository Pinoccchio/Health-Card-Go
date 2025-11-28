'use client';

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { PANABO_MAP_CONFIG, RISK_COLORS } from '@/lib/config/panaboMapData';
import 'leaflet/dist/leaflet.css';

export function PanaboMap() {
  return (
    <MapContainer
      center={PANABO_MAP_CONFIG.center}
      zoom={PANABO_MAP_CONFIG.zoom}
      zoomControl={false}
      className="h-full w-full rounded-lg"
      style={{ minHeight: '400px' }}
    >
      {/* OpenStreetMap Tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Custom Zoom Control (bottom-right) */}
      <ZoomControl position="bottomright" />

      {/* Barangay Markers */}
      {PANABO_MAP_CONFIG.barangays.map((barangay) => (
        <CircleMarker
          key={barangay.id}
          center={barangay.coordinates}
          radius={12}
          pathOptions={{
            fillColor: RISK_COLORS[barangay.riskLevel],
            fillOpacity: 0.7,
            color: '#ffffff',
            weight: 2,
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-gray-800 mb-2">{barangay.name}</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">Cases:</span> {barangay.casesCount}
                </p>
                {barangay.population && (
                  <p className="text-gray-700">
                    <span className="font-semibold">Population:</span> {barangay.population.toLocaleString()}
                  </p>
                )}
                <p className="text-gray-700">
                  <span className="font-semibold">Risk Level:</span>{' '}
                  <span
                    className="px-2 py-0.5 rounded text-white text-xs font-medium"
                    style={{ backgroundColor: RISK_COLORS[barangay.riskLevel] }}
                  >
                    {barangay.riskLevel.replace('-', ' ').toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
