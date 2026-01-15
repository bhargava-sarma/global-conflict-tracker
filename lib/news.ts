import { Database } from './supabase';
import { geocodeLocation } from './geocoding';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2/everything';

export type EventSeverity = 'red' | 'yellow' | 'green';
export type EventType = 'conflict' | 'protest' | 'civil_unrest' | 'armed_clash' | 'demonstration' | 'other';

interface ProcessedEvent {
    title: string;
    description: string;
    event_type: EventType;
    severity: EventSeverity;
    country: string | null;
    admin1: string | null;
    city: string | null;
    latitude: number;
    longitude: number;
    source_url: string[];
    source_name: string[];
    occurred_at: string;
    dedup_hash: string;
}

// Keywords for classification
const KEYWORDS = {
    red: ['war', 'missile', 'airstrike', 'bombing', 'massacre', 'genocide', 'invasion', 'armed conflict', 'casualties', 'dead', 'homicide', 'terrorist attack'],
    yellow: ['protest', 'riot', 'clash', 'unrest', 'demonstration', 'strike', 'police', 'tear gas', 'arrests', 'violence', 'mob'],
    green: ['rally', 'march', 'gathering', 'petition', 'vigil', 'boycott', 'dispute']
};

function calculateSeverity(title: string, description: string): { severity: EventSeverity, type: EventType } {
    const text = (title + ' ' + description).toLowerCase();

    // Check Red
    if (KEYWORDS.red.some(k => text.includes(k))) {
        return { severity: 'red', type: 'conflict' };
    }

    // Check Yellow
    if (KEYWORDS.yellow.some(k => text.includes(k))) {
        return { severity: 'yellow', type: 'civil_unrest' };
    }

    // Default/Green
    return { severity: 'green', type: 'other' };
}

// Simple heuristic to extract a likely location from text (Very basic NLP simulation)
// In production, use a NER library or API like OpenAI
function extractPotentialLocations(text: string): string[] {
    // Mock implementation: scan for Capitalized words that aren't common stopwords?
    // Ideally, we rely on the NewsAPI 'source' or just try to find Countries/Cities.
    // For this MVP, we might rely on the user providing a better extraction or just geocode the Title if it contains "in [Location]".

    const regex = /\b(in|at|near)\s+([A-Z][a-zA-Z\s]+?)(?=\s|$|[.,])/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length > 0) {
        return matches.map(m => m[2].trim()).filter(l => l.length > 2);
    }
    return [];
}

function generateDedupHash(title: string, location: string): string {
    // Simple hash for dedup (should be crypto hash in prod)
    const str = `${title.toLowerCase().slice(0, 20)}-${location.toLowerCase()}`;
    return btoa(str);
}

export async function fetchAndProcessNews(): Promise<ProcessedEvent[]> {
    if (!NEWS_API_KEY) {
        console.warn("No NEWS_API_KEY found.");
        return [];
    }

    const query = "(conflict OR war OR protest OR riot OR unrest OR violence OR attack) AND (casualties OR dead OR police OR army OR military)";
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'ok') {
            console.error("NewsAPI Error:", data.message);
            return [];
        }

        const events: ProcessedEvent[] = [];

        for (const article of data.articles) {
            const { severity, type } = calculateSeverity(article.title, article.description || '');

            // Extract location
            const potentialLocs = extractPotentialLocations(article.title + ' ' + (article.description || ''));
            let location = null;

            // Try to geocode the first potential location found
            if (potentialLocs.length > 0) {
                const locName = potentialLocs[0];
                const geo = await geocodeLocation(locName);
                if (geo) {
                    location = geo;
                }
            }

            if (location) {
                events.push({
                    title: article.title,
                    description: article.description,
                    event_type: type,
                    severity,
                    country: location.address.country || null,
                    admin1: location.address.state || null,
                    city: location.address.city || null,
                    latitude: location.lat,
                    longitude: location.lon,
                    source_url: [article.url],
                    source_name: [article.source.name],
                    occurred_at: article.publishedAt,
                    dedup_hash: generateDedupHash(article.title, location.display_name)
                });
            }
        }

        return events;
    } catch (error) {
        console.error("Error fetching news:", error);
        return [];
    }
}
