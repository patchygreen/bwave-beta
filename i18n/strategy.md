# Internationalization (i18n) Strategy

Plan for multi-language support: English, German, French

## Overview

**Goal:** Allow users to switch language via a config setting. All UI strings + CSV exports maintain the selected language.

**Scope:**
- ✅ UI strings (buttons, labels, messages, errors)
- ✅ CSV exports (headers like "Title", "Vendor", etc.)
- ✅ Email notifications (future)
- ✅ Logging (can stay English for dev/production use)

**Supported Languages:**
- 🇬🇧 English (default)
- 🇩🇪 German (Deutsch)
- 🇫🇷 French (Français)

**No scope (MVP):**
- RTL languages (Arabic, Hebrew)
- Date/time localization (use ISO format in APIs)
- Number formatting (keep prices as strings)

## Implementation Approach

### Option 1: next-intl (Recommended)
**Pros:**
- Official Next.js i18n library
- App Router support
- Type-safe translations
- Server + client components
- Dynamic language switching

**Cons:**
- Adds ~200KB bundle
- Requires middleware

**Setup:**
```bash
npm install next-intl
```

### Option 2: Custom Hook (Lightweight)
**Pros:**
- No dependency
- Full control
- Tiny bundle

**Cons:**
- Manual setup
- Less features

**Setup:**
```typescript
// lib/i18n.ts
const translations = {
  en: { title: 'Product Wave', ... },
  de: { title: 'Produktwelle', ... },
  fr: { title: 'Vague de produit', ... }
}

export function useTranslation(lang: string) {
  return translations[lang] || translations.en
}
```

## File Structure (next-intl approach)

```
i18n/
├── request.ts                 # Get current locale
├── routing.ts                 # Supported locales
└── messages/
   ├── en.json                 # English strings
   ├── de.json                 # German strings
   └── fr.json                 # French strings

app/
├── middleware.ts              # Detect & route based on locale
├── [locale]/
│   ├── layout.tsx             # Locale wrapper
│   ├── page.tsx               # / → /en/
│   ├── login/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── wave/
│   │   ├── extract/
│   │   └── review/
```

## Translation Files Structure

### en.json
```json
{
  "common": {
    "backToHome": "Back to home",
    "signOut": "Sign out",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "auth": {
    "emailPlaceholder": "you@example.com",
    "sendMagicLink": "Send magic link",
    "checkEmail": "Check your email for the magic link!"
  },
  "upload": {
    "selectFile": "Select a PDF or image",
    "continue": "Continue"
  },
  "extract": {
    "ridingTheWave": "🌊 Riding the wave...",
    "catchingTheVibe": "🏄 Catching the vibe...",
    "analyzing": "🤖 Analyzing with Claude Vision..."
  },
  "review": {
    "title": "Review & Edit",
    "productInfo": "📋 Product Information",
    "price": "Price",
    "sizes": "📏 Sizes",
    "confirmExport": "✅ Confirm & Export"
  },
  "csv": {
    "headers": {
      "handle": "Handle",
      "title": "Title",
      "vendor": "Vendor",
      "price": "Price"
    }
  }
}
```

### de.json
```json
{
  "common": {
    "backToHome": "Zurück zur Startseite",
    "signOut": "Abmelden"
  },
  "auth": {
    "sendMagicLink": "Magischen Link senden",
    "checkEmail": "Überprüfen Sie Ihre E-Mail auf den magischen Link!"
  },
  "csv": {
    "headers": {
      "handle": "Kennung",
      "title": "Titel",
      "vendor": "Lieferant",
      "price": "Preis"
    }
  }
}
```

### fr.json
```json
{
  "common": {
    "backToHome": "Retour à l'accueil",
    "signOut": "Déconnexion"
  },
  "auth": {
    "sendMagicLink": "Envoyer le lien magique",
    "checkEmail": "Vérifiez votre e-mail pour le lien magique!"
  },
  "csv": {
    "headers": {
      "handle": "Identifiant",
      "title": "Titre",
      "vendor": "Fournisseur",
      "price": "Prix"
    }
  }
}
```

## Usage in Components

### Before (hardcoded strings)
```typescript
<button>Send magic link</button>
<h1>Review & Edit</h1>
```

### After (with next-intl)
```typescript
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const t = useTranslations('auth')
  
  return <button>{t('sendMagicLink')}</button>
}
```

### Server Component
```typescript
import { getTranslations } from 'next-intl/server'

export default async function ReviewPage() {
  const t = await getTranslations('review')
  
  return <h1>{t('title')}</h1>
}
```

## Language Switching

### Option A: URL-based (cleanest)
```
/en/app/dashboard
/de/app/dashboard
/fr/app/dashboard
```

