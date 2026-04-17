import Anthropic from '@anthropic-ai/sdk';

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
    const { imageBase64, mediaType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '画像データがありません' });
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `あなたはガソリンスタンドのレシートを解析する専門家です。
画像から以下の6項目を読み取り、純粋なJSONのみで返してください。
マークダウンのコードブロックや説明文は一切不要です。

読み取り項目:
- liters: 給油量(L) 数値のみ
- price_per_liter: 単価(円/L) 数値のみ
- total_amount: 合計金額(円) 数値のみ
- odometer: 走行距離/オドメーター(km) 数値のみ、レシートに無ければ null
- refueled_at: 給油日時 ISO 8601形式の文字列(例 "2026-04-17T14:30:00+09:00")、時刻不明なら日付のみ
- station_name: 給油所名 文字列

読み取れない項目は null にしてください。推測はせず、読み取れた値のみ返します。
レシートが不鮮明で全く読み取れない場合は、すべて null にしてください。

出力フォーマット(この形式のJSONだけを返す):
{"liters": 35.42, "price_per_liter": 172.5, "total_amount": 6111, "odometer": null, "refueled_at": "2026-04-17T14:30:00+09:00", "station_name": "ENEOS 秋田中央SS"}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const rawText = textBlock ? textBlock.text : '';

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('AI応答のJSON解析に失敗: ' + rawText.slice(0, 200));
      }
    }

    return res.status(200).json({ success: true, data: parsed });
  } catch (err) {
    console.error('analyze-receipt error:', err);
    return res
      .status(500)
      .json({ error: err.message || 'AI解析でエラーが発生しました' });
  }
}
