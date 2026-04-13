#!/usr/bin/env node

/**
 * Cleanup Script: Remove orphaned uploads
 *
 * Finds uploads that failed extraction (no product_waves created)
 * and cleans them up from storage and database.
 *
 * Usage: npx ts-node scripts/cleanup-failed-uploads.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface OrphanedUpload {
  id: string
  file_name: string
  file_path: string
  created_at: string
}

async function findOrphanedUploads(): Promise<OrphanedUpload[]> {
  console.log('🔍 Finding orphaned uploads (older than 7 days with no extraction)...\n')

  // Find uploads not linked to any product_waves, created more than 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('uploads')
    .select('id, file_name, file_path, created_at')
    .lt('created_at', sevenDaysAgo)

  if (error) {
    throw new Error(`Failed to query uploads: ${error.message}`)
  }

  if (!data) return []

  // Filter out uploads that have associated product_waves
  const uploadIds = data.map((u) => u.id)
  if (uploadIds.length === 0) {
    console.log('  No old uploads found')
    return []
  }

  const { data: waves } = await supabase
    .from('product_waves')
    .select('upload_id')
    .in('upload_id', uploadIds)

  const usedUploadIds = new Set(waves?.map((w) => w.upload_id) || [])
  const orphaned = data.filter((u) => !usedUploadIds.has(u.id))

  return orphaned as OrphanedUpload[]
}

async function deleteFromStorage(filePath: string): Promise<boolean> {
  const { error } = await supabase.storage.from('uploads').remove([filePath])

  if (error) {
    console.error(`    ❌ Storage: ${error.message}`)
    return false
  }
  return true
}

async function deleteFromDatabase(uploadId: string): Promise<boolean> {
  const { error } = await supabase.from('uploads').delete().eq('id', uploadId)

  if (error) {
    console.error(`    ❌ Database: ${error.message}`)
    return false
  }
  return true
}

async function cleanup() {
  try {
    const orphaned = await findOrphanedUploads()

    if (orphaned.length === 0) {
      console.log('✅ No orphaned uploads to clean up\n')
      return
    }

    console.log(`Found ${orphaned.length} orphaned uploads:\n`)

    let deletedCount = 0
    let failedCount = 0

    for (const upload of orphaned) {
      process.stdout.write(`  🗑️  ${upload.file_name}...`)

      const storageDeleted = await deleteFromStorage(upload.file_path)
      const dbDeleted = await deleteFromDatabase(upload.id)

      if (storageDeleted && dbDeleted) {
        console.log(' ✅')
        deletedCount++
      } else {
        console.log(' ⚠️  (partial)')
        failedCount++
      }
    }

    console.log()
    console.log(`Summary:`)
    console.log(`  ✅ Deleted: ${deletedCount}`)
    if (failedCount > 0) {
      console.log(`  ⚠️  Failed: ${failedCount}`)
    }
    console.log()
  } catch (error) {
    console.error('❌ Cleanup failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run
cleanup()
