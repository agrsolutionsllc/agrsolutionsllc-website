// AGR CRM · Invoice display + emailed PDF fixes
// 1) CRM invoice/receipt: keep approved logo size and place contact details below it.
// 2) Emailed final invoice PDF: render logo as a fixed background block so html2pdf
//    cannot expand the source image to a full page.

function agrCorrectInvoiceHTML(html){
  return String(html||'')
    .replace(/\.brand-copy\{margin-top:-\d+px\}/,'.brand-copy{margin-top:10px}')
    .replace(/\.brand-copy\{margin-top:\s*-\d+px\}/,'.brand-copy{margin-top:10px}');
}

// Intercept the CRM document button in capture phase so the corrected version opens
// instead of the original document window. This avoids depending on global-function reassignment.
document.addEventListener('click',function(e){
  const btn=e.target.closest?.('.payment-doc-btn');
  if(!btn) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  try{
    const p=data.payments.find(x=>String(x.id)===String(btn.dataset.paymentDoc));
    if(!p) return;
    const k=caseById(p.caseId);
    if(!k) return;
    const finalInvoice=btn.dataset.final==='1';
    const w=window.open('','_blank');
    if(!w){alert('Permite ventanas emergentes para abrir el documento.');return;}
    try{w.opener=null;}catch(_){}
    w.document.open();
    w.document.write(agrCorrectInvoiceHTML(paymentDocumentHTML(k,p,{finalInvoice})));
    w.document.close();
  }catch(err){
    console.error('AGR invoice open fix:',err);
  }
},true);

