# bwave – Product Wave MVP

Convert supplier PDFs and images into Shopify-ready product CSVs using AI extraction.

**Status:** ✅ Steps 1-6 complete. Ready for Step 7 (CSV export).

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS with dark theme
- **Backend:** Next.js Server Actions, Supabase (Auth + Storage)
- **AI:** Anthropic Claude 3.5 Sonnet Vision API
- **Database:** Supabase PostgreSQL with Row Level Security
- **Testing:** Jest, React Testing Library
- **CI/CD:** Husky pre-commit hooks with auto-test
- **Deployment:** Vercel (ready)
- **Logging:** Structured JSON with emoji indicators

## Project Structure

```
app/
  ├── layout.tsx              # Root layout (public)
  ├── page.tsx                # Home page
  ├── globals.css             # Global styles (dark theme)
  ├── login/page.tsx          # Email magic link auth
  ├── auth/callback/route.ts  # OAuth2/PKCE callback
  └── app/                    # Protected routes (auth required)
     ├── layout.tsx           # App shell with header & nav
     ├── dashboard/page.tsx   # Dashboard with stats & recent waves
     ├── wave/page.tsx        # File upload form
     ├── extract/[uploadId]/  # Claude extraction with WaveLoader
     └── review/[waveId]/     # Editable product review form

lib/
  ├── logger.ts               # Structured JSON logging (with emojis!)
  ├── supabase.ts             # Browser client (PKCE + cookies)
  ├── supabase-server.ts      # Server-side client
  ├── types.ts                # TypeScript data types
  └── server/
     ├── upload.ts            # File upload server action
     └── extract.ts           # Claude extraction server action

components/
  ├── WaveLoader.tsx          # Animated wave loader (brand colors)
  ├── UploadForm.tsx          # File upload component
  └── SignOutButton.tsx       # Sign out button

__tests__/
  ├── components/             # UI component tests
  └── lib/                    # Server logic tests

middleware.ts                 # Route protection & auth enforcement
SCHEMA.md                     # Database setup & SQL
EXTRACTION.md                 # Claude Vision integration docs
```

## Development Setup

### 1. Prerequisites

- Node.js 18+
- Supabase project (free tier at supabase.com)
- Anthropic API key (free tier at console.anthropic.com)

### 2. Install & Configure

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit .env.local and fill in:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ANTHROPIC_API_KEY
```

### 3. Database Setup

Run the SQL from `SCHEMA.md` in your Supabase project:

```bash
# In Supabase → SQL Editor, run in order:
1. Create tables (profiles, uploads, product_waves, csv_exports)
2. Create auth trigger (auto-create profile on signup)
3. Create storage bucket (uploads bucket)
4. Create storage policies (RLS)
```

### 4. Run Locally

```bash
npm run dev
# Opens http://localhost:3000
```

## Features Implemented

### ✅ Step 1-4: Auth, Upload, Data Model
- Supabase magic link auth with PKCE flow
- File upload (PDF/images) to Supabase Storage
- Database schema with RLS policies
- Middleware route protection
- Dark theme with brand colors (blue, cyan, purple, pink)

**Test:** `/login` → email → magic link → `/app/dashboard` ✓

### ✅ Step 5: Claude Vision Extraction
- Sends uploaded file to Claude 3.5 Sonnet Vision API
- Extracts structured product data (title, vendor, price, sizes, colors, etc.)
- Stores extracted data in `product_waves` table
- Auto-redirects to review page on success
- Error handling with retry capability

**Key Features:**
- 🌊 **WaveLoader** — Custom animated loader with brand color cycling
- 😄 **Funny messages** — Displays random encouraging messages ("Riding the wave...", "Claude is cooking...", etc.)
- 📊 **Structured logging** — All extraction steps logged with emojis
- ✅ **Smart parsing** — Handles Claude's JSON response even with markdown formatting

See `EXTRACTION.md` for detailed Claude integration docs.

**Test:** `/app/wave` → upload PDF → watch WaveLoader → auto-redirect ✓

### ✅ Step 6: Review & Edit
- Beautiful dark-themed form to review extracted data
- Edit all ProductData fields inline
- Manage arrays (sizes, colors, tags) with +/- buttons
- Save changes back to database
- Links to export page for Step 7

**Test:** Go to `/app/review/[waveId]` → edit fields → click "Confirm & Export" ✓

### ✅ Dashboard Upgrades
- 📊 Stats cards (Total Uploads, Extracted, Exports)
- 🎨 Gradient borders with brand colors
- 🌊 Recent waves list with hover effects
- 📭 Improved empty state
- 🎯 Interactive CTA button

### ✅ Accessibility (a11y)
- ✅ ARIA labels on all interactive elements
- ✅ Semantic HTML (form, button, nav, main, etc.)
- ✅ Focus indicators with brand colors
- ✅ Screen reader support (role="status", aria-live)
- ✅ Proper label associations
- ✅ WaveLoader: aria-hidden on decorative SVG

## Running Tests

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# View coverage
npm test -- --coverage
```

