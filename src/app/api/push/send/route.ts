import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST — send a push to all subscriptions for a given user
// Body: { userName, title, body, url?, tag? }
// For test: { userName: 'mateo', title: 'Test 💕', body: 'SeMa push is working!' }
export async function POST(req: NextRequest) {
  try {
    const { userName: rawUserName, title, body, url = '/together', tag = 'sema-test' } = await req.json()
    const userName = typeof rawUserName === 'string' ? rawUserName.toLowerCase() : rawUserName
    if (!userName || !title) {
      return NextResponse.json({ error: 'Missing userName or title' }, { status: 400 })
    }

    const supabase = adminClient()
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('couple_id', 'sema')
      .eq('user_name', userName)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: false, message: 'No subscriptions for this user' })
    }

    const payload = JSON.stringify({ title, body, url, tag })
    const stale: string[] = []
    let sent = 0

    await Promise.all(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          sent++
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) stale.push(sub.endpoint)
        }
      })
    )

    // Remove stale subscriptions
    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', stale)
    }

    return NextResponse.json({ ok: true, sent, stale: stale.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
