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
  const response=await fetch(FOXIT_BASE+'/oauth/token',{
    method:'POST',
    headers:{
      'Content-Type':'application/x-www-form-urlencoded',
      'Accept':'application/json'
    },
    body:body.toString()
  });
  const raw=await response.text();
  let data;
  try{data=JSON.parse(raw);}catch{data={raw};}
  if(!response.ok||!data.access_token){
    throw new Error(data?.error_description||data?.error||data?.message||('Foxit OAuth error '+response.status));
  }
  return data.access_token;
}

function splitName(name=''){
  const parts=String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName:parts.shift()||'Client',
    lastName:parts.join(' ')||'Signer'
  };
}

function foxitErrorMessage(data,status){
  if(!data) return 'Foxit eSign error '+status;
  if(typeof data==='string') return data;
  return data.message||data.error_description||data.error||data.result||
    (data.errors?JSON.stringify(data.errors):'Foxit eSign error '+status);
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  try{
    const {pdfBase64,clientName,clientEmail,caseId,service,invoiceNumber,pageCount,signaturePage}=req.body||{};
    if(!pdfBase64||!clientEmail) return res.status(400).json({error:'Missing PDF or client email.'});
    if(!/^\S+@\S+\.\S+$/.test(String(clientEmail))){
      return res.status(400).json({error:'Invalid client email.'});
    }

    const token=await foxitToken();
    const {firstName,lastName}=splitName(clientName);
    const finalPage=Math.max(1,Number(signaturePage)||Number(pageCount)||1);

    const payload={
      folderName:(invoiceNumber||('AGR-'+caseId))+' - '+(service||'Immigration Service Agreement'),
      inputType:'base64',
      fileNames:[(invoiceNumber||('AGR-'+caseId))+'-Service-Agreement.pdf'],
      base64FileString:[String(pdfBase64).replace(/^data:application\/pdf;base64,/, '')],
      processTextTags:false,
      processAcroFields:false,
      createEmbeddedSigningSession:false,
      sendNow:true,
      parties:[{
        firstName,
        lastName,
        emailId:String(clientEmail),
        permission:'FILL_FIELDS_AND_SIGN',
        sequence:1,
        allowNameChange:'false'
      }],
      fields:[
        {
          type:'signature',
          x:58,y:242,width:220,height:54,
          documentNumber:1,pageNumber:finalPage,
          tabOrder:1,party:1,required:true,
          name:'Client Signature',
          tooltip:'Firma del cliente'
        },
        {
          type:'date',
          x:58,y:382,width:104,height:18,
          documentNumber:1,pageNumber:finalPage,
          tabOrder:2,party:1,required:true,
          name:'Client Date Signed',
          tooltip:'Fecha de firma del cliente',
          dateFormat:'MM/DD/YYYY'
        }
      ]
    };

    const response=await fetch(FOXIT_BASE+'/esign/api/v1/folders/createfolder',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+token,
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      body:JSON.stringify(payload)
    });

    const raw=await response.text();
    let data;
    try{data=JSON.parse(raw);}catch{data=raw;}

    if(!response.ok){
      return res.status(response.status).json({
        error:foxitErrorMessage(data,response.status),
        foxitStatus:response.status
      });
    }

    const folder=(data&&typeof data==='object'&&data.folder)||{};
    const folderId=folder.folderId||null;
    const folderStatus=folder.folderStatus||'SENT';

    if(!folderId){
      return res.status(502).json({
        error:'Foxit procesó la solicitud pero no devolvió el identificador del sobre.'
      });
    }

    return res.status(200).json({
      folderId,
      status:folderStatus,
      result:'sent'
    });
  }catch(err){
    return res.status(500).json({error:err?.message||'Unexpected Foxit error'});
  }
}
