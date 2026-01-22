const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const key = process.env.GEMINI_API_KEY;

if (!key) {
    console.error("No GEMINI_API_KEY found.");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("Error listing models:", json.error);
            } else {
                console.log("Writing models to available_models.txt...");
                const fs = require('fs');
                const modelNames = json.models
                    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name)
                    .join('\n');
                fs.writeFileSync('available_models.txt', modelNames);
                console.log("Done.");
            }
        } catch (e) {
            console.error("Failed to parse response:", e);
            console.log("Raw response:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
