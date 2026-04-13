import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GAS_URL = process.env.GAS_URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const data = req.body

  try {
    // 1. Supabaseに保存
    const { error: dbError } = await supabase
      .from('fuel_records')
      .insert({
        date: data.date,
        vehicle: data.vehicle,
        employee: data.employee,
        odometer: data.odometer,
        distance: data.distance,
        liters: data.liters,
        amount: data.amount,
        price_per_l: data.pricePerL,
        kmpl: data.kmpl,
        station: data.station || '',
      })

    if (dbError) throw dbError

    // 2. Google Apps Script にも転送（スプレッドシート更新）
    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch (gasErr) {
        console.error('GAS forwarding failed:', gasErr)
      }
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
