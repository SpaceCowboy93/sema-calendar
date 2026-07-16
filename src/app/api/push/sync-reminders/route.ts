import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const REMINDER_LABELS: Record<number, string> = {
  0: '5 min before',  // 5 * 60 * 1000
  1: '1 hour before',
  2: 'tomorrow',
}

// POST — upsert push_reminders for a user based on their current dated items
// Body: { userName, items: [{ id, type, title, fireAts: string[] }] }
export async function POST(req: NextRequest) {
  try {
    const { userName, items } = await req.json()
    if (!userName || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing userName or items' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const rows: Record<string, unknown>[] = []

    for (const item of items) {
      const { id, type, title, fireAts } = item
      if (!id || !type || !title || !Array.isArray(fireAts)) continue

      for (let i = 0; i < fireAts.length; i++) {
        const fireAt = fireAts[i]
        if (!fireAt || fireAt < now) continue

        const offsetIndex = fireAts.length - 1 - i
        const suffix = REMINDER_LABELS[offsetIndex] ?? ''
        const message = suffix
          ? `${suffix}: ${title}`
          : title

        rows.push({
          couple_id: 'sema',
          user_name: userName,
          item_id:   id,
          item_type: type,
          fire_at:   fireAt,
          title:     'SeMa 💕',
          message,
        })
      }
    }

    const supabase = adminClient()

    // Delete unsent reminders for all items in this batch so changed times don't linger
    const itemIds = Array.from(new Set(items.map((i: { id: string }) => i.id)))
    await supabase
      .from('push_reminders')
      .delete()
      .eq('couple_id', 'sema')
      .eq('user_name', userName)
      .in('item_id', itemIds)
      .is('sent_at', null)

    if (rows.length === 0) return NextResponse.json({ ok: true, upserted: 0 })

    const { error } = await supabase
      .from('push_reminders')
      .insert(rows)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, upserted: rows.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
