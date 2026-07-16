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

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret set → allow (dev only)
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// GET — called by Vercel Cron (or external cron)
// Finds due reminders, sends pushes, marks as sent
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now      = new Date().toISOString()

  // 1. Fetch due, unsent reminders
  const { data: reminders, error: remErr } = await supabase
    .from('push_reminders')
    .select('id, couple_id, user_name, title, message')
    .lte('fire_at', now)
    .is('sent_at', null)
    .order('fire_at', { ascending: true })
    .limit(100)

  if (remErr) return NextResponse.json({ error: remErr.message }, { status: 500 })
  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // 2. Batch-fetch subscriptions for involved users
  const userNames = Array.from(new Set(reminders.map((r: { user_name: string }) => r.user_name)))
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('user_name, endpoint, p256dh, auth')
    .in('user_name', userNames)

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  const subsByUser: Record<string, { endpoint: string; p256dh: string; auth: string }[]> = {}
  for (const s of (subs ?? [])) {
    if (!subsByUser[s.user_name]) subsByUser[s.user_name] = []
    subsByUser[s.user_name].push(s)
  }

  // 3. Send notifications
  const sentIds:   string[] = []
  const staleEndpoints: string[] = []

  await Promise.all(
    reminders.map(async (r: { id: string; user_name: string; title: string; message: string }) => {
      const userSubs = subsByUser[r.user_name] ?? []
      // No subscriptions = nothing to deliver; mark sent so it doesn't accumulate
      let allOk = true

      await Promise.all(
        userSubs.map(async sub => {
          const payload = JSON.stringify({ title: r.title, body: r.message, url: '/together', tag: `sema-${r.id}` })
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            )
          } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode
            if (status === 404 || status === 410) {
              staleEndpoints.push(sub.endpoint)
            } else {
              allOk = false
            }
          }
        })
      )

      if (allOk) sentIds.push(r.id)
    })
  )

  // 4. Mark sent
  if (sentIds.length) {
    await supabase
      .from('push_reminders')
      .update({ sent_at: now })
      .in('id', sentIds)
  }

  // 5. Remove stale subscriptions
  if (staleEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  return NextResponse.json({ ok: true, processed: sentIds.length, stale: staleEndpoints.length })
}
