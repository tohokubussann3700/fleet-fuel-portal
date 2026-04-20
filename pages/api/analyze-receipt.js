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
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '画像データがありません' });
    }

    // Base64ヘッダー除去
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `このガソリン給油レシート画像から以下の情報を抽出してJSONで返してください。読み取れない項目はnullにしてください。説明文は不要で、JSONのみ返してください。

{
  "liters": 給油量(L、数値),
  "unitPrice": 単価(円/L、数値),
  "totalAmount": 合計金額(円、数値),
  "stationName": 給油所名(文字列),
  "datetime": "YYYY-MM-DDTHH:MM" 形式の日時
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].text.trim();
    
    // JSON部分だけ抽出(余計な文字が混入する場合の保険)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AIの応答がJSON形式ではありません', raw: text });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: parsed });

  } catch (error) {
    console.error('AI解析エラー:', error);
    return res.status(500).json({ 
      error: error.message || 'サーバーエラーが発生しました' 
    });
  }
}
