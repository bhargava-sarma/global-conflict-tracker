import { Database } from './supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export async function fetchFromGemini(): Promise<ProcessedEvent[]> {
    if (!GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY is missing.");
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
        
        Identify **TARGET 25** conflicts or geopolitical events.
        
        CRITICAL DISTRIBUTION GOAL (Aim for this balance, but prioritize TRUTH):
        - **RED Events (War/Conflict)**: Target ~12. Active Fighting, High Casualties, Coups.
        - **YELLOW Events (Tension/Unrest)**: Target ~8. Protests, Border Standoffs, Diplomatic Warnings.
        - **GREEN Events (Diplomacy/Peace)**: Target ~5. Ceasefire talks, Treaties, Aid deals.
        
        CRITICAL FILTERING CRITERIA:
        - **TIMEFRAME**: Events must be **EXTREMELY RECENT** (Last 30 Days). **DO NOT** include older events unless they just had a MAJOR new development yesterday/today.
        - **HALLUCINATION CHECK**: Do **NOT** invent events to fill the quota. If there are only 5 real RED events, return 5. Do not make up fake wars.
        - **DATE FORMAT**: You **MUST** provide the exact date (e.g., "Jan 12"). "Oct 2025" or "Late January" is UNACCEPTABLE.
        - **SOURCES**: Do NOT generate specific URLs. I will handle that.
        
        CRITICAL INSTRUCTIONS:
        1. **NO FUTURE DATES**: All events must have happened BEFORE ${currentDate}.
        2. **REAL NEWS ONLY**: Verify that the event actually happened. Better to return FEWER events that are TRUE than MANY that are FALSE.
        3. **FORMAT**:
           Return a STRICT JSON array of objects.
           Each object MUST have the following structure:
           {
             "title": "Headline (Specific & Accurate)",
             "description": "STRICTLY CHRONOLOGICAL BULLET POINTS of recent developments.",
             "type": "conflict", // or protest, civil_unrest, armed_clash, other
             "severity": "red", // or yellow, green.
             "country": "Country Name",
             "region": "Region/State",
             "city": "City",
             "latitude": 0.0, // DECIMAL COORDINATES REQUIRED
             "longitude": 0.0, // DECIMAL COORDINATES REQUIRED
             "latest_date": "YYYY-MM-DD" // EXACT DATE of the most recent development
           }

        4. **DESCRIPTION FORMATTING RULES**:
           - Start with the MOST RECENT update.
           - **MANDATORY**: Each bullet point **MUST** start with a specific date.
           - Format: "• [May DD]: [Specific Action]" (e.g., "• Jan 18: Airstrike hits...")
           - **BAD FORMAT**: "• Recent: Fighting continued" (REJECT THIS).
        
        Output stricly valid JSON array only. No conversational text.
        `;

        const maxRetries = 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }],
                        generationConfig: {
                            response_mime_type: "application/json",
                            temperature: 0.1
                        }
                    })
                });

                if (response.status === 429) {
                    const errorText = await response.text();
                    console.warn(`[Rate Limit] 429 encountered for batch [${regionFocus}] (Attempt ${attempt + 1}/${maxRetries + 1})`);

                    const match = errorText.match(/retry in (\d+(\.\d+)?)s/);
                    let waitSeconds = 20;
                    if (match && match[1]) {
                        waitSeconds = Math.ceil(parseFloat(match[1])) + 2;
                    }

                    console.log(`[Rate Limit] Waiting ${waitSeconds} seconds before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                    continue;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Gemini API Error for batch [${regionFocus}]:`, errorText);
                    return [];
                }

                const data = await response.json();

                let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!content) {
                    console.error(`No content returned from Gemini for batch [${regionFocus}]`);
                    return [];
                }

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
                        if (normalized.includes('war')) return 'conflict';
                        if (normalized.includes('fight')) return 'armed_clash';
                        if (normalized.includes('riot')) return 'civil_unrest';
                        return 'other';
                    };

                    return rawEvents.map((e: any) => {
                        // Generate a Google Search URL for truth verification
                        const query = encodeURIComponent(`${e.title} ${e.country} news ${new Date().getFullYear()}`);
                        const googleSearchUrl = `https://www.google.com/search?q=${query}&tbm=nws`;

                        return {
                            title: e.title,
                            description: e.description,
                            event_type: validateEventType(e.type),
                            severity: e.severity || 'yellow',
                            country: e.country,
                            admin1: e.region,
                            city: e.city,
                            latitude: e.latitude || 0,
                            longitude: e.longitude || 0,
                            source_url: [googleSearchUrl], // Guaranteed to work
                            source_name: ['Google News Search'],
                            occurred_at: e.latest_date ? new Date(e.latest_date).toISOString() : new Date().toISOString(),
                            dedup_hash: generateDedupHash(e.title, e.country)
                        };
                    }).filter((e: any) => e.latitude !== 0 && e.longitude !== 0);

                } catch (e) {
                    console.error(`Failed to parse batch [${regionFocus}]:`, e);
                    return [];
                }
            } catch (error) {
                console.error(`Error batch [${regionFocus}]:`, error);
                return [];
            }
        }
        console.error(`Failed to fetch batch [${regionFocus}] after multiple retries.`);
        return [];
    };

    console.log("Starting Sequential Batch Fetch (4 regions) to avoid Rate Limits...");

    const results: ProcessedEvent[][] = [];

    // Helper sleep function
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const region of batches) {
        console.log(`Fetching batch: ${region.slice(0, 20)}...`);
        const batchResults = await fetchBatch(region);
        results.push(batchResults);

        // Reduced wait time to 5 seconds (Flash Lite allows higher throughput)
        await sleep(5000);
    }

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
