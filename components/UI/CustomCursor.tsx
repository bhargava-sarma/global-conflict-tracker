'use client';

import { useEffect, useState, useRef } from 'react';

const CustomCursor = () => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [isHoveringCountry, setIsHoveringCountry] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const updateCursor = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
            }
            if (!isVisible) setIsVisible(true);
        };

        const handleMouseDown = () => setIsClicked(true);
        const handleMouseUp = () => setIsClicked(false);

        // Listen for custom events dispatched from the Map component
        const handleCountryEnter = () => setIsHoveringCountry(true);
        const handleCountryLeave = () => setIsHoveringCountry(false);

        window.addEventListener('mousemove', updateCursor);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('country-enter', handleCountryEnter);
        window.addEventListener('country-leave', handleCountryLeave);

        // Hide cursor when leaving window
        document.body.addEventListener('mouseleave', () => setIsVisible(false));
        document.body.addEventListener('mouseenter', () => setIsVisible(true));

        return () => {
            window.removeEventListener('mousemove', updateCursor);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('country-enter', handleCountryEnter);
            window.removeEventListener('country-leave', handleCountryLeave);
            document.body.removeEventListener('mouseleave', () => setIsVisible(false));
            document.body.removeEventListener('mouseenter', () => setIsVisible(true));
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div
            ref={cursorRef}
            className="pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform" // Remove transition-transform for instant tracking
            style={{
                // Initial position off-screen or 0,0 - updated by JS immediately
                transform: 'translate3d(0, 0, 0) translate(-50%, -50%)'
            }}
        >
            {/* Crosshair Container */}
            <div className={`relative flex items-center justify-center transition-all duration-300 ${isHoveringCountry ? 'scale-150' : 'scale-100'
                }`}>

                {/* Center Dot */}
                <div className={`w-1 h-1 rounded-full transition-colors duration-200 ${isClicked ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' :
                    isHoveringCountry ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-white'
                    }`} />

                {/* Reticle / Crosshair Lines */}
                <div className={`absolute border border-white/30 rounded-full transition-all duration-300 ${isHoveringCountry ? 'w-8 h-8 opacity-100 border-cyan-400/50' : 'w-12 h-12 opacity-40'
                    }`}></div>

                {/* Cross Lines */}
                <div className={`absolute w-[20px] h-[1px] bg-white/20 transition-all duration-300 ${isHoveringCountry ? 'w-[10px] bg-cyan-400/60' : ''
                    }`}></div>
                <div className={`absolute h-[20px] w-[1px] bg-white/20 transition-all duration-300 ${isHoveringCountry ? 'h-[10px] bg-cyan-400/60' : ''
                    }`}></div>

                {/* Click Flash Ring */}
                {isClicked && (
                    <div className="absolute w-full h-full rounded-full border-2 border-red-500 animate-ping opacity-50"></div>
                )}
            </div>
        </div>
    );
};

export default CustomCursor;
