# CSV Export Guide

This document explains how bwave converts extracted product data into Shopify-compatible CSV format for bulk import.

## Overview

**Flow:**
```
User clicks "Confirm & Export" on review page
    ↓
exportCSV() Server Action called with waveId
    ↓
1. Authenticate user
2. Fetch ProductData from product_waves
3. Convert to Shopify CSV (handle variants)
4. Upload CSV to Supabase Storage
5. Create csv_exports audit record
6. Return signed download URL
    ↓
Browser downloads CSV file
    ↓
User imports into Shopify via bulk import tool
```

**Timing:** Typically 1-3 seconds per product

## Shopify CSV Format

Standard Shopify bulk import CSV structure:

| Column | Required | Example |
|--------|----------|---------|
| Handle | ✅ | `my-t-shirt` |
| Title | ✅ | `T-Shirt` |
| Vendor | ✅ | `ACME Corp` |
| Type | ✅ | `Apparel` |
| Body (HTML) | ❌ | `A comfortable t-shirt` |
| Tags | ❌ | `clothing,basic` |
| Published | ✅ | `true` |
| Price | ✅ | `$29.99` |
| Compare At Price | ❌ | `$39.99` |
| Option1 Name | ❌ | `Size` |
| Option1 Value | ❌ | `M` |
| Option2 Name | ❌ | `Color` |
| Option2 Value | ❌ | `Red` |

### Variant Handling

For products with multiple sizes and colors, bwave creates one row per combination:

**Example:** Product with 2 sizes (S, M) × 2 colors (Red, Blue)

```
Handle,Title,Vendor,Type,Body (HTML),Tags,Published,Price,Compare At Price,Option1 Name,Option1 Value,Option2 Name,Option2 Value
my-t-shirt,T-Shirt,ACME,Apparel,Soft cotton...,clothing|basic,true,29.99,39.99,Size,S,Color,Red
my-t-shirt,T-Shirt,ACME,Apparel,Soft cotton...,clothing|basic,true,29.99,39.99,Size,S,Color,Blue
my-t-shirt,T-Shirt,ACME,Apparel,Soft cotton...,clothing|basic,true,29.99,39.99,Size,M,Color,Red
my-t-shirt,T-Shirt,ACME,Apparel,Soft cotton...,clothing|basic,true,29.99,39.99,Size,M,Color,Blue
```

**No variants:** If product has no sizes/colors, creates single row with empty option fields.

## Implementation

### Server Action: `exportCSV()`

Located in `lib/server/export.ts`

**Steps:**

1. **Authenticate** — Verify user is logged in
   ```typescript
   const { user } = await supabase.auth.getUser()
   if (!user) return { success: false, error: 'Not authenticated' }
   ```

2. **Fetch ProductData** — Get product_waves row by waveId + profile_id
   ```typescript
   const { data: wave } = await supabase
     .from('product_waves')
     .select('*')
     .eq('id', waveId)
     .eq('profile_id', user.id)
     .single()
   ```

3. **Generate CSV** — Call `productDataToShopifyCSV(productData)`
   ```typescript
   const csvContent = productDataToShopifyCSV(productData)
   ```

4. **Upload to Storage** — Save CSV to `csv-exports` bucket (user folder)
   ```typescript
   const fileName = `${handle}-${Date.now()}.csv`
   const filePath = `${user.id}/${fileName}`
   
   await serviceRoleClient.storage
     .from('csv-exports')
     .upload(filePath, csvBlob, { contentType: 'text/csv' })
   ```

5. **Create Audit Record** — Insert into `csv_exports` table
   ```typescript
   await supabase.from('csv_exports').insert({
     wave_id: waveId,
     profile_id: user.id,
     csv_path: filePath,
   })
   ```

6. **Generate Download URL** — Return signed URL (1 hour expiry)
   ```typescript
   const { data: { signedUrl } } = await serviceRoleClient.storage
     .from('csv-exports')
     .createSignedUrl(filePath, 3600)
   ```

7. **Revalidate Cache** — Update dashboard and review pages
   ```typescript
   revalidatePath('/app/dashboard')
   revalidatePath(`/app/review/${waveId}`)
   ```

### CSV Generation: `productDataToShopifyCSV()`

Converts ProductData to Shopify CSV string:

