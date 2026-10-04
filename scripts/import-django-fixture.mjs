import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const exportPath = process.env.DJANGO_EXPORT_PATH
const mediaDirectory = process.env.DJANGO_MEDIA_DIR
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = 'challenge-photos'

if (!exportPath || !mediaDirectory || !supabaseUrl || !serviceRoleKey) {
  throw new Error('Set DJANGO_EXPORT_PATH, DJANGO_MEDIA_DIR, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in the local shell environment.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const fixture = JSON.parse(await readFile(exportPath, 'utf8'))
if (!Array.isArray(fixture)) throw new Error('Expected a Django dumpdata JSON fixture (top-level array).')

const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
])
const mediaRoot = path.resolve(mediaDirectory)
const rows = []

for (const record of fixture) {
  if (record.model !== 'challenges.challenge') continue
  const fields = record.fields
  let imagePath = null
  const djangoImage = fields.image?.replaceAll('\\', '/')

  if (djangoImage) {
    const localFile = path.resolve(mediaRoot, djangoImage)
    if (!localFile.startsWith(`${mediaRoot}${path.sep}`)) {
      throw new Error(`Unsafe media path in challenge ${record.pk}; refusing to read outside the media directory.`)
    }
    const extension = path.extname(localFile).toLowerCase()
    const contentType = mimeTypes.get(extension)
    if (!contentType) throw new Error(`Unsupported image format for challenge ${record.pk}: ${extension}`)
    const objectName = path.basename(localFile).replace(/[^a-zA-Z0-9._-]/g, '-')
    imagePath = `migrated/${record.pk}/${objectName}`
    const bytes = await readFile(localFile)
    const { error } = await supabase.storage.from(bucket).upload(imagePath, bytes, {
      contentType,
      upsert: true,
    })
    if (error) throw new Error(`Could not upload challenge ${record.pk} photo: ${error.message}`)
  }

  const imageUrl = fields.image_url ?? ''
  if (!imagePath && !imageUrl) {
    throw new Error(`Challenge ${record.pk} has neither a media file nor an image URL.`)
  }

  rows.push({
    id: record.pk,
    image_url: imageUrl,
    image_path: imagePath,
    alt_text: fields.alt_text,
    caption: fields.caption,
    photo_note: fields.photo_note,
    title: fields.title,
    category: fields.category,
    event_at: fields.event_at,
    latitude: fields.latitude,
    longitude: fields.longitude,
    place: fields.place,
    description: fields.description,
    is_active: fields.is_active,
    created_by: null,
    created_at: fields.created_at,
    updated_at: fields.updated_at,
  })
}

for (let offset = 0; offset < rows.length; offset += 100) {
  const batch = rows.slice(offset, offset + 100)
  const { error } = await supabase.from('challenges').upsert(batch, { onConflict: 'id' })
  if (error) throw new Error(`Could not import rows ${offset + 1}-${offset + batch.length}: ${error.message}`)
  console.log(`Imported ${offset + batch.length}/${rows.length} challenges`)
}

console.log(`Migration complete: ${rows.length} challenge records. Creator attribution was left null; reset the ID sequence using the SQL in ADMIN_SETUP.md.`)
