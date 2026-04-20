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
    const { id, ...updateFields } = data;
    const gasUrl = process.env.GAS_URL;

    if (!id) throw new Error('レコードIDが必要です');

    // レシート画像が新規Base64ならGAS経由でDriveに保存
    if (updateFields.receipt_image && updateFields.receipt_image.startsWith('data:') && gasUrl) {
      try {
        const uploadRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadReceipt',
            data: {
              imageBase64: updateFields.receipt_image,
              datetime: updateFields.datetime,
              driver_name: updateFields.driver_name,
            },
          }),
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.result?.url) {
          updateFields.receipt_image = uploadJson.result.url;
        }
      } catch (uploadErr) {
        console.warn('Receipt upload failed:', uploadErr.message);
      }
    }

    // 1. Supabase更新
    const { data: updated, error: dbError } = await supabaseAdmin
      .from('fuel_records')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (dbError) throw new Error(`DB更新エラー: ${dbError.message}`);

    // 2. 車両情報取得
    const { data: vehicle } = await supabaseAdmin
      .from('vehicles')
      .select('name, plate_number')
      .eq('id', updated.vehicle_id)
      .single();

    // 3. GAS経由でSpreadsheet更新
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            data: {
              id: updated.id,
              datetime: updated.datetime,
              driver_name: updated.driver_name,
              department: updated.department,
              vehicle_name: vehicle?.name || '',
              plate_number: vehicle?.plate_number || '',
              liters: updated.liters,
              unit_price: updated.unit_price,
              total_amount: updated.total_amount,
              odometer: updated.odometer,
              distance: updated.distance,
              mileage: updated.mileage,
              station_name: updated.station_name,
              memo: updated.memo,
              receipt_image_url: updated.receipt_image || '',
              meter_image_url: '',
            },
          }),
        });
      } catch (gasErr) {
        console.warn('GAS sync failed:', gasErr.message);
      }
    }

    return res.status(200).json({ success: true, record: updated });
  } catch (error) {
    console.error('update-record error:', error);
    return res.status(500).json({ error: error.message });
  }
}
