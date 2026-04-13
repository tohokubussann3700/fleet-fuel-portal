import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY)
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
  try{
    let q=supabase.from('fuel_records').select('*').order('date',{ascending:false})
    if(req.query.vehicle)q=q.eq('vehicle',req.query.vehicle)
    const {data,error}=await q.limit(200)
    if(error)throw error
    return res.status(200).json({success:true,records:data})
  }catch(e){return res.status(500).json({success:false,error:e.message})}
}
