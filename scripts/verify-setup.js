const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    console.log("--- Starting Setup Verification ---");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    console.log("1. Checking Environment Variables...");
    if (!url || url.includes('your-project')) {
        console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing or default.");
    } else {
        console.log("✅ NEXT_PUBLIC_SUPABASE_URL is set.");
    }

    if (!key || key.includes('your-anon-key')) {
        console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing/default.");
    } else {
        // Check if it looks like a JWT
        if (key.startsWith('ey')) console.log("✅ NEXT_PUBLIC_SUPABASE_ANON_KEY format looks consistent (JWT).");
        else console.warn("⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a JWT.");
    }

    if (!serviceKey || serviceKey.includes('your-service-role-key')) {
        console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing or default. [REQUIRED for news updates]");
    } else {
        if (serviceKey === key) {
            console.error("❌ SUPABASE_SERVICE_ROLE_KEY matches the ANON KEY! It must be the 'service_role' key (different one).");
        } else {
            console.log("✅ SUPABASE_SERVICE_ROLE_KEY is set (and distinct from Anon key).");
        }
    }

    if (!perplexityKey || perplexityKey.includes('your-perplexity-api-key')) {
        console.warn("⚠️ PERPLEXITY_API_KEY is missing/default.");
    } else {
        console.log("✅ PERPLEXITY_API_KEY is set.");
    }

    if ((!url || url.includes('your-project')) || (!key || key.includes('your-anon-key'))) {
        console.log("\n⚠️ Cannot test Supabase connection due to missing keys.");
        return;
    }

    console.log("\n2. Testing Supabase Connection (Read)...");
    try {
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('events').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("❌ Read connection failed:", error.message);
            if (error.code === '42P01') {
                console.error("   Hint: The table 'events' does not exist. Did you run the SQL script?");
            }
        } else {
            console.log("✅ Successfully connected to Supabase (Read).");
        }
    } catch (err) {
        console.error("❌ Unexpected error:", err.message);
    }

    if (!url || !serviceKey || serviceKey === key) {
        console.log("\n⚠️ Cannot test Admin Write Access due to missing/invalid SERVICE KEY.");
        return;
    }

    console.log("\n3. Testing Admin Write Access (Service Role)...");
    try {
        const supabaseAdmin = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Try to insert a dummy record to verify permissions
        const dummyEvent = {
            title: 'VERIFICATION_TEST_IGNORE',
            latitude: 0,
            longitude: 0,
            dedup_hash: 'verify-test-' + Date.now()
        };

        // Attempt insert
        const { error } = await supabaseAdmin.from('events').insert(dummyEvent).select().single();

        if (error) {
            console.error("❌ Admin Write Failed:", error.message);
            console.error("   Code:", error.code);
            if (error.code === '42501') {
                console.error("   CRITICAL: RLS Policy Violation. This confirms the Key is likely NOT a Service Role key.");
                console.error("   ACTION: Go to Supabase > Settings > API and copy the 'service_role' key (NOT anon).");
            }
        } else {
            console.log("✅ Admin Write Successful! (Service Role Key is working)");
            // Clean up
            await supabaseAdmin.from('events').delete().eq('title', 'VERIFICATION_TEST_IGNORE');
        }

    } catch (err) {
        console.error("❌ Unexpected error with Admin Client:", err.message);
    }

    console.log("\n--- Verification Complete ---");
}

verify();
