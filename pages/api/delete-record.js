import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;
    if (!id) throw new Error('レコードIDが必要です');

    // Supabaseから削除
    const { error: dbError } = await supabaseAdmin
      .from('fuel_records')
      .delete()
      .eq('id', id);

    if (dbError) throw new Error(`DB削除エラー: ${dbError.message}`);

    // GAS経由でSpreadsheetからも削除
    const gasUrl = process.env.GAS_URL;
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            data: { id },
          }),
        });
      } catch (gasErr) {
        console.warn('GAS sync failed:', gasErr.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('delete-record error:', error);
    return res.status(500).json({ error: error.message });
  }
}
