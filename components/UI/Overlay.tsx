'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function UIOverlay() {
    const [loading, setLoading] = useState(true);
    const [dataFetched, setDataFetched] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        // Simulate progress bar while waiting for fetch
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 5; // slowly increment
            });
        }, 500);

        const initData = async () => {
            try {
                console.log("Overlay: Triggering auto-fetch...");
                const res = await fetch('/api/cron/fetch-news');
                const data = await res.json();

                if (data.success) {
                    setLastUpdated(new Date());
                    // Force a map refresh if possible, or reliable on swr/polling
                    // For now, we assume standard polling will catch it, or we reload page?
                    // Better: Just let the user know.
                }
            } catch (e) {
                console.error("Auto-fetch failed", e);
            } finally {
                clearInterval(progressInterval);
                setLoadingProgress(100);
                setTimeout(() => {
                    setLoading(false);
                    setDataFetched(true);
                }, 800); // slight delay to show 100%
            }
        };

        initData();

        // Set initial "Updated" time (mocking it as 'now' since we just fetched, 
        // or ideally fetching metadata from DB, but 'now' is fine for this flow)
        setLastUpdated(new Date());

        return () => clearInterval(progressInterval);
    }, []);

    // Update "time ago" every minute
    const [timeAgo, setTimeAgo] = useState('Just now');
    useEffect(() => {
        if (!lastUpdated) return;

        const timer = setInterval(() => {
            setTimeAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }));
        }, 60000);

        return () => clearInterval(timer);
    }, [lastUpdated]);

    return (
        <>
            {/* Top Left: Title Box */}
            <div className="absolute top-6 left-6 z-[1000] flex flex-col items-start pointer-events-none select-none">
                <div className="glass px-4 py-3 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
                    <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                        Live Conflict Tracker
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                        </span>
                        <span className="text-red-400 text-xs font-bold uppercase tracking-widest">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Top Right: Last Updated */}
            <div className="absolute top-6 right-6 z-[1000] pointer-events-none select-none">
                <div className="glass px-4 py-2 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-gray-300 text-xs font-medium">Updated <span className="text-white">{timeAgo}</span></span>
                </div>
            </div>

            {/* Full Screen Blocking Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center select-none cursor-wait">

                    <div className="glass px-10 py-8 rounded-2xl flex flex-col items-center gap-6 max-w-sm w-full shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-white/10 border-t-red-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-white font-bold text-lg tracking-tight">Initializing Intelligence</h2>
                            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Scanning Global Sources</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300 ease-out"
                                style={{ width: `${loadingProgress}%` }}
                            />
                        </div>

                        <p className="text-[10px] text-gray-500 font-mono">{loadingProgress}% Complete</p>
                    </div>
                </div>
            )}
        </>
    );
}

