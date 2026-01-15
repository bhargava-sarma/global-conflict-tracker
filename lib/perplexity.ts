import { Database } from './supabase';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export type EventSeverity = 'red' | 'yellow' | 'green';
export type EventType = 'conflict' | 'protest' | 'civil_unrest' | 'armed_clash' | 'demonstration' | 'other';

export interface ProcessedEvent {
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

function generateDedupHash(title: string, country: string | null): string {
    const loc = country || 'unknown';
    const str = `${title.toLowerCase().slice(0, 20)}-${loc.toLowerCase()}`;
    return Buffer.from(str, 'utf-8').toString('base64');
}

export async function fetchFromPerplexity(): Promise<ProcessedEvent[]> {
    if (!PERPLEXITY_API_KEY) {
        console.error("❌ PERPLEXITY_API_KEY is missing.");
        return [];
    }

    const currentDate = new Date().toDateString();

    // Define 4 distinct batches to ensure global coverage and avoid token limits
    const batches = [
        "Middle East & North Africa (Israel-Palestine, Syria, Yemen, Sudan, Iran, etc)",
        "Europe & Russia-Ukraine (Ukraine War, Balkans, internal European protests)",
        "Asia & Pacific (Myanmar, Pakistan, India, China, South China Sea, Koreas)",
        "Americas & Sub-Saharan Africa (Mexico, Haiti, Venezuela, DRC, Nigeria, Sahel)"
    ];

    const fetchBatch = async (regionFocus: string): Promise<ProcessedEvent[]> => {
        const prompt = `
        You are a Global Conflict Intelligence Analyst.
        Current Date: ${currentDate}.
        
        Focus Region: **${regionFocus}**.
        
        Identify **EXACTLY 25** MAJOR, GLOBALLY SIGNIFICANT conflicts or geopolitical events.
        
        CRITICAL FILTERING CRITERIA:
        - **TIMEFRAME**: Events must be **ONGOING** or have significant developments within the **LAST 3 MONTHS**. Do NOT include stale events from over 3 months ago unless they just flared up again.
        - **INCLUDE**: 
          - Active Wars & Military Offensives.
          - Major Coups & rebellions.
          - **Significant Geopolitical Tensions & Diplomatic Crises** (e.g., Territorial disputes like Greenland/US, South China Sea, Essequibo).
          - Large-scale nationwide protests threatening stability.
        - **EXCLUDE**: Small local skirmishes, low-level crime, minor political disagreements, or events only relevant to a single town/village.
        
        CRITICAL INSTRUCTIONS:
        1. **NO FUTURE DATES**: All events must have happened BEFORE ${currentDate}.
        2. **STRICT COUNT**: You must provide exactly 25 items.
        3. **FORMAT**:
           Return a STRICT JSON array of objects.
           Each object MUST have the following structure:
           {
             "title": "Headline (Short & Impactful)",
             "description": "STRICTLY CHRONOLOGICAL BULLET POINTS of recent developments. Include Date and Time if known.",
             "type": "conflict", // or protest, civil_unrest, armed_clash, other (for diplomatic/geopolitical)
             "severity": "red", // or yellow, green. RED = Active War/High Casualties. YELLOW = Unrest/Tension/Diplomatic Crisis.
             "country": "Country Name",
             "region": "Region/State",
             "city": "City",
             "latitude": 0.0, // DECIMAL COORDINATES REQUIRED
             "longitude": 0.0, // DECIMAL COORDINATES REQUIRED
             "sources": ["url1", "url2"]
           }

        4. **DESCRIPTION FORMATTING RULES**:
           - MUST be a string containing bullet points.
           - Start with the MOST RECENT update at the top.
           - Format: "• [Date] [Time]: [Specific Action/Development]"
           - Example:
             "• Jan 14, 15:00: President announces severance of diplomatic ties.\n• Jan 13, 09:30: Military mobilized to border region."
           - Do NOT provide a vague summary. Give specific tactical or diplomatic updates.
        
        Output stricly valid JSON array only. No conversational text.
        `;

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar-pro',
                    messages: [
                        { role: 'system', content: 'You are a helpful AI assistant that outputs strict JSON. Do not say "Here is the JSON" or anything else. Just the JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) return [];

            const data = await response.json();
            let content = data.choices[0].message.content;

            // Clean up content to find JSON array
            const firstBracket = content.indexOf('[');
            const lastBracket = content.lastIndexOf(']');

            if (firstBracket !== -1 && lastBracket !== -1) {
                content = content.substring(firstBracket, lastBracket + 1);
            }

            try {
                const rawEvents = JSON.parse(content);

                const allowedTypes = ['conflict', 'protest', 'civil_unrest', 'armed_clash', 'demonstration', 'other'];
                const validateEventType = (type: string): EventType => {
                    const normalized = (type || 'conflict').toLowerCase().replace(/\s+/g, '_');
                    if (allowedTypes.includes(normalized)) return normalized as EventType;
                    // Map common mismatches
                    if (normalized.includes('war')) return 'conflict';
                    if (normalized.includes('fight')) return 'armed_clash';
                    if (normalized.includes('riot')) return 'civil_unrest';
                    return 'other';
                };

                // Basic validation map
                return rawEvents.map((e: any) => ({
                    title: e.title,
                    description: e.description,
                    event_type: validateEventType(e.type),
                    severity: e.severity || 'yellow',
                    country: e.country,
                    admin1: e.region,
                    city: e.city,
                    latitude: e.latitude || 0, // Fallback to avoid null errors, though prompt should catch it
                    longitude: e.longitude || 0,
                    source_url: e.sources || [],
                    source_name: ['Perplexity Search'],
                    occurred_at: new Date().toISOString(),
                    dedup_hash: generateDedupHash(e.title, e.country)
                })).filter((e: any) => e.latitude !== 0 && e.longitude !== 0); // basic filter for bad geocoding

            } catch (e) {
                console.error(`Failed to parse batch [${regionFocus}]:`, e);
                return [];
            }
        } catch (error) {
            console.error(`Error batch [${regionFocus}]:`, error);
            return [];
        }
    };

    console.log("Starting Parallel Batch Fetch (4 regions)...");

    // meaningful parallelism
    const results = await Promise.all(batches.map(region => fetchBatch(region)));

    // Flatten results
    const allEvents = results.flat();

    // Deduplicate by hash
    const uniqueEventsMap = new Map();
    allEvents.forEach(e => {
        if (!uniqueEventsMap.has(e.dedup_hash)) {
            uniqueEventsMap.set(e.dedup_hash, e);
        }
    });

    const uniqueEvents = Array.from(uniqueEventsMap.values());

    console.log(`Examples of descriptions:`);
    if (uniqueEvents.length > 0) console.log(uniqueEvents[0].description);

    return uniqueEvents;
}
