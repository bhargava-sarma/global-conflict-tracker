'use client';

import { useEffect, useState } from 'react';
import { Database } from '@/lib/supabase';

type Event = Database['public']['Tables']['events']['Row'];

interface TopEventsProps {
    events: Event[];
    onEventClick: (lat: number, lng: number) => void;
}

export default function TopEvents({ events, onEventClick }: TopEventsProps) {
    const [criticalEvents, setCriticalEvents] = useState<Event[]>([]);

    useEffect(() => {
        // Filter for RED severity events, sort by date descending, take top 5
        const filtered = events
            .filter(e => e.severity === 'red')
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
            .slice(0, 5);

        setCriticalEvents(filtered);
    }, [events]);

    if (criticalEvents.length === 0) return null;

    return (
        <div className="absolute bottom-6 left-6 z-[1000] w-[320px] glass-card overflow-hidden border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <h3 className="font-bold text-xs text-red-100 uppercase tracking-widest">Global Critical Alerts</h3>
                </div>
                <span className="text-[10px] text-red-300 bg-red-500/20 px-1.5 py-0.5 rounded font-mono">
                    LIVE
                </span>
            </div>

            <div className="flex flex-col">
                {criticalEvents.map((event, index) => (
                    <button
                        key={event.id}
                        onClick={() => onEventClick(event.latitude, event.longitude)}
                        className={`text-left px-4 py-3 hover:bg-white/5 transition-colors group ${index !== criticalEvents.length - 1 ? 'border-b border-white/5' : ''
                            }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider">{event.country || 'Global'}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(event.occurred_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <h4 className="text-xs text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                            {event.title}
                        </h4>
                    </button>
                ))}
            </div>
        </div>
    );
}
