# Claude Vision Extraction Guide

This document explains how bwave uses Claude 3.5 Sonnet Vision API to extract product data from supplier PDFs and images.

## Overview

**Flow:**
```
User uploads PDF/image
    ↓
Server Action: extractProducts() called
    ↓
1. Fetch file from Supabase Storage
2. Get signed URL (1 hour expiry)
3. Send to Claude Vision API with prompt
4. Parse JSON response as ProductData
5. Store in product_waves table
6. Return waveId for redirect to review
```

**Timing:** Typically 10-30 seconds per file (depends on file size and Claude queue)

## API Setup

### Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create account or sign in
3. Click **API Keys** → **Create Key**
4. Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Free Tier Limits

- ~50,000 tokens/month
- ~100 RPM (requests per minute)
- Enough for MVP testing (~100 supplier PDFs at 500 tokens each)

### Upgrade for Production

```
Requests: $0.80 per 1M input tokens, $2.40 per 1M output tokens
Average extraction: 500 tokens in, 200 tokens out = ~$0.0006 per file
Cost at scale: ~$60 per 10,000 files
```

## The Extraction Prompt

Located in `lib/server/extract.ts`, the prompt tells Claude exactly what to extract:

```
You are extracting product data from a supplier PDF or product image 
for import into Shopify.

Extract ALL available fields and return ONLY a valid JSON object.

JSON schema to follow:
{
  "title": "Product name/title",
  "vendor": "Supplier/brand/vendor name",
  "product_type": "Product category or type",
  "description": "Full product description, specs, features",
  "price": "Regular selling price",
  "compare_at_price": "Original/compare-at price if on sale",
  "sizes": ["array", "of", "sizes"],
  "colors": ["array", "of", "colors"],
  "materials": "Material composition",
  "care_instructions": "Washing & care",
  "size_fit": "Sizing guidance",
  "tags": ["category", "tags"],
  "images": ["image", "URLs", "if", "available"]
}

Rules:
- Return ONLY JSON, no markdown or explanations
- Omit fields not present in document
- For images: describe for Shopify use
- Arrays: return as arrays, not comma-separated strings
- Prices: keep as strings (preserve currency symbols)
- Tags: lowercase, single words
```

**Key design decisions:**
- ✅ Schema is explicit (Claude knows exact format needed)
- ✅ Instructions are clear (only JSON, no markdown)
- ✅ Fallbacks included (omit fields if not found)
- ✅ Array handling specified (prevents comma-separated strings)
- ✅ Markdown stripping handled (in case Claude adds ```json)

## ProductData Schema

Defined in `lib/types.ts`:

```typescript
export type ProductData = {
  title: string                    // Product name
  vendor: string                   // Brand/supplier
  product_type: string             // Category
  description: string              // Full description
  price: string                    // Regular price
  compare_at_price: string         // Sale price (optional)
  sizes: string[]                  // Available sizes
  colors: string[]                 // Available colors
  materials: string                // Material composition
  care_instructions: string        // Washing/care
  size_fit: string                 // Sizing guidance
  tags: string[]                   // Shopify tags
  images: string[]                 // Image URLs/descriptions
}
```

All fields except title + vendor are optional (Claude omits if not found).

## Implementation Details

### Server Action: `extractProducts()`

Located in `lib/server/extract.ts`

**Steps:**

1. **Authenticate** — Verify user owns the upload
   ```typescript
   const { user } = await supabase.auth.getUser()
   if (!user) return { success: false, error: 'Not authenticated' }
   ```

2. **Fetch upload metadata** — Get file path and name
   ```typescript
   const { data: upload } = await supabase
     .from('uploads')
     .select('*')
     .eq('id', uploadId)
     .eq('profile_id', user.id)
     .single()
   ```

3. **Get signed URL** — Supabase Storage URL (1 hour expiry)
   ```typescript
   const { data: signedUrlData } = await supabase.storage
     .from('uploads')
     .createSignedUrl(upload.file_path, 3600)
   ```

4. **Call Claude Vision**
   ```typescript
   const response = await client.messages.create({
     model: 'claude-sonnet-4-6',
     max_tokens: 2048,
     messages: [{
       role: 'user',
       content: [
         { type: 'image', source: { type: 'url', url: signedUrl } },
         { type: 'text', text: claudePrompt }
       ]
     }]
   })
   ```

5. **Parse response** — Extract text, strip markdown if present
   ```typescript
   let jsonString = responseText.trim()
   if (jsonString.startsWith('```json')) {
     jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '')
   }
   const extractedData = JSON.parse(jsonString)
   ```

6. **Store in database** — Insert into `product_waves`
   ```typescript
   const { data: waveData } = await supabase
     .from('product_waves')
     .insert({ upload_id: uploadId, profile_id: user.id, extracted_data: extractedData })
     .select('id')
     .single()
   ```

7. **Return waveId** — For client redirect to review page
   ```typescript
   return { success: true, waveId: waveData.id }
   ```

### Client: Extract Page

Located in `app/app/extract/[uploadId]/page.tsx`

**Steps:**

1. **Mount effect** — Trigger extraction on page load
   ```typescript
   useEffect(() => {
     const result = await extractProducts(uploadId)
     if (result.success) {
       router.push(`/app/review/${result.waveId}`)  // Auto-redirect
     } else {
       setError(result.error)
     }
   }, [uploadId])
   ```

2. **Show WaveLoader** — Beautiful animated wave with funny messages
   ```typescript
   <WaveLoader />  // Shows random: "Riding the wave...", "Claude is cooking...", etc.
   ```

3. **Handle errors** — Show error + retry button
   ```typescript
   {error && (
     <div>
       <p>{error}</p>
       <button onClick={() => router.refresh()}>Try Again</button>
     </div>
   )}
   ```

## Logging

All extraction steps are logged with emojis for production visibility:

```javascript
logger.info('📤 extraction', 'Starting extraction', { uploadId, userId })
logger.info('📄 extraction', 'Upload metadata fetched', { fileName, fileType })
logger.info('🤖 extraction', 'Calling Claude Vision API', { uploadId })
logger.info('✅ extraction', 'Extraction complete', { uploadId, waveId })
logger.error('❌ extraction', 'Extraction failed', error, { uploadId })
```

**Log format:**
```json
{
  "timestamp": "2026-04-12T18:29:12.898Z",
  "level": "INFO",
  "service": "extraction",
  "message": "📤 Starting extraction",
  "context": { "uploadId": "...", "userId": "..." }
}
```

Perfect for log aggregation (Datadog, Sentry, CloudWatch).

## Error Handling

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `PKCE code verifier not found` | Old Supabase SSR version | `npm install @supabase/ssr@latest` |
| `Upload not found` | Wrong uploadId or wrong user | Check database permissions |
| `Failed to create signed URL` | File doesn't exist in Storage | Verify upload succeeded |
| `Failed to parse JSON` | Claude response wasn't valid JSON | See markdown stripping below |
| `Anthropic API rate limit` | Too many requests | Implement request queue |
| `Database insert failed` | Profile or upload not found | Check RLS policies |

### JSON Parsing Fallback

Claude sometimes wraps JSON in markdown:

```
Input: "What's the product?"
Claude output:
\`\`\`json
{ "title": "Widget", ... }
\`\`\`
```

