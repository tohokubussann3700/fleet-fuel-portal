import { createClient } from '@supabase/supabase-js';

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
    const {
      vehicleId,
      vehicleName,
      plateNumber,
      driver,
      department,
      refueledAt,
      liters,
      pricePerLiter,
      totalAmount,
      odometer,
      stationName,
      note,
      imageBase64,
      imageMediaType,
    } = req.body;

    if (!vehicleId || !driver || !liters || !totalAmount) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let driveImageUrl = null;
    const gasUrl = process.env.GAS_URL;

    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver,
            department: department || '',
            vehicleName: vehicleName || '',
            plateNumber: plateNumber || '',
            refueledAt: refueledAt || '',
            liters,
            pricePerLiter: pricePerLiter ?? '',
            totalAmount,
            odometer: odometer ?? '',
            stationName: stationName || '',
            note: note || '',
            imageBase64: imageBase64 || '',
            imageMediaType: imageMediaType || 'image/jpeg',
          }),
        });
        const gasJson = await gasRes.json();
        if (gasJson.success && gasJson.imageUrl) {
          driveImageUrl = gasJson.imageUrl;
        }
      } catch (gasErr) {
        console.error('GAS error (continuing):', gasErr);
      }
    }

    const payload = {
      vehicle_id: vehicleId,
      driver_name: driver,
      department: department || null,
      refueled_at: refueledAt
        ? new Date(refueledAt).toISOString()
        : new Date().toISOString(),
      liters: Number(liters),
      price_per_liter: pricePerLiter ? Number(pricePerLiter) : null,
      total_amount: Number(totalAmount),
      odometer: odometer ? Number(odometer) : null,
      station_name: stationName || null,
      photo_url: driveImageUrl,
      note: note || null,
    };

    const { error } = await supabase.from('fuel_records').insert(payload);
    if (error) throw error;

    return res.status(200).json({
      success: true,
      imageUrl: driveImageUrl,
    });
  } catch (err) {
    console.error('save-record error:', err);
    return res
      .status(500)
      .json({ error: err.message || '保存に失敗しました' });
  }
}
