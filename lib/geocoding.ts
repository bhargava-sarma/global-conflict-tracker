export interface GeoLocation {
    lat: number;
    lon: number;
    display_name: string;
    address: {
        city?: string;
        state?: string;
        country?: string;
    };
}

export async function geocodeLocation(query: string): Promise<GeoLocation | null> {
    if (!query) return null;

    try {
        // delay to respect rate limits (1 sec ideally, but maybe less here if low volume)
        // await new Promise(resolve => setTimeout(resolve, 1000));

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GlobalConflictTracker/1.0 (contact@example.com)' // Required by Nominatim
            }
        });

        if (!response.ok) {
            console.warn(`Geocoding failed for ${query}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                display_name: result.display_name,
                address: result.address
            };
        }

        return null;
    } catch (error) {
        console.error(`Geocoding error for ${query}:`, error);
        return null;
    }
}