Our parser handles this:

```typescript
let jsonString = responseText.trim()
if (jsonString.startsWith('```json')) {
  jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '')
} else if (jsonString.startsWith('```')) {
  jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '')
}
const extracted = JSON.parse(jsonString)
```

## Testing

### Unit Tests

Mock Claude API in `__tests__/lib/extract.test.ts`:

```typescript
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: { create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"title":"Test"}' }]
    })
  }))
}))

test('extracts product data from Claude response', async () => {
  const result = await extractProducts(uploadId)
  expect(result.success).toBe(true)
  expect(result.waveId).toBeDefined()
})
```

### Integration Tests

Test with a real small PDF:

```bash
# 1. Upload small PDF via /app/wave
# 2. Watch extraction page (should see WaveLoader)
# 3. Check logs: grep "✅ Extraction" console
# 4. Verify redirect to /app/review/[waveId]
# 5. Check database for extracted_data
```

### Manual Testing

```bash
# 1. Start dev server
npm run dev

# 2. Log in with whitelisted email
# 3. Upload a PDF from your wife's store
# 4. Watch WaveLoader animate + show funny message
# 5. See logs in console (emoji-prefixed)
# 6. Should redirect to review page in 10-30s
# 7. Edit extracted fields
# 8. Click "Confirm & Export" (Step 7)
```

## Optimization

### Token Usage

Average extraction:
- Input: 500 tokens (image + prompt)
- Output: 200 tokens (JSON response)
- Total: 700 tokens per extraction

At free tier (~50k tokens/month): ~70 extractions/month

### Cost Optimization

1. **Batch processing** — Extract multiple files in one request (future)
2. **Caching** — Cache responses for duplicate PDFs
3. **Model choice** — Use Haiku for simple text, Sonnet for complex images
4. **Prompt optimization** — Be specific about what you want (saves tokens)

### Timeout Handling

Claude requests timeout after 60 seconds. For larger files:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  timeout: 60000, // 60 second timeout
  messages: [...]
})
```

For production, implement async job queue:
- User uploads file
- Job queued (return uploadId immediately)
- Background worker processes extraction
- Client polls for completion status
- Auto-redirect when ready

## Migration Guide

### From Free to Paid API

```javascript
// .env.local
ANTHROPIC_API_KEY=sk-ant-...  // Free tier key (50k tokens/month)

// To upgrade:
// 1. Go to console.anthropic.com/billing
// 2. Add payment method
// 3. No code changes needed (same API key works)
```

### Switching Models

```typescript
// Current: Claude Sonnet 4.6 (best for vision)
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',  // 200K context, vision
  ...
})

// Alternative: Claude 3.5 Haiku (faster, cheaper)
// model: 'claude-3-5-haiku-20241022'  // 200K context, vision, 80% cheaper

// Alternative: Claude 4 (slower, more expensive)
// model: 'claude-4-20250514'  // 200K context, vision, better quality
```

## References

- Claude API docs: https://docs.anthropic.com/
- Model comparison: https://docs.anthropic.com/about/models/overview
- Pricing: https://www.anthropic.com/pricing/claude
