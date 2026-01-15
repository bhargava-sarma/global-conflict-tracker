'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

export default function MapWrapper() {
    const Map = useMemo(() => dynamic(
        () => import('./Map'),
        {
            loading: () => (
                <div className="w-full h-screen bg-[#1a1a1a] flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ),
            ssr: false
        }
    ), []);

    return <Map />;
}
