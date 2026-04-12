# New Engineer Onboarding Guide

Welcome to bwave! This guide will help you get up to speed with our codebase, standards, and development practices.

## Quick Start (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.local.example .env.local
   # Fill in your Supabase credentials
   ```

3. **Run locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Documentation (Read These First)

### Essential Reading
1. **[README.md](./README.md)** — Project overview, tech stack, current progress
2. **[SCHEMA.md](./SCHEMA.md)** — Database setup and SQL tables
3. **[CODE_STANDARDS.md](./CODE_STANDARDS.md)** — Coding conventions and patterns
4. **[ACCESSIBILITY.md](./ACCESSIBILITY.md)** — Accessibility standards and testing

### Reference Docs
- [CLAUDE.md](./CLAUDE.md) — If it exists, contains project configuration
- [.env.local.example](./.env.local.example) — Required environment variables

## Project Structure

```
app/                          # Next.js App Router pages
├── page.tsx                   # Home page (public)
├── login/page.tsx             # Login form (public)
├── auth/callback/route.ts     # Magic link callback
└── app/                       # Protected routes (require auth)
    ├── dashboard/             # Dashboard home
    ├── wave/                  # File upload page
    ├── extract/[uploadId]/    # AI extraction (Step 5)
    └── review/[waveId]/       # Review & edit (Step 6)

lib/
├── supabase.ts                # Browser client for auth
├── supabase-server.ts         # Server client for database
├── types.ts                   # TypeScript type definitions
└── server/
    └── upload.ts              # File upload server action

components/
├── UploadForm.tsx             # Reusable form component
└── SignOutButton.tsx          # Logout button

__tests__/                      # Jest test files
├── components/
└── lib/

public/
└── logo.svg                   # bwave logo