Uses Next.js routing. Language persists via URL.

**Implementation:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const locale = request.nextUrl.locale || 'en'
  // next-intl handles routing
}
```

### Option B: Cookie-based (user preference)
```typescript
// Set cookie
document.cookie = 'NEXT_LOCALE=de; path=/'

// Middleware reads cookie
const locale = cookies().get('NEXT_LOCALE')?.value || 'en'
```

**Use this for:** Persistent user preference (remember choice)

### Option C: User profile (database)
```typescript
// profiles table add: language: 'en' | 'de' | 'fr'

// On fetch
const { data: profile } = await supabase
  .from('profiles')
  .select('language')
  .single()

const locale = profile.language || 'en'
```

**Use this for:** Per-user persistent setting

## CSV Export Localization

### Current (hardcoded English)
```csv
Handle,Title,Vendor,Price
product-1,Widget,Corp,99.99
```

### Localized version
```typescript
// lib/server/export.ts
import { getTranslations } from 'next-intl/server'

export async function generateCSV(waveId: string, locale: string) {
  const t = getTranslations('csv')
  
  const headers = [
    t('headers.handle'),
    t('headers.title'),
    t('headers.vendor'),
    t('headers.price'),
    // ...
  ]
  
  const csv = [headers, ...rows].map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n')
  
  return csv
}
```

**Example outputs:**

English:
```csv
Handle,Title,Vendor,Price
product-1,Widget,Corp,99.99
```

German:
```csv
Kennung,Titel,Lieferant,Preis
product-1,Widget,Corp,99.99
```

French:
```csv
Identifiant,Titre,Fournisseur,Prix
product-1,Widget,Corp,99.99
```

## Implementation Timeline

### Phase 1: Prepare (Now)
- Create translation files (en, de, fr)
- Install next-intl
- Extract all hardcoded strings from code
- Add strings to translation files

### Phase 2: Wiring (Step 8)
- Update middleware for locale routing
- Wrap pages with locale provider
- Update all components to use `useTranslations()`
- Test language switching

### Phase 3: Testing (Step 9)
- Test all 3 languages on every page
- Check CSV exports in all languages
- Verify fallback to English for missing translations
- Test browser language detection (optional)

### Phase 4: Polish (Step 10)
- Language selector in header (flag icons or dropdown)
- Save user preference to profile
- Document translation process for future additions
- Add new translations as new features are built

## Database Schema Update

Add language preference to profiles:

```sql
ALTER TABLE profiles ADD COLUMN language text DEFAULT 'en';

-- Constraint to valid languages
ALTER TABLE profiles ADD CONSTRAINT language_check
  CHECK (language IN ('en', 'de', 'fr'));
```

## Adding New Translations

**When adding a new UI string:**

1. Use `useTranslations()` in component
2. Add keys to ALL translation files:
   - en.json
   - de.json
   - fr.json

**Example:**
```typescript
// New feature: Password reset
// Add to all files:
{
  "passwordReset": {
    "title": "Reset your password",  // en.json
    "title": "Passwort zurücksetzen", // de.json
    "title": "Réinitialiser votre mot de passe" // fr.json
  }
}
```

## Fallback Strategy

If translation missing:
1. Check locale-specific file
2. Fall back to English (en.json)
3. Show key name as last resort (e.g., `auth.sendMagicLink`)

```typescript
t('auth.sendMagicLink') // de context
→ Check de.json for "auth.sendMagicLink"
→ If missing, check en.json
→ If missing, return "auth.sendMagicLink" (key)
```

## Browser Language Detection (Optional)

Detect user's browser language and auto-select:

```typescript
// middleware.ts
function getPreferredLocale(request: NextRequest): string {
  // Check cookie first (user preference)
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value
  if (cookieLocale) return cookieLocale

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage?.includes('de')) return 'de'
  if (acceptLanguage?.includes('fr')) return 'fr'

  // Default to English
  return 'en'
}
```

## Performance

- ✅ Translation files loaded server-side (not in JS bundle)
- ✅ Translations memoized per request
- ✅ No external API calls (all local)
- ✅ Tiny overhead (~5KB gzipped)

## References

- next-intl: https://next-intl-docs.vercel.app/
- i18n best practices: https://www.w3.org/International/
- RFC 5646 language tags: https://tools.ietf.org/html/rfc5646

## Decision

**Recommendation:** Use **next-intl** with URL-based routing + optional cookie for persistence

- Clean, maintainable
- Official Next.js support
- Easy to extend (more languages later)
- No performance impact
- Type-safe translations

**MVP i18n:** English only (Step 5-6 as is). Add German/French in Step 10 (polish).
