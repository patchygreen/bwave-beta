# Code Standards for bwave

This document describes the coding standards, patterns, and best practices for the bwave codebase.

## TypeScript

### Strict Mode
- ✓ All files use strict TypeScript (`strict: true` in tsconfig.json)
- ✓ No implicit `any` types
- ✓ All function parameters and returns have explicit types
- ✓ Unused variables and parameters are errors

### Type Definitions
- ✓ Define types in `lib/types.ts` or alongside usage
- ✓ Export types from `lib/types.ts` for shared types
- ✓ Use descriptive type names: `ProductData`, `AuthError`, not `Data` or `Error`
- ✓ Document complex types with JSDoc

```typescript
// ✓ Good
export type ProductData = {
  title: string
  vendor: string
  price: string
}

// ✗ Bad
export type Data = {
  t: string
  v: string
  p: string
}
```

## Comments

### Header Comments
All files should start with a module-level comment explaining its purpose:

```typescript
/**
 * FILE: app/auth/callback/route.ts
 * PURPOSE: Exchange magic link codes for session tokens
 * CALLER: User clicks email link → redirects here
 * OUTCOME: Sets session cookie → redirects to dashboard
 */
```

### Section Comments
Use clear SECTION HEADERS for logical blocks:

```typescript
// VALIDATION: Check if code exists
if (!code) {
  // Handle missing code
}

// EXCHANGE: Trade code for session token
const { error } = await supabase.auth.exchangeCodeForSession(code)

// ERROR HANDLING: Handle exchange failures
if (error) {
  // Handle error
}
```

### Inline Comments
Use inline comments sparingly—explain the "why", not the "what":

```typescript
// ✗ Bad - just restates code
const email = getEmail() // Get the email

// ✓ Good - explains reasoning
// Normalize email to lowercase for consistent DB lookups
const email = getEmail().toLowerCase()

// ✓ Good - highlights critical behavior
// IMPORTANT: Must set in both locations or session won't persist across requests
cookieStore.set(name, value, options)
response.cookies.set(name, value, options)
```

### Complex Logic
For complex algorithms or non-obvious patterns, provide detailed comments:

```typescript
/**
 * COOKIE PERSISTENCE FLOW:
 * 1. Supabase creates session token
 * 2. Our setAll() handler intercepts it
 * 3. We write to TWO places:
 *    a) cookieStore: Server can read it on next request
 *    b) response.cookies: Browser receives it and stores it
 * 4. On next request: middleware reads from browser cookie
 *
 * If we only write to one place:
 * - Only cookieStore: Browser never gets it (session breaks)
 * - Only response: Server can't read it on next request (middleware fails)
 */
```

## File Organization

### Naming
- ✓ Components: PascalCase (SignOutButton.tsx)
- ✓ Pages: kebab-case folders (app/app/dashboard/page.tsx)
- ✓ Utilities: camelCase (lib/supabase.ts)
- ✓ Types: PascalCase (ProductData, AuthError)
- ✓ Constants: UPPER_SNAKE_CASE (ALLOWED_EMAILS)

### Structure
```
app/
├── page.tsx                    # Public pages
├── login/
├── auth/
│   └── callback/route.ts       # API routes
└── app/                        # Protected routes
    ├── layout.tsx
    ├── dashboard/
    ├── wave/
    ├── extract/[uploadId]/
    └── review/[waveId]/

lib/
├── supabase.ts                 # Browser client
├── supabase-server.ts          # Server client
├── types.ts                    # Data types
└── server/
    └── upload.ts               # Server actions

components/
├── UploadForm.tsx              # Reusable UI components
└── SignOutButton.tsx

__tests__/                       # Jest tests mirror src structure
├── components/
└── lib/

public/
└── logo.svg                    # Static assets
```

## Error Handling

### Server Actions
Always return structured errors from server actions:

```typescript
// ✓ Good
export async function uploadFile(formData: FormData) {
  if (!file) {
    return { error: 'No file provided' }
  }

  try {
    const result = await doSomething()
    return { success: true, data: result }
  } catch (error) {
    console.error('[UPLOAD] Unexpected error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

// ✗ Bad - throws exceptions
export async function uploadFile(formData: FormData) {
  if (!file) throw new Error('No file')
  // Exception crashes component
}
```

### Client Components
Handle async state with React hooks:

```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

try {
  setError(null)
  const result = await serverAction(data)
  if (result.error) {
    setError(result.error)
  } else {
    // Success
  }
} finally {
  setLoading(false)
}
```

## Logging

### Log Levels
- `console.log()` — Never left in production code
- `console.warn()` — Issues that should be investigated
- `console.error()` — Errors that affect functionality

### Format
Use `[MODULE_NAME]` prefix for all logs:

```typescript
// ✓ Good
console.warn('[AUTH] Magic link code expired or invalid')
console.error('[UPLOAD] Storage upload failed:', error.message)

// ✗ Bad
console.log('something happened')
console.error(error) // logs full object
```

