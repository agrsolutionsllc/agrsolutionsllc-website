const ALLOWED_ORIGIN='https://agrsolutionsllc.com';

function cors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

function isEmail(value=''){
  return /^\S+@\S+\.\S+$/.test(String(value).trim());
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  try{
    const apiKey=process.env.RESEND_API_KEY||'';
    const fromEmail=process.env.INVOICE_FROM_EMAIL||'';
    if(!apiKey||!fromEmail){
      return res.status(503).json({
        error:'El envío automático de correo todavía no está configurado en el servidor.'
      });
    }

    const {to,clientName,invoiceNumber,service,pdfBase64}=req.body||{};
    if(!isEmail(to)) return res.status(400).json({error:'El cliente no tiene un correo válido.'});
    if(!pdfBase64) return res.status(400).json({error:'Falta el PDF de la factura.'});

    const cleanPdf=String(pdfBase64).replace(/^data:application\/pdf;base64,/, '');
    const safeInvoice=String(invoiceNumber||'AGR-Invoice').replace(/[^A-Za-z0-9_-]/g,'-');
    const subject='Factura final · '+(invoiceNumber||'AGR Solutions LLC');
    const firstName=String(clientName||'').trim()||'cliente';
    const html=
      '<p>Hola '+firstName.replace(/[<>&]/g,'')+',</p>'+
      '<p>Adjuntamos su factura final correspondiente a '+String(service||'su servicio').replace(/[<>&]/g,'')+'.</p>'+
      '<p><strong>Referencia:</strong> '+String(invoiceNumber||'').replace(/[<>&]/g,'')+'</p>'+
      '<p>Gracias por confiar en AGR Solutions LLC.</p>'+
      '<p>203-824-0351<br><a href="https://agrsolutionsllc.com">agrsolutionsllc.com</a></p>';

    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+apiKey,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        from:fromEmail,
        to:[String(to).trim()],
        subject,
        html,
        attachments:[{
          filename:safeInvoice+'-Factura-Final.pdf',
          content:cleanPdf
        }]
      })
    });

    const raw=await response.text();
    let data;
    try{data=JSON.parse(raw);}catch{data={raw};}
    if(!response.ok){
      return res.status(response.status).json({
        error:data?.message||data?.error||('No se pudo enviar el correo. Código '+response.status)
      });
    }

    return res.status(200).json({sent:true,id:data?.id||null});
  }catch(err){
    return res.status(500).json({error:err?.message||'Error inesperado al enviar la factura.'});
  }
}
