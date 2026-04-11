# bwave – Product Wave

A minimal MVP for converting supplier PDFs/images into Shopify-ready CSVs using AI.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Storage)
- Anthropic Claude API
- Deployed on Vercel

## Project Structure

```
app/
  ├── layout.tsx          # Root layout
  ├── page.tsx            # Home page
  ├── (auth)/             # Protected routes
  │   ├── layout.tsx
  │   ├── dashboard/
  │   ├── wave/           # Product Wave flow
  │   ├── review/         # Review screen
  │   └── settings/
  ├── api/                # API routes
  ├── globals.css
lib/
  ├── supabase.ts         # Supabase client setup
  ├── anthropic.ts        # Claude extraction
  └── utils/
    └── csv.ts            # CSV export
public/                   # Static assets
```

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   ```
   cp .env.local.example .env.local
   ```
   Fill in your Supabase and Anthropic credentials.

3. Create database tables (see SCHEMA.md)

4. Run the dev server:
   ```
   npm run dev
   ```

5. Open http://localhost:3000

## Features (MVP)

- [x] Home page
- [ ] Magic link auth
- [ ] File upload (PDF/image)
- [ ] Claude extraction
- [ ] Review & edit
- [ ] Shopify CSV export

## Database Schema

See `SCHEMA.md` for the Supabase SQL setup.
