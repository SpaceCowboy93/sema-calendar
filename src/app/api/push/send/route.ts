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

// Authorization matrix:
//   production + secret set     → check Bearer token
//   production + secret missing → reject 503 (misconfiguration; never expose unauthenticated)
//   development + secret set    → check Bearer token
//   development + secret missing → allow with warning (dev convenience only)
//
// Returns { ok, statusCode, message } so the handler can emit the right HTTP status.
type AuthResult =
  | { ok: true }
  | { ok: false; statusCode: 401 | 503; message: string }

function isAuthorized(req: NextRequest): AuthResult {
  const secret = process.env.PUSH_SEND_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Fail closed: missing secret in production is a misconfiguration, not a missing token.
      // Return 503 (not 401) so the caller cannot distinguish this from a server error.
      console.error('[send] PUSH_SEND_SECRET not configured in production — all requests rejected')
      return { ok: false, statusCode: 503, message: 'Service unavailable — server misconfiguration' }
    }
    console.warn('[send] PUSH_SEND_SECRET not set — allowing request (development only)')
    return { ok: true }
  }

  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${secret}`) {
    console.warn('[send] Unauthorized — wrong or missing Bearer token')
    return { ok: false, statusCode: 401, message: 'Unauthorized' }
  }

  return { ok: true }
}

// POST — send a push to all subscriptions for a given user
// Body: { userName, title, body, url?, tag? }
// Auth: Authorization: Bearer <PUSH_SEND_SECRET>
// Caller: server/cron only. Never called from the browser (use /api/push/test instead).
export async function POST(req: NextRequest) {
  const auth = isAuthorized(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.statusCode })
  }

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

    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', stale)
    }

    return NextResponse.json({ ok: true, sent, stale: stale.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
