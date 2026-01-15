import MapWrapper from '@/components/Map';
import UIOverlay from '@/components/UI/Overlay';

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#1a1a1a]">
      <UIOverlay />
      <MapWrapper />

      {/* Footer / Attribution can remain specifically small at bottom right or be removed if user wants clean look. Keeping minimal. */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-gray-500">
          Data sources: NewsAPI, Perplexity • Updates Hourly
        </p>
      </div>
    </main>
  );
}
