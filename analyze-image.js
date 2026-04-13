export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, type } = req.body // type: 'odometer' | 'receipt'

  const prompt = type === 'odometer'
    ? `走行メーター（オドメーター）の数値を読み取ってください。JSONのみで返してください:
{"odometer":数値またはnull,"confidence":"high/medium/low"}`
    : `ガソリンスタンドのレシートから情報を抽出してください。JSONのみで返してください:
{"liters":給油量またはnull,"amount":合計金額またはnull,"pricePerL":単価またはnull,"station":スタンド名またはnull}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.map(c => c.text || '').join('') || ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    return res.status(200).json({ success: true, result: parsed })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
