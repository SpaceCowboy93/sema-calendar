import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST — schedule a month-end finance push notification for both users
// Body: { monthKey: 'YYYY-MM', fireAt: ISO string }
export async function POST(req: NextRequest) {
  try {
    const { monthKey, fireAt } = await req.json()

    if (!monthKey || !fireAt) {
      return NextResponse.json({ error: 'Missing monthKey or fireAt' }, { status: 400 })
    }

    const now = new Date().toISOString()
    if (fireAt <= now) {
      return NextResponse.json({ ok: true, upserted: 0, reason: 'fire_at is in the past' })
    }

    const [year, month] = monthKey.split('-').map(Number)
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    const supabase = adminClient()

    // Delete existing unsent reminders for this monthKey + finance-month-end
    await supabase
      .from('push_reminders')
      .delete()
      .eq('couple_id', 'sema')
      .eq('item_type', 'finance-month-end')
      .eq('item_id', monthKey)
      .is('sent_at', null)

    // Insert for both users
    const rows = ['seval', 'mateo'].map(user => ({
      couple_id: 'sema',
      user_name: user,
      item_id:   monthKey,
      item_type: 'finance-month-end',
      fire_at:   fireAt,
      title:     'SeMa 💕',
      message:   `Your ${monthName} finance report is ready! Time to review. 📊`,
    }))

    const { error } = await supabase.from('push_reminders').insert(rows)

    if (error) {
      console.error('[finance-month-end] Insert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, upserted: rows.length, monthKey, fireAt })
  } catch (err) {
    console.error('[finance-month-end] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
