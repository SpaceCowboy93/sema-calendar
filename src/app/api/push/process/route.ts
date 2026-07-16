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
  if (!secret) {
    console.warn('[process] CRON_SECRET not set — allowing request (dev mode)')
    return true
  }
  const auth = req.headers.get('authorization') ?? ''
  const ok   = auth === `Bearer ${secret}`
  if (!ok) console.warn('[process] Unauthorized request — wrong or missing Bearer token')
  return ok
}

// GET — called by external cron (cron-job.org) every 5 minutes
// Finds due reminders, sends pushes, marks as sent
export async function GET(req: NextRequest) {
  const runAt = new Date().toISOString()
  console.log('[process GET] Run at:', runAt)

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify env vars present
  console.log('[process GET] VAPID_SUBJECT present:',          !!process.env.VAPID_SUBJECT)
  console.log('[process GET] NEXT_PUBLIC_VAPID_PUBLIC_KEY:',   !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  console.log('[process GET] VAPID_PRIVATE_KEY present:',      !!process.env.VAPID_PRIVATE_KEY)
  console.log('[process GET] SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const supabase = adminClient()
  const now      = new Date().toISOString()

  // 1. Fetch due, unsent reminders
  const { data: reminders, error: remErr } = await supabase
    .from('push_reminders')
    .select('id, couple_id, user_name, title, message, fire_at')
    .lte('fire_at', now)
    .is('sent_at', null)
    .order('fire_at', { ascending: true })
    .limit(100)

  if (remErr) {
    console.error('[process GET] Supabase reminders query error:', remErr.message)
    return NextResponse.json({ error: remErr.message }, { status: 500 })
  }

  console.log('[process GET] Due unsent reminders found:', reminders?.length ?? 0)
  reminders?.forEach(r => {
    console.log(`[process GET]   reminder id=${r.id} user=${r.user_name} fire_at=${r.fire_at} msg="${r.message}"`)
  })

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, checked_at: runAt })
  }

  // 2. Batch-fetch subscriptions for involved users
  const userNames = Array.from(new Set(reminders.map((r: { user_name: string }) => r.user_name)))
  console.log('[process GET] Fetching subscriptions for users:', userNames)

  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('user_name, endpoint, p256dh, auth')
    .in('user_name', userNames)

  if (subErr) {
    console.error('[process GET] Supabase subscriptions query error:', subErr.message)
    return NextResponse.json({ error: subErr.message }, { status: 500 })
  }

  console.log('[process GET] Total subscriptions fetched:', subs?.length ?? 0)
  subs?.forEach(s => {
    console.log(`[process GET]   sub user=${s.user_name} endpoint=…${s.endpoint.slice(-30)}`)
  })

  const subsByUser: Record<string, { endpoint: string; p256dh: string; auth: string }[]> = {}
  for (const s of (subs ?? [])) {
    const key = s.user_name.toLowerCase()
    if (!subsByUser[key]) subsByUser[key] = []
    subsByUser[key].push(s)
  }

  // 3. Send notifications
  const sentIds:       string[] = []
  const staleEndpoints: string[] = []

  await Promise.all(
    reminders.map(async (r: { id: string; user_name: string; title: string; message: string; fire_at: string }) => {
      const normalizedUser = r.user_name.toLowerCase()
      const userSubs = subsByUser[normalizedUser] ?? []
      console.log(`[process GET] Processing reminder ${r.id} for ${normalizedUser} — subscriptions: ${userSubs.length}`)

      if (userSubs.length === 0) {
        console.log(`[process GET]   No subscriptions for ${normalizedUser} — skipping (will retry when device connects)`)
        // Do NOT mark as sent — leave unsent so it fires once the user subscribes
        return
      }

      let allOk = true

      await Promise.all(
        userSubs.map(async sub => {
          const payload = JSON.stringify({
            title: r.title,
            body:  r.message,
            url:   '/together',
            tag:   `sema-${r.id}`,
          })
          try {
            console.log(`[process GET]   Sending to …${sub.endpoint.slice(-30)} …`)
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            )
            console.log(`[process GET]   Sent OK to …${sub.endpoint.slice(-30)}`)
          } catch (err: unknown) {
            const httpStatus = (err as { statusCode?: number }).statusCode
            const body       = (err as { body?: string }).body
            console.error(`[process GET]   webpush error for …${sub.endpoint.slice(-30)}: status=${httpStatus} body=${body}`)
            if (httpStatus === 404 || httpStatus === 410) {
              console.log(`[process GET]   Marking subscription stale (${httpStatus})`)
              staleEndpoints.push(sub.endpoint)
            } else {
              allOk = false
            }
          }
        })
      )

      if (allOk) {
        sentIds.push(r.id)
        console.log(`[process GET]   Reminder ${r.id} marked for sent update`)
      } else {
        console.warn(`[process GET]   Reminder ${r.id} NOT marked sent — at least one delivery failed`)
      }
    })
  )

  // 4. Mark sent
  if (sentIds.length) {
    console.log('[process GET] Marking sent:', sentIds.length, 'reminders')
    const { error: updErr } = await supabase
      .from('push_reminders')
      .update({ sent_at: now })
      .in('id', sentIds)
    if (updErr) console.error('[process GET] Mark-sent error:', updErr.message)
  }

  // 5. Remove stale subscriptions
  if (staleEndpoints.length) {
    console.log('[process GET] Removing stale subscriptions:', staleEndpoints.length)
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  console.log(`[process GET] Done — sent: ${sentIds.length}, stale: ${staleEndpoints.length}`)
  return NextResponse.json({
    ok:        true,
    processed: sentIds.length,
    stale:     staleEndpoints.length,
    checked_at: runAt,
  })
}
