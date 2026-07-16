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
    const body = await req.json()
    const { subscription, userName } = body

    console.log('[push/subscribe POST] userName:', userName)
    console.log('[push/subscribe POST] endpoint suffix:', subscription?.endpoint?.slice(-40) ?? 'MISSING')
    console.log('[push/subscribe POST] p256dh present:', !!subscription?.keys?.p256dh)
    console.log('[push/subscribe POST] auth present:',   !!subscription?.keys?.auth)

    if (!subscription?.endpoint || !userName) {
      console.error('[push/subscribe POST] Missing subscription or userName')
      return NextResponse.json({ error: 'Missing subscription or userName' }, { status: 400 })
    }

    const supabase = adminClient()
    const { data, error } = await supabase.from('push_subscriptions').upsert(
      {
        couple_id:  'sema',
        user_name:  userName,
        endpoint:   subscription.endpoint,
        p256dh:     subscription.keys?.p256dh ?? '',
        auth:       subscription.keys?.auth   ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    ).select('id')

    if (error) {
      console.error('[push/subscribe POST] Supabase upsert error:', error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[push/subscribe POST] Upsert OK — row id:', data?.[0]?.id ?? 'unknown')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe POST] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — remove a push subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    console.log('[push/subscribe DELETE] endpoint suffix:', endpoint?.slice(-40) ?? 'MISSING')

    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    const supabase = adminClient()
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) {
      console.error('[push/subscribe DELETE] Supabase error:', error.message)
    } else {
      console.log('[push/subscribe DELETE] Row removed OK')
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe DELETE] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
