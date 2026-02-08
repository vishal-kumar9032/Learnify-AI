require('dotenv').config();
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI API key missing. Set VITE_GEMINI_API_KEY in .env or environment.');
    process.exit(1);
}
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const json = await response.json();

        if (json.models) {
            console.log("--- START MODELS ---");
            json.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(m.name);
                }
            });
            console.log("--- END MODELS ---");
        } else {
            console.log("Error:", JSON.stringify(json, null, 2));
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

listModels();