async function finalInvoicePdfBase64(k,p){
  if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');

  const parser=new DOMParser();
  const parsed=parser.parseFromString(agrCorrectInvoiceHTML(paymentDocumentHTML(k,p,{finalInvoice:true})),'text/html');
  const sourceSheet=parsed.querySelector('.sheet');
  if(!sourceSheet) throw new Error('No se pudo preparar la factura para PDF.');

  // Replace the real <img> with a fixed-size background box. html2pdf/html2canvas
  // sometimes uses an external image's intrinsic size during pagination, which was
  // making the logo occupy an entire first page.
  const sourceLogo=sourceSheet.querySelector('.brand-logo');
  if(sourceLogo){
    const logoBox=parsed.createElement('div');
    logoBox.className='brand-logo-fixed';
    logoBox.setAttribute('aria-label','AGR Solutions LLC');
    sourceLogo.replaceWith(logoBox);
  }

  const host=document.createElement('div');
  host.className='agr-invoice-pdf-capture';
  host.style.cssText='position:fixed;left:-10000px;top:0;width:816px;background:#fff;z-index:-1;opacity:1;pointer-events:none;';

  const style=document.createElement('style');
  style.textContent=`
    .agr-invoice-pdf-capture, .agr-invoice-pdf-capture *{box-sizing:border-box}
    .agr-invoice-pdf-capture{font-family:Arial,Helvetica,sans-serif;color:#10264a;background:#fff}
    .agr-invoice-pdf-capture .sheet{width:816px;max-width:none;margin:0;background:#fff;padding:38px 48px 42px}
    .agr-invoice-pdf-capture .top{display:grid!important;grid-template-columns:minmax(0,1fr) 245px!important;align-items:start!important;column-gap:34px!important;border-bottom:2px solid #d9b45b!important;padding-bottom:22px!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture .brand{display:block!important;min-width:0!important}
    .agr-invoice-pdf-capture .brand-logo-fixed{display:block!important;width:210px!important;height:132px!important;max-width:210px!important;margin:0!important;background-image:url('https://agrsolutionsllc.com/logo-agr.jpeg.jpeg')!important;background-repeat:no-repeat!important;background-position:left center!important;background-size:contain!important;border-radius:8px!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture .brand-copy{display:block!important;margin-top:10px!important;padding-left:0!important}
    .agr-invoice-pdf-capture .brand-copy p{display:block!important;margin:4px 0!important;color:#5d687b!important;font-size:13px!important;line-height:1.35!important}
    .agr-invoice-pdf-capture .doc{display:block!important;text-align:right!important;padding-top:4px!important;min-width:0!important}
    .agr-invoice-pdf-capture .doc h2{margin:0 0 8px!important;font-size:25px!important;line-height:1.15!important;letter-spacing:.01em!important;color:#10264a!important}
    .agr-invoice-pdf-capture .doc>div{font-size:14px!important;margin-top:3px!important}
    .agr-invoice-pdf-capture .paid{display:inline-block!important;margin-top:10px!important;padding:6px 11px!important;border:1px solid #1d7a56!important;border-radius:999px!important;color:#1d7a56!important;font-size:12px!important;font-weight:700!important}
    .agr-invoice-pdf-capture .grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px!important;margin:25px 0 20px!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture .box{display:block!important;min-height:84px!important;padding:15px 18px!important;border:1px solid #e3e7ee!important;border-radius:12px!important;background:#fff!important;font-size:13px!important;line-height:1.5!important}
    .agr-invoice-pdf-capture .box span{display:block!important;color:#6b768a!important;font-size:11px!important;text-transform:uppercase!important;letter-spacing:.08em!important;margin:0 0 6px!important}
    .agr-invoice-pdf-capture .box strong{display:inline!important;font-size:17px!important;line-height:1.35!important;color:#10264a!important}
    .agr-invoice-pdf-capture table{display:table!important;width:100%!important;border-collapse:collapse!important;border-spacing:0!important;margin:20px 0 22px!important;font-size:13px!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture thead{display:table-header-group!important}
    .agr-invoice-pdf-capture tbody{display:table-row-group!important}
    .agr-invoice-pdf-capture tr{display:table-row!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture th,.agr-invoice-pdf-capture td{display:table-cell!important;text-align:left!important;padding:11px 14px!important;border-bottom:1px solid #e3e7ee!important;vertical-align:middle!important;white-space:normal!important}
    .agr-invoice-pdf-capture th{font-size:11px!important;text-transform:uppercase!important;letter-spacing:.04em!important;color:#6b768a!important;font-weight:700!important;background:#fafbfc!important}
    .agr-invoice-pdf-capture th:last-child,.agr-invoice-pdf-capture td:last-child{text-align:right!important}
    .agr-invoice-pdf-capture .totals{display:block!important;width:355px!important;max-width:355px!important;margin:16px 0 0 auto!important;padding:0!important;break-inside:avoid!important;page-break-inside:avoid!important}
    .agr-invoice-pdf-capture .totals>div{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;column-gap:34px!important;align-items:center!important;padding:7px 2px!important;font-size:13px!important}
    .agr-invoice-pdf-capture .totals>div span{display:block!important;padding-right:12px!important;white-space:nowrap!important}
    .agr-invoice-pdf-capture .totals>div strong{display:block!important;min-width:92px!important;text-align:right!important;white-space:nowrap!important;font-size:14px!important;color:#10264a!important}
    .agr-invoice-pdf-capture .totals .grand{border-top:2px solid #10264a!important;margin-top:7px!important;padding-top:11px!important;font-size:17px!important;font-weight:700!important}
    .agr-invoice-pdf-capture .totals .grand strong{font-size:17px!important}
    .agr-invoice-pdf-capture .footer{display:block!important;margin-top:30px!important;padding-top:16px!important;border-top:1px solid #e3e7ee!important;color:#6b768a!important;font-size:12px!important;line-height:1.55!important;break-inside:avoid!important;page-break-inside:avoid!important}
  `;

  const sheet=sourceSheet.cloneNode(true);
  host.appendChild(sheet);
  document.head.appendChild(style);
  document.body.appendChild(host);

  try{
    // Give the background image time to resolve before capture.
    const preload=new Image();
    preload.crossOrigin='anonymous';
    preload.src='https://agrsolutionsllc.com/logo-agr.jpeg.jpeg';
    await new Promise(resolve=>{if(preload.complete) resolve(); else {preload.onload=resolve;preload.onerror=resolve;}});
    if(document.fonts?.ready) await document.fonts.ready.catch(()=>{});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

    const dataUri=await html2pdf().set({
      margin:0,
      filename:(k.invoiceNumber||('AGR-'+k.id))+'-Factura-Final.pdf',
      image:{type:'jpeg',quality:0.99},
      pagebreak:{mode:['avoid-all','css','legacy']},
      html2canvas:{
        scale:2,
        useCORS:true,
        allowTaint:false,
        backgroundColor:'#ffffff',
        logging:false,
        scrollX:0,
        scrollY:0,
        windowWidth:816
      },
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'}
    }).from(sheet).outputPdf('datauristring');

    return String(dataUri).split(',').pop();
  }finally{
    host.remove();
    style.remove();
  }
}
