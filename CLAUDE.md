# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**bwave** converts supplier PDFs and images into Shopify-ready product CSVs using Claude Vision API.

Core flow: Upload file → Claude extracts product data → User reviews/edits → Export Shopify CSV

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm test             # Run all tests (37 tests)
npm run test:watch   # Watch mode
npm test -- --testPathPattern="extract"  # Run a single test file
npm run lint         # ESLint
npm run build        # validate-env then next build
```

Tests auto-run on commit via Husky lint-staged (only `__tests__/**/*.test.{ts,tsx}`).

## Architecture

### Route structure

```
/                         → Public landing page
/login                    → Magic link auth (Supabase PKCE)
/auth/callback            → PKCE token exchange
/app/dashboard            → Stats + recent waves (protected)
/app/wave                 → File upload form
/app/extract/[uploadId]   → Triggers Claude extraction, shows WaveLoader, auto-redirects
/app/review/[waveId]      → Editable ProductData form (Embla carousel for multi-product)
/app/export/[waveId]      → CSV download
```

All `/app/*` routes are protected by `middleware.ts`. Auth state lives in HTTP-only cookies (Supabase SSR handles refresh on every request).

### Data model (`lib/types.ts`)

```
Upload → ProductWave (has extracted_data: ProductData) → CsvExport
```

- `ProductData` is the central type — what Claude extracts, what the user edits, what gets exported to CSV
- `quantities?: Record<string, number>` on `ProductData` tracks per-size inventory

### Server actions (`lib/server/`)

All mutations are Next.js Server Actions — no API routes for data operations. Each action:
1. Authenticates via `supabase-server.ts`
2. Validates input with Zod schemas (`lib/validation/schemas.ts`)
3. Returns `{ success: true, data }` or `{ error: string }` — never throws

### Claude extraction flow (`lib/server/extract.ts`)

1. Rate-limit check (10 extractions/hr per user, in-memory)
2. Fetch upload from Supabase Storage — PDFs via signed URL (`document` block), images via base64 (`image` block)
3. Call `claude-sonnet-4-6` with structured prompt requesting JSON-only output
4. Strip markdown fences if Claude wraps response in ` ```json ` blocks
5. Validate response with Zod — refund rate limit if extraction is empty
6. Insert into `product_waves` table, return `waveId`

### Supabase clients

- `lib/supabase.ts` — browser client (React components)
- `lib/supabase-server.ts` — server client (Server Actions, route handlers, middleware)

Use the server client everywhere outside of client components. RLS policies enforce per-user data access at the DB level.

### Logging (`lib/logger.ts`)

Use `logger.info/warn/error/debug` with emoji prefixes and a `[MODULE]` service name. Format: structured JSON with `{ timestamp, level, service, message, context }`. No `console.log` in production code.

## Key conventions

- **Types**: All shared types in `lib/types.ts`. Strict TypeScript — no implicit `any`.
- **File headers**: Every file starts with a JSDoc comment: `FILE:`, `PURPOSE:`, `CALLER:`, `OUTCOME:`.
- **Comments**: Section headers (`// VALIDATION:`, `// EXCHANGE:`) for logical blocks. Inline comments explain *why*, not *what*.
- **Errors**: Server actions return structured `{ error: string }`, never throw. Client components handle `result.error` with `useState`.
- **Validation**: All user input and Claude responses validated with Zod at server boundaries.
- **Naming**: Components PascalCase, pages kebab-case folders, utilities camelCase, constants UPPER_SNAKE_CASE.

## Testing patterns

Tests live in `__tests__/` mirroring source structure. Mock Supabase and Anthropic SDK at module level — see `__tests__/lib/extract.test.ts` for the Claude mock pattern. Test names use `it('does X', ...)` describing behavior, not implementation.
