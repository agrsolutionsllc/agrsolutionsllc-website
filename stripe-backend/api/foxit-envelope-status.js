const FOXIT_BASE='https://na1.fusion.foxit.com';

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','https://agrsolutionsllc.com');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
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
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'Accept':'application/json'
    },
    body:body.toString()
  });
  const raw=await r.text();
  let data;
  try{data=JSON.parse(raw);}catch{data={raw};}
  if(!r.ok||!data.access_token){
    throw new Error(data?.error_description||data?.error||data?.message||('Foxit OAuth error '+r.status));
  }
  return data.access_token;
}
function foxitErrorMessage(data,status){
  if(!data) return 'Foxit status error '+status;
  if(typeof data==='string') return data;
  return data.message||data.error_description||data.error||data.result||
    (data.errors?JSON.stringify(data.errors):'Foxit status error '+status);
}
export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const folderId=Number(req.body?.folderId||0);
    if(!folderId) return res.status(400).json({error:'Missing Foxit folder ID.'});
    const token=await foxitToken();
    const url=new URL(FOXIT_BASE+'/esign/api/v1/folders/myfolder');
    url.searchParams.set('folderId',String(folderId));
    const r=await fetch(url,{
      headers:{
        'Authorization':'Bearer '+token,
        'Accept':'application/json'
      }
    });
    const raw=await r.text();
    let data;
    try{data=JSON.parse(raw);}catch{data=raw;}
    if(!r.ok){
      return res.status(r.status).json({
        error:foxitErrorMessage(data,r.status),
        foxitStatus:r.status,
        foxitResponse:data
      });
    }
    const folder=data?.folder||{};
    return res.status(200).json({
      folderId:folder.folderId||folderId,
      status:folder.folderStatus||data?.status||data?.result||'UNKNOWN',
      folder
    });
  }catch(err){
    return res.status(500).json({error:err?.message||'Unexpected Foxit error'});
  }
}
