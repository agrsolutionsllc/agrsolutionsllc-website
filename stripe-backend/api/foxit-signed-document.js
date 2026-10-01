const FOXIT_BASE='https://na1.fusion.foxit.com';

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','https://agrsolutionsllc.com');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
async function foxitToken(){
  const clientId=process.env.FOXIT_CLIENT_ID||'';
  const clientSecret=process.env.FOXIT_CLIENT_SECRET||'';
  if(!clientId||!clientSecret) throw new Error('Foxit is not configured on the server.');
  const body=new URLSearchParams({
    grant_type:'client_credentials',
    client_id:clientId,
    client_secret:clientSecret
  });
  const r=await fetch(FOXIT_BASE+'/oauth/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},
    body:body.toString()
  });
  const raw=await r.text();
  let data; try{data=JSON.parse(raw);}catch{data={raw};}
  if(!r.ok||!data.access_token) throw new Error(data?.error_description||data?.error||data?.message||('Foxit OAuth error '+r.status));
  return data.access_token;
}
export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='GET' && req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const folderId=String(req.method==='GET' ? (req.query?.folderId||'') : (req.body?.folderId||'')).trim();
    if(!folderId) return res.status(400).json({error:'Missing Foxit folder ID.'});
    const token=await foxitToken();
    const url=new URL(FOXIT_BASE+'/esign/api/v1/folders/document/download');
    url.searchParams.set('folderId',folderId);
    url.searchParams.set('docNumber','1');
    const r=await fetch(url,{headers:{'Authorization':'Bearer '+token,'Accept':'application/pdf'}});
    if(!r.ok){
      const raw=await r.text();
      return res.status(r.status).json({error:raw||('Foxit document download error '+r.status)});
    }
    const buffer=Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inline; filename="AGR-Signed-Service-Agreement.pdf"');
    res.setHeader('Content-Length',String(buffer.length));
    res.setHeader('Cache-Control','private, no-store');
    return res.status(200).send(buffer);
  }catch(err){
    return res.status(500).json({error:err?.message||'Unexpected Foxit error'});
  }
}
