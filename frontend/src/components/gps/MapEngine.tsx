import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Forensic generic div icon
const createIcon = (color: string) => L.divIcon({
  className: "custom-leaflet-icon",
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.8); box-shadow: 0 0 12px ${color}"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const startIcon = createIcon("#10b981"); // emerald
const endIcon = createIcon("#ef4444"); // red
const stopIcon = createIcon("#f97316"); // orange
const anomalyIcon = createIcon("#a855f7"); // purple

// Helper component to recenter map cleanly upon data load
function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

export default function MapEngine({ data, timeIndex }: { data: any, timeIndex: number }) {
  if (!data || !data.points || data.points.length === 0) return null;

  // Filter points based on scrubber state
  const visiblePoints = data.points.slice(0, timeIndex + 1);
  const pathPositions = visiblePoints.map((p: any) => [parseFloat(p.latitude), parseFloat(p.longitude)] as [number, number]);
  
  // Filter visible stops based on current max timestamp
  const currentMaxTime = new Date(visiblePoints[visiblePoints.length - 1].timestamp).getTime();
  const visibleStops = data.stops ? data.stops.filter((s: any) => new Date(s.start_time).getTime() <= currentMaxTime) : [];
  const visibleAnomalies = data.speed_anomalies ? data.speed_anomalies.filter((a: any) => new Date(a.start_timestamp).getTime() <= currentMaxTime) : [];

  const startCoord = pathPositions[0];
  const endCoord = pathPositions[pathPositions.length - 1];

  return (
    <div className="w-full h-full relative z-0">
       <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container { background: #0a0a0a !important; font-family: inherit; }
        .leaflet-popup-content-wrapper { background: #111; color: #fff; border: 1px solid #222; border-radius: 4px; }
        .leaflet-popup-tip { background: #111; border-color: #222; }
      `}} />
      <MapContainer 
        center={startCoord} 
        zoom={13} 
        scrollWheelZoom={true} 
        className="w-full h-full select-none"
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {pathPositions.length > 0 && timeIndex === data.points.length - 1 && (
          <MapBounds positions={pathPositions} />
        )}

        <Polyline positions={pathPositions} color="#00f0ff" weight={3} opacity={0.6} />

        {/* Start Marker */}
        {startCoord && (
          <Marker position={startCoord} icon={startIcon}>
            <Popup>
               <span className="font-mono text-xs text-brand-emerald">ORIGIN POINT</span><br/>
               <span className="text-neutral-400 text-xs">{visiblePoints[0].timestamp}</span>
            </Popup>
          </Marker>
        )}
        
        {/* End / Current Marker */}
        {endCoord && pathPositions.length > 1 && (
          <Marker position={endCoord} icon={endIcon}>
             <Popup>
                <span className="font-mono text-xs text-red-400">CURRENT POSITION</span><br/>
                <span className="text-neutral-400 text-xs">{visiblePoints[visiblePoints.length - 1].timestamp}</span>
             </Popup>
          </Marker>
        )}

        {/* Stops */}
        {visibleStops.map((stop: any, idx: number) => (
          <Marker key={`stop-${idx}`} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
            <Popup>
               <div className="font-mono text-xs space-y-1">
                  <strong className="text-orange-500">STATIONARY EVENT</strong><br/>
                  <span className="text-neutral-400">Dur:</span> {stop.duration_minutes} mins<br/>
                  <span className="text-neutral-400">Start:</span> {stop.start_time.split(' ')[1]}
               </div>
            </Popup>
          </Marker>
        ))}

        {/* Anomalies */}
        {visibleAnomalies.map((anomaly: any, idx: number) => {
           // We need to map the anomaly to a lat/lng. We can try to find the point matching the timestamp
           const point = data.points.find((p: any) => p.timestamp === anomaly.start_timestamp);
           if (!point) return null;
           
           return (
              <Marker key={`anomaly-${idx}`} position={[point.latitude, point.longitude]} icon={anomalyIcon}>
                <Popup>
                   <div className="font-mono text-xs space-y-1">
                      <strong className="text-purple-500">ANOMALY DETECTED</strong><br/>
                      {anomaly.is_teleport ? (
                         <span className="text-red-400 block font-bold">TELEPORT: {anomaly.distance_km}km</span>
                      ) : (
                         <span className="text-red-400 block">SPEED: {anomaly.speed_kmh} km/h</span>
                      )}
                      <span className="text-neutral-400">Time:</span> {anomaly.start_timestamp.split(' ')[1]}
                   </div>
                </Popup>
              </Marker>
           );
        })}
      </MapContainer>
    </div>
  );
}