middleware.ts                  # Route protection
tailwind.config.ts            # Brand colors
tsconfig.json                 # TypeScript config
```

## Key Concepts

### Authentication Flow
1. User enters email at `/login`
2. Client checks email against whitelist (ALLOWED_EMAILS)
3. Supabase sends magic link to email
4. User clicks link → redirects to `/auth/callback?code=XXX`
5. Server exchanges code for session token
6. Session cookie sent to browser and stored in database
7. Middleware checks cookie, allows access to `/app/*`

### Email Whitelist
Currently only these emails can access:
- `patrick.crean@zalando.ie`
- `patrick@b-wave.io`
- `catherine@b-wave.io`

To add more, edit [app/login/page.tsx](./app/login/page.tsx#L7-L11).

### Upload Flow
1. User uploads PDF or image at `/app/wave`
2. File validated server-side (type, size)
3. File uploaded to Supabase Storage under `uploads/<user-id>/<filename>`
4. Upload record saved to database
5. Redirect to `/app/extract/<uploadId>` (extraction loading)
6. Step 5 will handle Claude extraction

### Dark Mode Design
- Background: Pure black (#000000)
- Text: Pure white (#FFFFFF)
- Contrast ratio: 21:1 (exceeds WCAG AAA standards)
- Brand colors: Blue (#2892D7), Cyan (#28E2CF), Purple (#826AED), Pink (#F87AA0)

## Common Tasks

### Run Tests
```bash
npm test              # Run all tests once
npm run test:watch   # Watch mode for development
```

Tests automatically run on every commit via Husky pre-commit hook.

### Add a New Page
1. Create file: `app/app/new-page/page.tsx` (for protected page)
2. Add semantic HTML: `<main>`, `<section>`, etc.
3. Use `aria-label` on interactive elements
4. Test with keyboard navigation
5. Write tests in `__tests__/`

### Add a Form Input
```typescript
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-describedby="email-help"
  className="focus:ring-2 focus:ring-bwave-blue"
/>
<p id="email-help" className="text-sm text-slate-400">
  Help text goes here
</p>
{error && <div role="alert">{error}</div>}
```

### Use Brand Colors
```typescript
// In className:
className="bg-bwave-blue text-white hover:bg-bwave-cyan"

// Available colors in tailwind.config.ts:
// - bwave-navy: #151719
// - bwave-blue: #2892D7
// - bwave-cyan: #28E2CF
// - bwave-purple: #826AED
// - bwave-pink: #F87AA0
```

### Log Errors (Properly)
```typescript
// ✓ Good - includes context
console.error('[MODULE_NAME] Description of error:', error.message)

// ✗ Bad - no context
console.log('error:', error)

// ✗ Never do this
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)
```

## Before Committing

**Pre-commit Checklist:**
- [ ] `npm test` passes
- [ ] No TypeScript errors
- [ ] No `console.log()` left (only errors/warnings)
- [ ] Comments explain the "why"
- [ ] Keyboard navigation works
- [ ] Focus rings visible
- [ ] Dark mode colors look good
- [ ] ARIA labels present on interactive elements

**Husky will automatically run:**
- Tests via Jest
- Linting via TypeScript

Commit is blocked if tests fail. Fix the issue and commit again.

## Debugging

### Server Logs
Watch terminal where you run `npm run dev`:
```
[AUTH] Magic link code expired or invalid
[UPLOAD] Storage upload failed: Bucket not found
```

### Browser Console
Open DevTools (F12) → Console tab:
- Check for errors
- Check for unhandled promise rejections
- Check network requests

### Network Tab
DevTools → Network tab to see API requests:
- `/auth/callback?code=...` — Auth callback
- API calls to Supabase

### Testing Accessibility
**Keyboard Navigation:**
- Tab through page (forward)
- Shift+Tab (backward)
- Enter on buttons
- Space on checkboxes/radio

**Screen Reader (macOS):**
- ⌘ + F5 to enable VoiceOver
- Use VO (control+option) + arrow keys

**Color Contrast:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- All colors must be 4.5:1 minimum for text

## Architecture Decisions

### Why Server Actions?
Server actions keep API keys off the browser and validate on the server (secure).

### Why Magic Links?
Passwordless auth is better UX and more secure than passwords.

### Why Dark Mode?
The brand colors (#2892D7, #28E2CF) look premium on dark backgrounds.

### Why Supabase?
Built-in auth, database, storage, and real-time updates. Perfect for MVP.

### Why Tailwind?
Fast development, consistent design, accessibility-first utilities.

## Getting Help

1. **Check existing docs** — Search README, CODE_STANDARDS, ACCESSIBILITY
2. **Look at similar code** — Find a component that does something similar
3. **Read comments** — Critical functions have detailed comments
4. **Run tests** — Our test suite demonstrates how things should work
5. **Ask questions** — Better to ask than guess

## Next Steps

1. ✅ Read [CODE_STANDARDS.md](./CODE_STANDARDS.md)
2. ✅ Read [ACCESSIBILITY.md](./ACCESSIBILITY.md)
3. ✅ Run `npm test` to see tests pass
4. ✅ Run `npm run dev` and explore pages
5. ✅ Test with keyboard navigation
6. 👉 Pick a task from the [README.md](./README.md) "Next Steps" section

## Project Roadmap

### ✅ Completed (Steps 1-4)
- Home page with branding
- Magic link authentication
- Protected app routes
- File upload (PDF/image)
- Dark mode UI with brand colors
- Accessibility standards
- 18 passing tests
- Code standards documentation

### 🔄 In Progress (Step 5)
- Claude API extraction
- Product data JSON parsing
- Review page for editing

### 📅 Upcoming (Steps 6-7)
- Review & edit flow
- Shopify CSV export
- Download functionality

### 🚀 Future Features
- Multi-product waves
- History & exports
- Shopify direct sync (later)
- Team collaboration (later)

## Questions?

If something is unclear:
1. Check [CODE_STANDARDS.md](./CODE_STANDARDS.md) for patterns
2. Check [ACCESSIBILITY.md](./ACCESSIBILITY.md) for a11y
3. Look at similar code in the repo
4. Read the comments in the relevant file
5. Ask a team member

Welcome aboard! 🎉
