import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || url === 'https://placeholder.supabase.co') {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_SUPABASE_URL is missing in env vars' })
  }
  if (!key || key === 'placeholder-key') {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in env vars' })
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('couple_state')
    .select('id, updated_at')
    .eq('id', 'sema')
    .maybeSingle()

  return NextResponse.json({
    ok: !error,
    error: error?.message ?? null,
    errorCode: error?.code ?? null,
    data: data ?? null,
    url: url.slice(0, 40),
    keyPrefix: key.slice(0, 20) + '...',
  })
}
