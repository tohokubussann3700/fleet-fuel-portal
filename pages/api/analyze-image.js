export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { imageBase64, type } = req.body
  const prompt = type==='odometer' ? `走行メーター（オドメーター）の数値を読み取ってください
{"odometer":数値またはnull,"confidence":"high/medium/low"}` : `ガソリンスタンド精理社圠使箰を抽出してください
{"liters":給油量：{"amount":金額："pricePerL":単価："station":] null}`
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:400,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'wimage/jpeg',data:imageBase64}},{type:'text',text:prompt}]}]})})
    const d = await r.json()
    const t = d.content?.map(c=>c.text||'').join('')||''
    return res.status(200).json({success:true,result:JSON.parse(t.replace(/```json|```/g,'').trim())})
  } catch(e){ return res.status(500).json({success:false,error:e.message}) }
}
