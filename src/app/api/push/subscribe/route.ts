import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST — save a new push subscription
export async function POST(req: NextRequest) {
  try {
    const { subscription, userName } = await req.json()
    if (!subscription?.endpoint || !userName) {
      return NextResponse.json({ error: 'Missing subscription or userName' }, { status: 400 })
    }

    const supabase = adminClient()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        couple_id:  'sema',
        user_name:  userName,
        endpoint:   subscription.endpoint,
        p256dh:     subscription.keys?.p256dh ?? '',
        auth:       subscription.keys?.auth   ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — remove a push subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    const supabase = adminClient()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
