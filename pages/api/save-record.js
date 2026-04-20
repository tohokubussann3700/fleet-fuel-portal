import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // 1. Supabaseに保存
    const { data: saved, error: dbError } = await supabaseAdmin
      .from('fuel_records')
      .insert({
        vehicle_id: data.vehicle_id,
        employee_id: data.employee_id,
        driver_name: data.driver_name,
        department: data.department,
        datetime: data.datetime,
        liters: data.liters,
        unit_price: data.unit_price,
        total_amount: data.total_amount,
        odometer: data.odometer,
        distance: data.distance,
        mileage: data.mileage,
        station_name: data.station_name,
        memo: data.memo,
        receipt_image: data.receipt_image,
        meter_image: data.meter_image,
      })
      .select()
      .single();

    if (dbError) throw new Error(`DB保存エラー: ${dbError.message}`);

    // 2. 車両情報を取得
    const { data: vehicle } = await supabaseAdmin
      .from('vehicles')
      .select('name, plate_number')
      .eq('id', data.vehicle_id)
      .single();

    // 3. GAS経由でSpreadsheetに追記(非同期、エラーは無視)
    const gasUrl = process.env.GAS_URL;
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append',
            data: {
              id: saved.id,
              datetime: data.datetime,
              driver_name: data.driver_name,
              department: data.department,
              vehicle_name: vehicle?.name || '',
              plate_number: vehicle?.plate_number || '',
              liters: data.liters,
              unit_price: data.unit_price,
              total_amount: data.total_amount,
              odometer: data.odometer,
              distance: data.distance,
              mileage: data.mileage,
              station_name: data.station_name,
              memo: data.memo,
              receipt_image_url: '',
              meter_image_url: '',
            },
          }),
        });
      } catch (gasErr) {
        console.warn('GAS sync failed:', gasErr.message);
      }
    }

    return res.status(200).json({ success: true, record: saved });
  } catch (error) {
    console.error('save-record error:', error);
    return res.status(500).json({ error: error.message });
  }
}
