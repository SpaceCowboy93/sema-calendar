import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side admin client — uses service role key, bypasses RLS entirely
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file    = form.get('file') as File | null
    const eventId = form.get('eventId') as string | null

    if (!file || !eventId) {
      return NextResponse.json({ error: 'Missing file or eventId' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const path   = `${eventId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const supabase = getAdminClient()
    const { data, error } = await supabase.storage
      .from('event-photos')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })

    if (error || !data) {
      console.error('[upload-photo API] Supabase error:', error)
      return NextResponse.json({ error: error?.message ?? 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(data.path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[upload-photo API] Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
