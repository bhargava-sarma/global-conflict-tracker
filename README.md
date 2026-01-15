# Global Conflict & Event Tracker

A real-time web application that monitors global news for conflicts, protests, and significant events, visualizing them on an interactive 3D-style map.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4 (Dark Mode & Glassmorphism)
- **Map**: Leaflet.js with React-Leaflet
- **Database**: Supabase (PostgreSQL)
- **News API**: NewsAPI.org (or compatible)

## Getting Started

1. **Clone & Install**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Create a project on [Supabase](https://supabase.com).
   - Go to the SQL Editor and run the contents of [`supabase_schema.sql`](./supabase_schema.sql).

3. **Environment Variables**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEWS_API_KEY=your_news_api_key
   # Optional: CRON_SECRET=custom_secret_for_protection
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## Deployment (Vercel)

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Add the Environment Variables in Vercel settings.
4. **Cron Job**: Vercel automatically detects `vercel.json` for crons, or you can use a service like EasyCron to hit `https://your-domain.com/api/cron/fetch-news`.

## Features
- **Hourly Monitoring**: Fetches news and extracts events.
- **Severity Classification**: AI-based keywords assign Red/Yellow/Green status.
- **Interactive Map**: Pulsing markers and glassmorphic details.
