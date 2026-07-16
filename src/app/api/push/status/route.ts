import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/push/status?userName=mateo
// Returns whether the user has a saved push subscription in the DB
export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  const userName = url.searchParams.get('userName')?.toLowerCase()

  if (!userName) {
    return NextResponse.json({ error: 'Missing userName' }, { status: 400 })
  }

  const supabase = adminClient()
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', 'sema')
    .eq('user_name', userName)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, hasSubscription: (count ?? 0) > 0 })
}