```typescript
function productDataToShopifyCSV(data: ProductData): string {
  // 1. Generate handle from title: "T-Shirt" → "t-shirt"
  const handle = data.title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 255)

  // 2. Get variants (or null if none)
  const sizes = data.sizes?.length > 0 ? data.sizes : [null]
  const colors = data.colors?.length > 0 ? data.colors : [null]

  // 3. Generate rows (Cartesian product of sizes × colors)
  const rows = [/* header row */]
  for (const size of sizes) {
    for (const color of colors) {
      rows.push([
        handle, title, vendor, type, description, tags,
        'true', price, compare_at_price,
        size ? 'Size' : '', size || '',
        color ? 'Color' : '', color || ''
      ])
    }
  }

  // 4. CSV escaping: quote cells with commas/quotes/newlines
  const csvLines = rows.map(row =>
    row.map(cell => {
      if (cell?.includes(',') || cell?.includes('"') || cell?.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"` // Escape quotes
      }
      return cell
    }).join(',')
  )

  return csvLines.join('\n')
}
```

## Client: Export Page

Located in `app/app/export/[waveId]/page.tsx`

**States:**

1. **Loading** — Shows WaveLoader while generating CSV
   ```typescript
   if (state === 'loading') {
     return <WaveLoader />
   }
   ```

2. **Success** — Shows download button + instructions
   ```typescript
   return (
     <div>
       <h1>Ready for Shopify 🎉</h1>
       <a href={downloadUrl} download>Download CSV</a>
       <p>Use Shopify's bulk import tool to upload</p>
     </div>
   )
   ```

3. **Error** — Shows error message + retry button
   ```typescript
   return (
     <div>
       <h1>Export Failed</h1>
       <p>{errorMessage}</p>
       <button onClick={handleRetry}>Try Again</button>
     </div>
   )
   ```

## Logging

All export steps are logged:

```typescript
logger.info('📊 export', 'Export started', { waveId, userId })
logger.info('📊 export', 'Export complete', { waveId, fileName, recordId })
logger.error('📊 export', 'Export failed', error, { waveId })
```

**Log format:**
```json
{
  "timestamp": "2026-04-13T10:20:00.000Z",
  "level": "INFO",
  "service": "export",
  "message": "📊 Export complete",
  "context": { "waveId": "...", "fileName": "t-shirt-1234567890.csv" }
}
```

## Storage Structure

Files uploaded to `csv-exports` bucket:

```
csv-exports/
├─ <user-id-1>/
│  ├─ t-shirt-1712948572304.csv
│  └─ polo-shirt-1712948574891.csv
└─ <user-id-2>/
   └─ dress-1712948598234.csv
```

RLS policies ensure users only access their own CSVs.

## Database Tables

### csv_exports
```typescript
{
  id: string                // UUID, auto-generated
  wave_id: string           // References product_waves.id
  profile_id: string        // User ID (for RLS)
  csv_path: string          // Path in storage bucket
  created_at: timestamp     // When exported
  updated_at: timestamp     // Auto-updated
}
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Not authenticated` | User not logged in | Log in first |
| `Product wave not found` | Invalid waveId or wrong user | Check URL |
| `Failed to upload CSV` | Storage write error | Check RLS policies |
| `Failed to create export record` | Database insert error | Check schema |
| `Failed to create download URL` | File not found in storage | Retry upload |
| `An unexpected error occurred` | Unhandled exception | Check logs |

## Testing

### Unit Tests

Mock in `__tests__/lib/export.test.ts`:

```bash
npm test -- export.test.ts
```

**Tests cover:**
- ✅ Authentication check
- ✅ Product wave ownership
- ✅ CSV generation with variants
- ✅ Storage upload
- ✅ Audit record creation
- ✅ Error scenarios (upload failure, URL creation failure)

### Integration Test

Manual flow:

```bash
1. npm run dev
2. Log in
3. Upload PDF / Enter review page
4. Click "Confirm & Export"
5. See WaveLoader on export page
6. Download CSV → Open in spreadsheet app
7. Verify: correct rows, columns, escaping
8. Test with Shopify bulk importer (dry run first)
```

## Next Steps

### Step 8: Bulk Management
- Edit multiple products at once
- Bulk export entire waves
- Track export history

### Step 9: Shopify Integration
- Direct API upload (skip CSV download)
- Real-time sync status
- Inventory sync

### Step 10: Polish & Deployment
- Mobile UI optimization
- Advanced error recovery
- Production deployment

## References

- Shopify CSV format: https://help.shopify.com/en/manual/products/import-export/using-csv
- Shopify bulk operations: https://help.shopify.com/en/manual/products/import-export
- RFC 4180 (CSV standard): https://datatracker.ietf.org/doc/html/rfc4180
