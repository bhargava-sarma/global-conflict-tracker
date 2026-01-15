'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Database } from '@/lib/supabase';

// Fix for default Leaflet markers in Next.js
// Custom Pulsing Dot Icons
const createPulseIcon = (color: string, glowColor: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<span class="relative flex h-2.5 w-2.5">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${glowColor}"></span>
    <span class="relative inline-flex rounded-full h-2.5 w-2.5" style="background-color: ${color}; border: 1.5px solid rgba(255,255,255,0.3)"></span>
  </span>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -6]
});

const icons = {
    red: createPulseIcon('#ef4444', '#f87171'), // red-500, red-400
    yellow: createPulseIcon('#eab308', '#facc15'), // yellow-500, yellow-400
    green: createPulseIcon('#22c55e', '#4ade80'), // green-500, green-400
    blue: createPulseIcon('#3b82f6', '#60a5fa') // blue-500, blue-400
};

type Event = Database['public']['Tables']['events']['Row'];

export default function MapComponent() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events?limit=150');
            const data = await res.json();
            if (data.success) {
                setEvents(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch events', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        // Poll every 5 minutes (300000ms)
        const interval = setInterval(fetchEvents, 300000);
        return () => clearInterval(interval);
    }, []);

    // Bounds for the world (SouthWest, NorthEast)
    // Prevents scrolling infinitely horizontally or vertically
    const worldBounds = new L.LatLngBounds(
        [-85, -180], // SouthWest
        [85, 180]    // NorthEast
    );

    return (
        <div className="relative w-full h-screen z-0">
            <MapContainer
                center={[20, 0]}
                zoom={2.5}
                minZoom={2.5} // Prevents "zoomed out too far" look
                maxBounds={worldBounds} // Hard limit on panning
                maxBoundsViscosity={1.0} // Sticky bounds (no bouncing past edge)
                scrollWheelZoom={true}
                style={{ height: '100vh', width: '100%' }}
                className="z-0 bg-[#1a1a1a]"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    noWrap={true} // Stops the map from repeating horizontally
                />

                {events.map((event) => (
                    <Marker
                        key={event.id}
                        position={[event.latitude, event.longitude]}
                        icon={icons[event.severity as keyof typeof icons] || icons.blue}
                        eventHandlers={{
                            // Open on click OR hover
                            click: (e) => e.target.openPopup(),
                            mouseover: (e) => e.target.openPopup(),
                            // We REMOVED mouseout: (e) => e.target.closePopup()
                            // This allows the user to move their mouse from the dot TO the popup without it closing.
                            // The popup will stay open until another is opened or the map is clicked.
                        }}
                    >
                        <Popup className="glass-popup" closeButton={false} autoPan={true}>
                            <div className="min-w-[240px]">
                                <h3 className="font-bold text-sm mb-2 text-white border-b border-white/10 pb-2">{event.title}</h3>
                                <div className="text-xs text-gray-300 mb-3 whitespace-pre-line leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar">
                                    {event.description}
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${event.severity === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                            event.severity === 'yellow' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-green-500'
                                            }`}></span>
                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{event.event_type}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(event.occurred_at).toLocaleString([], {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                {event.source_url && event.source_url.length > 0 && (
                                    <a
                                        href={event.source_url[0]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full text-center py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/5 rounded transition-colors text-blue-300"
                                    >
                                        Read Report
                                    </a>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Loading Indicator */}
            {loading && (
                <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full text-xs text-white z-[1000]">
                    Updates live...
                </div>
            )}
        </div>
    );
}
