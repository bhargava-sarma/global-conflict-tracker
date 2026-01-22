const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
    console.log("Checking Supabase Events Table...");

    const { data, error, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .order('occurred_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Error fetching events:", error);
        return;
    }

    console.log(`✅ Total Events in DB: ${count}`);
    console.log("Latest 5 Events:");
    data.forEach((e, i) => {
        console.log(`[${i + 1}] ${e.title} (${new Date(e.occurred_at).toISOString()})`);
        console.log(`    Desc: ${e.description.substring(0, 100)}...`);
    });
}

checkEvents();
