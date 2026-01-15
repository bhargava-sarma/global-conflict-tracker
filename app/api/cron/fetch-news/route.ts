import { NextResponse } from 'next/server';
import { fetchFromPerplexity } from '@/lib/perplexity';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: Request) {
    try {
        // Ensure Admin Client is available
        if (!supabaseAdmin) {
            console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY for admin access.");
            return NextResponse.json({ success: false, error: "Server misconfigured: Missing Service Key" }, { status: 500 });
        }

        console.log("Starting Perplexity News Fetch...");
        const events = await fetchFromPerplexity();

        if (events.length === 0) {
            return NextResponse.json({ success: true, message: 'No events found or API issue', count: 0 });
        }

        console.log("DEBUG: First Event Description:", events[0]?.description); // Verify format

        console.log(`Found ${events.length} events. Purging old data & Inserting new...`);

        // 1. Purge existing data to ensure we don't have stale/duplicate non-updating events
        // This forces the map to show ONLY the latest 100 events with the new format
        const { error: deleteError } = await supabaseAdmin
            .from('events')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (id is never all zeros)

        if (deleteError) {
            console.error("Failed to purge old events:", deleteError);
        }

        // 2. Insert into Supabase using Admin client
        const { error } = await supabaseAdmin
            .from('events')
            .insert(events as any); // Use INSERT since we cleared the table

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Intelligence processed successfully',
            processed: events.length
        });

    } catch (error: any) {
        console.error('Cron Job Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
