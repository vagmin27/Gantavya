import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
  MapPin,
  Compass,
  Navigation,
  Plus,
  Minus,
  Maximize2,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

/**
 * Normalizes coordinates from GeoJSON [lon, lat] or object { latitude, longitude }.
 */
function extractCoords(entity) {
  if (!entity) return null;
  if (Array.isArray(entity.location?.coordinates)) {
    return {
      lon: entity.location.coordinates[0],
      lat: entity.location.coordinates[1]
    };
  }
  if (entity.coordinates?.latitude && entity.coordinates?.longitude) {
    return {
      lon: entity.coordinates.longitude,
      lat: entity.coordinates.latitude
    };
  }
  if (Array.isArray(entity.coordinates)) {
    return {
      lon: entity.coordinates[0],
      lat: entity.coordinates[1]
    };
  }
  return null;
}

export default function DestinationMap({
  destination,
  places = [],
  selectedPlaceId = null,
  onSelectPlace,
  className = ''
}) {
  const [zoom, setZoom] = useState(1);
  const [mapStyle, setMapStyle] = useState('street'); // 'street' | 'terrain' | 'satellite'
  const [activeMarker, setActiveMarker] = useState(null);

  const destCoords = useMemo(() => extractCoords(destination) || { lon: 85.324, lat: 27.7172 }, [destination]);

  // Extract all valid place coordinates
  const validPlaces = useMemo(() => {
    return places
      .map((p) => ({
        ...p,
        coords: extractCoords(p)
      }))
      .filter((p) => p.coords !== null);
  }, [places]);

  // Synchronize when selectedPlaceId prop changes
  useEffect(() => {
    if (selectedPlaceId) {
      const match = validPlaces.find((p) => p._id === selectedPlaceId);
      if (match) setActiveMarker(match);
    }
  }, [selectedPlaceId, validPlaces]);

  // Calculate bounding box for geographic projection
  const bounds = useMemo(() => {
    const allLats = [destCoords.lat, ...validPlaces.map((p) => p.coords.lat)];
    const allLons = [destCoords.lon, ...validPlaces.map((p) => p.coords.lon)];

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLon = Math.min(...allLons);
    const maxLon = Math.max(...allLons);

    const latSpan = Math.max(maxLat - minLat, 0.04);
    const lonSpan = Math.max(maxLon - minLon, 0.04);

    return {
      minLat: minLat - latSpan * 0.25,
      maxLat: maxLat + latSpan * 0.25,
      minLon: minLon - lonSpan * 0.25,
      maxLon: maxLon + lonSpan * 0.25
    };
  }, [destCoords, validPlaces]);

  // Project lat/lon to percentage (x, y)
  const project = (lat, lon) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return {
      x: Math.min(Math.max(x, 5), 95),
      y: Math.min(Math.max(y, 5), 95)
    };
  };

  const destPos = project(destCoords.lat, destCoords.lon);

  const handleMarkerClick = (place) => {
    setActiveMarker(place);
    if (onSelectPlace) {
      onSelectPlace(place._id);
    }
  };

  return (
    <Card className={`relative overflow-hidden border border-border shadow-md ${className}`}>
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md border border-border shadow-xs text-xs font-semibold text-main">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>
              {destination?.name || 'Destination Area'} ({validPlaces.length} attractions mapped)
            </span>
          </div>
        </div>

        {/* Map Style & Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="flex bg-surface/90 backdrop-blur-md border border-border rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setMapStyle('street')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                mapStyle === 'street' ? 'bg-primary text-primary-fg font-bold' : 'text-muted hover:text-main'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                mapStyle === 'satellite' ? 'bg-primary text-primary-fg font-bold' : 'text-muted hover:text-main'
              }`}
            >
              Satellite
            </button>
          </div>

          <div className="flex items-center bg-surface/90 backdrop-blur-md border border-border rounded-xl shadow-xs">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 1.8))}
              className="p-1.5 text-muted hover:text-main border-r border-border"
              title="Zoom in"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.8))}
              className="p-1.5 text-muted hover:text-main"
              title="Zoom out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Graphic Canvas */}
      <div
        className={`relative w-full h-80 sm:h-96 overflow-hidden transition-all duration-300 select-none ${
          mapStyle === 'satellite'
            ? 'bg-slate-900'
            : 'bg-card-muted/60'
        }`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: `${destPos.x}% ${destPos.y}%`
        }}
      >
        {/* SVG Map Grid & Coordinate Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 stroke-current text-border">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Topographic Elevation Rings */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className="absolute rounded-full border border-primary/40 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${destPos.x}%`,
              top: `${destPos.y}%`,
              width: '180px',
              height: '180px'
            }}
          />
          <div
            className="absolute rounded-full border border-primary/20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${destPos.x}%`,
              top: `${destPos.y}%`,
              width: '320px',
              height: '320px'
            }}
          />
        </div>

        {/* Connection rays from destination center to places */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {validPlaces.map((place) => {
            const pos = project(place.coords.lat, place.coords.lon);
            const isSelected = activeMarker?._id === place._id;
            return (
              <line
                key={place._id}
                x1={`${destPos.x}%`}
                y1={`${destPos.y}%`}
                x2={`${pos.x}%`}
                y2={`${pos.y}%`}
                stroke={isSelected ? 'var(--color-primary, #2563EB)' : '#94A3B8'}
                strokeWidth={isSelected ? '2' : '1'}
                strokeDasharray={isSelected ? 'none' : '3 3'}
                strokeOpacity={isSelected ? 0.9 : 0.35}
              />
            );
          })}
        </svg>

        {/* Primary Destination Beacon Pin */}
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-full cursor-pointer group"
          style={{ left: `${destPos.x}%`, top: `${destPos.y}%` }}
          onClick={() => setActiveMarker(null)}
        >
          <div className="relative flex flex-col items-center">
            <div className="px-2 py-0.5 rounded-md bg-primary text-primary-fg text-[10px] font-bold font-heading shadow-md whitespace-nowrap mb-1">
              ★ {destination?.name || 'Center'}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg ring-4 ring-primary/30 group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4 fill-white" />
            </div>
            <div className="w-2 h-2 bg-primary rounded-full mt-0.5 animate-ping opacity-75" />
          </div>
        </div>

        {/* Place Attraction Markers */}
        {validPlaces.map((place) => {
          const pos = project(place.coords.lat, place.coords.lon);
          const isSelected = activeMarker?._id === place._id;

          return (
            <div
              key={place._id}
              className="absolute z-10 -translate-x-1/2 -translate-y-full cursor-pointer group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => handleMarkerClick(place)}
            >
              <div className="relative flex flex-col items-center">
                {/* Marker Pill on Hover or Active */}
                <div
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap mb-1 transition-all shadow-xs ${
                    isSelected
                      ? 'bg-primary text-primary-fg font-bold scale-105'
                      : 'bg-surface/90 text-main border border-border opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {place.name}
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary text-white ring-4 ring-primary/40 scale-125 shadow-lg'
                      : 'bg-surface border border-border text-primary hover:border-primary hover:scale-110 shadow-xs'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Active Marker Card Overlay */}
      {activeMarker && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-20 animate-in slide-in-from-bottom-2 duration-150">
          <div className="p-4 rounded-2xl bg-surface/95 backdrop-blur-md border border-border shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="primary" size="sm">
                {activeMarker.category || 'Attraction'}
              </Badge>
              <button
                onClick={() => setActiveMarker(null)}
                className="text-muted hover:text-main text-xs p-1"
              >
                ✕
              </button>
            </div>

            <h4 className="text-sm font-bold font-heading text-main">{activeMarker.name}</h4>

            {activeMarker.description && (
              <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                {activeMarker.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/60">
              {activeMarker.estimatedVisitDuration ? (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-muted" />
                  {activeMarker.estimatedVisitDuration} mins
                </span>
              ) : (
                <span className="font-mono">Verified Point</span>
              )}

              {activeMarker.priceInfo?.estimatedCost ? (
                <span className="font-mono text-amber-500 font-semibold">
                  {activeMarker.priceInfo.currency || 'NPR'} {activeMarker.priceInfo.estimatedCost}
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold">Free Visit</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Coordinates Status */}
      <div className="px-4 py-2 border-t border-border bg-card/60 flex items-center justify-between text-[11px] text-muted font-mono">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-primary" />
          <span>
            Center: {destCoords.lat.toFixed(4)}°N, {destCoords.lon.toFixed(4)}°E
          </span>
        </div>
        <span>Interactive Map Canvas &bull; OpenStreetMap Projection</span>
      </div>
    </Card>
  );
}

