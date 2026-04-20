export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employees } = req.body;
    if (!Array.isArray(employees)) throw new Error('employees配列が必要です');

    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) {
      return res.status(200).json({ success: true, skipped: true });
    }

    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncEmployees',
        data: employees,
      }),
    });
    const json = await gasRes.json();
    return res.status(200).json({ success: true, gas: json });
  } catch (error) {
    console.error('sync-employees error:', error);
    return res.status(500).json({ error: error.message });
  }
}