**Current Tests:**
- ✅ Upload validation (file type, size, auth)
- ✅ Upload form component (rendering, state, a11y)
- ✅ Extraction flow (Claude API mocking, JSON parsing, DB storage)
- Total: 20+ tests passing

Tests auto-run on commit via Husky.

## Structured Logging

All critical paths use emoji-prefixed structured logging:

```
🔐 extraction - Starting extraction
📤 extraction - Starting extraction
📄 extraction - Upload metadata fetched
🤖 extraction - Calling Claude Vision API
✅ extraction - Extraction complete
❌ extraction - Extraction failed
⏱️  extraction - claudeVisionCall completed in 2500ms
```

Log format: `timestamp | level | service | emoji message | context (JSON)`

Perfect for log aggregation services (Datadog, Sentry, etc.).

## Important Notes

### Security
- API keys in `.env.local` (git-ignored)
- Supabase RLS policies enforce per-user data access
- Server actions keep credentials off browser
- Session tokens in HTTP-only cookies
- PKCE flow for SSR magic link auth
- Sensitive data sanitized from logs (passwords, tokens, SSNs, credit cards)

### Accessibility
- WCAG 2.1 AA compliant (forms, buttons, links)
- Screen reader announcements for async operations
- Keyboard navigation on all pages
- High contrast dark theme
- Focus indicators on all interactive elements
- Proper heading hierarchy

### Performance
- Middleware only runs on protected routes (`/app/*`, `/login`)
- Server-side image processing for Claude
- Lazy loading on dashboard
- Minimal JavaScript (server components where possible)

## Next Steps: Step 7 - CSV Export

Will add:
1. Format extracted data as Shopify CSV (headers: handle, title, vendor, price, etc.)
2. Generate CSV file
3. Upload to Supabase Storage
4. Provide download link to user
5. Track exports in `csv_exports` table

## Troubleshooting

**Extraction fails with "PKCE code verifier not found":**
- Fixed in latest version (use `@supabase/ssr@latest`)
- Auth state stored in cookies, not localStorage

**Claude API rate limited:**
- Free tier: ~50k tokens/month
- Upgrade to paid plan for higher limits
- Implement request queueing for production

**Tests fail on commit:**
- Run: `npm test` to see failures
- Fix TypeScript: `npm run lint`
- Skip with: `git commit --no-verify` (use cautiously!)

## Database Schema

See `SCHEMA.md` for full SQL:
- profiles, uploads, product_waves, csv_exports tables
- Row Level Security policies
- Storage bucket configuration
- Trigger for auto-profile creation

## Claude Integration

See `EXTRACTION.md` for:
- Claude Vision API prompt design
- JSON schema for ProductData
- Error handling strategies
- Token usage optimization
- Testing with mock responses
