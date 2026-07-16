import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const REMINDER_LABELS: Record<number, string> = {
  0: '5 min before',
  1: '1 hour before',
  2: 'tomorrow',
}

// POST — upsert push_reminders for a user based on their current dated items
// Body: { userName, items: [{ id, type, title, fireAts: string[] }] }
export async function POST(req: NextRequest) {
  try {
    const { userName, items } = await req.json()

    console.log('[sync-reminders POST] userName:', userName)
    console.log('[sync-reminders POST] items received:', Array.isArray(items) ? items.length : 'NOT ARRAY')

    if (!userName || !Array.isArray(items)) {
      console.error('[sync-reminders POST] Missing userName or items')
      return NextResponse.json({ error: 'Missing userName or items' }, { status: 400 })
    }

    const now  = new Date().toISOString()
    const rows: Record<string, unknown>[] = []

    for (const item of items) {
      const { id, type, title, fireAts } = item
      if (!id || !type || !title || !Array.isArray(fireAts)) {
        console.warn('[sync-reminders POST] Skipping malformed item:', item)
        continue
      }

      for (let i = 0; i < fireAts.length; i++) {
        const fireAt = fireAts[i]
        if (!fireAt || fireAt < now) {
          console.log(`[sync-reminders POST] Skipping past fireAt for "${title}":`, fireAt)
          continue
        }

        const offsetIndex = fireAts.length - 1 - i
        const suffix  = REMINDER_LABELS[offsetIndex] ?? ''
        const message = suffix ? `${suffix}: ${title}` : title

        rows.push({
          couple_id: 'sema',
          user_name: userName,
          item_id:   id,
          item_type: type,
          fire_at:   fireAt,
          title:     'SeMa 💕',
          message,
        })
        console.log(`[sync-reminders POST]   row: "${message}" fire_at: ${fireAt}`)
      }
    }

    console.log('[sync-reminders POST] Total rows to insert:', rows.length)

    const supabase = adminClient()

    // Delete unsent reminders for all items in this batch so changed times don't linger
    const itemIds = Array.from(new Set(items.map((i: { id: string }) => i.id)))
    console.log('[sync-reminders POST] Deleting unsent rows for item IDs:', itemIds)
    const { error: delErr, count: delCount } = await supabase
      .from('push_reminders')
      .delete({ count: 'exact' })
      .eq('couple_id', 'sema')
      .eq('user_name', userName)
      .in('item_id', itemIds)
      .is('sent_at', null)

    if (delErr) {
      console.error('[sync-reminders POST] Delete error:', delErr.message, delErr.details)
    } else {
      console.log('[sync-reminders POST] Deleted unsent rows:', delCount ?? 'unknown')
    }

    if (rows.length === 0) {
      console.log('[sync-reminders POST] No future rows — done')
      return NextResponse.json({ ok: true, upserted: 0 })
    }

    const { error: insErr } = await supabase
      .from('push_reminders')
      .insert(rows)

    if (insErr) {
      console.error('[sync-reminders POST] Insert error:', insErr.message, insErr.details)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    console.log('[sync-reminders POST] Inserted', rows.length, 'rows OK')
    return NextResponse.json({ ok: true, upserted: rows.length })
  } catch (err) {
    console.error('[sync-reminders POST] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
