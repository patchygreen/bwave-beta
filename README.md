# bwave – Product Wave MVP

Convert supplier PDFs and images into Shopify-ready product CSVs using AI extraction.

**Status:** Steps 1-4 complete. Building Step 5 (Claude extraction).

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions, Supabase (Auth + Storage)
- **AI:** Anthropic Claude 3 API
- **Database:** Supabase PostgreSQL with Row Level Security
- **Testing:** Jest, React Testing Library
- **CI/CD:** Husky pre-commit hooks
- **Deployment:** Vercel (ready)

## Project Structure

```
app/
  ├── layout.tsx              # Root layout with globals
  ├── page.tsx                # Home page (public)
  ├── login/                  # Email magic link auth
  ├── auth/callback/          # OAuth2 callback handler
  └── app/                    # Protected routes (auth required)
     ├── layout.tsx           # App shell with header
     ├── dashboard/           # Dashboard with recent waves
     ├── wave/                # File upload form
     ├── extract/[uploadId]/  # AI extraction (in progress)
     ├── review/[waveId]/     # Edit & review (not started)
     └── api/                 # Server endpoints (not started)

lib/
  ├── supabase.ts             # Browser client setup
  ├── supabase-server.ts      # Server-side client setup
  ├── types.ts                # TypeScript data types
  └── server/
     └── upload.ts            # File upload server action

components/
  ├── UploadForm.tsx          # File upload component
  └── SignOutButton.tsx       # Sign out button

__tests__/
  ├── components/             # UI component tests
  └── lib/                    # Server logic tests

middleware.ts                 # Route protection & auth enforcement
.husky/pre-commit            # Auto-run tests on commit
```

## Development Setup

### 1. Prerequisites

- Node.js 18+
- Supabase project (free tier at supabase.com)
- Anthropic API key (for Step 5)

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
# - ANTHROPIC_API_KEY (for later steps)
```

### 3. Database Setup

Run the SQL from `SCHEMA.md` in your Supabase project:

```bash
# In Supabase → SQL Editor, run these in order:
1. Create tables (profiles, uploads, product_waves, csv_exports)
2. Create auth trigger (auto-create profile on signup)
3. Create storage bucket (uploads bucket)
4. Create storage policies (RLS for storage)
```

### 4. Run Locally

```bash
npm run dev
# Opens http://localhost:3000
```

## Features Implemented

### ✅ Step 1: Scaffold (Commit 8a4cb05)
- Next.js 14+ setup with TypeScript
- Tailwind CSS + clean minimal styling
- Environment variables configured
- Git initialized

### ✅ Step 2: Auth with Magic Links (Commit 5891cea)
- Supabase magic link authentication
- Session persistence via cookies
- Protected `/app/*` routes via middleware
- Auto-profile creation on signup (trigger)
- Sign-out button

**Test:** Visit `/login`, enter email, click magic link in email → redirects to dashboard ✓

### ✅ Step 3: Data Model (Commit 8bdd917)
- TypeScript types defined (Profile, Upload, ProductWave, CsvExport, ProductData)
- Supabase tables created with RLS policies
- Storage bucket with user folder isolation
- See `lib/types.ts` and `SCHEMA.md`

### ✅ Step 4: Upload Flow (Commit 44208ec)
- File upload form at `/app/wave`
- PDF and image support (validated server-side)
- Files stored in Supabase Storage by user ID
- Upload metadata saved to database
- Error handling with user feedback
- Accessibility support (ARIA labels, alerts)

**Test:** Log in → Go to `/app/wave` → Select PDF → Click Continue → Redirects to extract page ✓

### ✅ Comments & Documentation (Commit 7566b14)
- Professional-level inline comments (see auth/callback, middleware, upload.ts)
- Comprehensive test suite (18 tests passing)
- Pre-commit hooks with Husky (auto-run tests on commit)
- Test guide at `__tests__/README.md`

## Running Tests

```bash
# Run tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# View coverage
npm test -- --coverage
```

**Current Coverage:**
- ✅ UploadForm component: 8 tests (rendering, state, a11y)
- ✅ Upload server action: 10 tests (validation, sizing, auth)
- ✅ Total: 18 tests passing

Tests auto-run on commit via Husky. Commit blocks if tests fail.

## Next Steps: Step 5 - Claude Extraction

Will add:
1. API route to send file content to Claude
2. Extract product data as structured JSON
3. Save extracted data to `product_waves` table
4. Auto-redirect to review page
5. Error handling for extraction failures

**Timeline:** In progress

## Important Notes

### Security
- All API keys stored in `.env.local` (git-ignored)
- Supabase RLS policies enforce row-level access control
- Server actions keep credentials off browser
- Session tokens stored in HTTP-only cookies

### Accessibility
- All components built with ARIA labels and semantic HTML
- Focus indicators on all interactive elements
- Error messages announced to screen readers
- Form labels properly associated with inputs

### Performance
- Middleware only runs on protected routes (`/app/*`, `/login`)
- Next.js revalidates cache on upload (fresh data immediately)
- Cookies are HTTP-only (can't be stolen by JavaScript)

## Troubleshooting

**Auth always redirects to login:**
- Check profile exists in Supabase
- Verify trigger ran (see SCHEMA.md)
- Check .env.local has correct Supabase credentials

**Upload fails with storage error:**
- Verify 'uploads' bucket exists in Supabase Storage
- Check storage policies are created (RLS)
- Ensure you're logged in (valid session)

**Tests fail on commit:**
- Fix TypeScript errors: `npm run lint`
- Run tests: `npm test`
- Commit bypasses (use `git commit --no-verify` only if necessary)

## Database Schema

See `SCHEMA.md` for:
- Full SQL table definitions
- Row Level Security policies
- Storage bucket configuration
- Trigger setup for auto-profile creation