## Security

### Environment Variables
- ✓ Never log environment variables
- ✓ Never commit `.env.local`
- ✓ Keep API keys server-side only
- ✓ Public keys can be prefixed with `NEXT_PUBLIC_`

```typescript
// ✓ Safe - server-side only
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ✓ Safe - public key for browser
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✗ Dangerous - logging keys
console.log('Using key:', process.env.SOME_KEY)
```

### Input Validation

**Use Zod schemas at server boundaries.** All user input must be validated before database writes.

```typescript
// lib/validation/schemas.ts — where all schemas live
import { z } from 'zod'

export const ProductDataSchema = z.object({
  title: z.string().min(1).max(255).nullable().optional(),
  description: z.string().max(50000).nullable().optional(),
  // ... all fields with limits
})

export function validateProductDataSafe(data: unknown) {
  try {
    return { success: true, data: ProductDataSchema.parse(data) }
  } catch (error) {
    return { success: false, error: error.issues[0].message }
  }
}
```

**Apply validation in server actions:**
```typescript
// lib/server/review.ts — server action that saves user edits
export async function saveProductWave(waveId: string, data: Partial<ProductData>) {
  const validation = validateProductDataSafe(data)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }
  // Now safe to write to DB
  await supabase.from('product_waves').update({ extracted_data: validation.data })
}
```

**Validation rules:**
- ✓ Validate ALL user input at server boundaries (server actions, API routes)
- ✓ Validate Claude's API responses too (can return unexpected shapes)
- ✓ Use Zod for schema validation (lib/validation/schemas.ts)
- ✓ Return safe error messages to client, log details server-side
- ✓ Set field limits (string max lengths, array max sizes)
- ✓ Never trust client-side validation alone

## Testing

### Test Organization
```typescript
describe('UploadForm', () => {
  describe('Rendering', () => {
    it('renders file input', () => {
      // Test implementation
    })
  })

  describe('User Interaction', () => {
    it('updates UI when file selected', () => {
      // Test implementation
    })
  })
})
```

### Test Naming
- ✓ Describe what happens, not implementation
- ✓ Use "it" prefix: "it renders the form"
- ✓ Don't test implementation details

```typescript
// ✓ Good - describes behavior
it('disables button when no file selected', () => {})

// ✗ Bad - tests implementation
it('checks if fileName state is null', () => {})
```

## Accessibility

### Color Usage
- ✓ Don't use color alone to convey information
- ✓ Combine with icons, text, or other signals
- ✓ Check contrast ratios (4.5:1 minimum for text)

### ARIA
- ✓ All form inputs have `<label>` or `aria-label`
- ✓ Error messages have `role="alert"`
- ✓ Loading states have `aria-busy`
- ✓ Help text linked with `aria-describedby`

```typescript
// ✓ Good - complete accessibility
<label htmlFor="email">Email</label>
<input
  id="email"
  aria-required="true"
  aria-describedby="email-help"
  className="focus:ring-bwave-blue"
/>
<p id="email-help">We'll send a magic link to this address</p>
{error && <div role="alert">{error}</div>}

// ✗ Bad - missing accessibility
<input placeholder="Email" />
<div>{error}</div>
```

## Performance

### Code Splitting
- ✓ Use dynamic imports for large components
- ✓ Lazy load modals and dialogs
- ✓ Split routes at folder boundaries (Next.js does automatically)

### Caching
- ✓ Use `revalidatePath()` after mutations
- ✓ Cache static assets with proper headers (Vercel does this)
- ✓ Don't cache user-specific data

## Dependencies

### When to Add
- ✓ Clear, maintained projects
- ✓ Minimal size impact
- ✓ Solves a real problem
- ✗ "Nice to have" features
- ✗ Duplicate functionality

### Current Dependencies
- `next`: ^16.2.3 (framework, App Router, Server Actions)
- `react`: ^18.3.1 (UI)
- `@supabase/supabase-js`: ^2.39.0 (database + auth)
- `@supabase/ssr`: ^0.10.2 (server-side auth)
- `@anthropic-ai/sdk`: ^0.24.0 (Claude Vision API)
- `@sentry/nextjs`: ^10.48.0 (error tracking + session replay)
- `zod`: ^4.3.6 (schema validation)
- `tailwindcss`: ^3.4.1 (styling)

## Before Committing

### Checklist
- [ ] Run tests: `npm test`
- [ ] No console.logs left (except `console.error` and `console.warn`)
- [ ] Comments explain the "why"
- [ ] No hardcoded values (use constants)
- [ ] TypeScript has no errors
- [ ] Accessibility features in place
- [ ] Error handling complete

---

## Questions?

If you're unsure about any pattern, check:
1. **Similar files** in the codebase
2. **This document**
3. **Code comments** in existing code
4. **Ask in code review**

Code consistency makes everyone's life easier!
