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
    const { imageBase64, imageType } = req.body;
    const type = imageType || 'receipt';

    if (!imageBase64) {
      return res.status(400).json({ error: '画像データがありません' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = type === 'meter'
      ? `この車のメーターパネル画像から、以下の数値を抽出してください。

抽出ルール:
- "ODO" または累計走行距離(通常5桁以上の大きな数字、リセット不可): odometer
- "trip A" または "TRIP A" と表示された区間距離(小数点あり、リセット可能): tripA
- "trip B" または "TRIP B" と表示された区間距離(小数点あり、リセット可能): tripB
- 数値のみ(単位km除く)
- 見つからない項目は null
- JSON以外の説明文は不要

出力形式(JSONのみ):
{
  "odometer": 累計走行距離(整数),
  "tripA": トリップA距離(小数可),
  "tripB": トリップB距離(小数可)
}`
      : `このガソリン給油レシート画像から以下の情報を抽出してJSONで返してください。

抽出ルール:
- 給油量(リットル数値): liters
- 単価(円/L数値): unitPrice
- 合計金額(円数値): totalAmount
- 給油所名: stationName
  → ブランド名(ENEOS, apollo station等)ではなく、具体的な店舗名+地名を優先
  → 例: "カーピット八橋サービスステーション", "コスモ石油 秋田中央SS"
  → レシート上部または発行店情報欄に記載されることが多い
  → 店舗名が読み取れない場合のみブランド名を記載
- 給油日時: "YYYY-MM-DDTHH:MM" 形式
- 読み取れない項目は null
- JSON以外の説明文は不要

出力形式(JSONのみ):
{
  "liters": 給油量(数値),
  "unitPrice": 単価(数値),
  "totalAmount": 合計金額(数値),
  "stationName": "店舗フルネーム(地名付き)",
  "datetime": "YYYY-MM-DDTHH:MM"
}`;

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
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.content[0].text.trim();
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
