// AGR CRM · Final invoice PDF capture fix
// Keeps the automatic email flow intact while rendering the invoice in the main document
// so html2pdf/html2canvas preserves grid, spacing, borders and alignment.

// Keep the invoice logo at its current size, but prevent the agency contact lines
// from overlapping the lower portion of the logo in the CRM invoice/receipt view.
const agrOriginalPaymentDocumentHTML=paymentDocumentHTML;
paymentDocumentHTML=function(k,p,options={}){
  return agrOriginalPaymentDocumentHTML(k,p,options)
    .replace('.brand-copy{margin-top:-72px}', '.brand-copy{margin-top:-34px}');
};

async function finalInvoicePdfBase64(k,p){
  if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');

  const parser=new DOMParser();
  const parsed=parser.parseFromString(paymentDocumentHTML(k,p,{finalInvoice:true}),'text/html');
  const sourceSheet=parsed.querySelector('.sheet');
  if(!sourceSheet) throw new Error('No se pudo preparar la factura para PDF.');

  const host=document.createElement('div');
  host.className='agr-invoice-pdf-capture';
  host.style.cssText='position:fixed;left:-10000px;top:0;width:816px;background:#fff;z-index:-1;opacity:1;pointer-events:none;';

  const style=document.createElement('style');
  style.textContent=`
    .agr-invoice-pdf-capture, .agr-invoice-pdf-capture *{box-sizing:border-box}
    .agr-invoice-pdf-capture{font-family:Arial,Helvetica,sans-serif;color:#10264a;background:#fff}
    .agr-invoice-pdf-capture .sheet{width:816px;max-width:none;margin:0;background:#fff;padding:44px 48px 46px}
    .agr-invoice-pdf-capture .top{display:grid!important;grid-template-columns:minmax(0,1fr) 245px!important;align-items:start!important;column-gap:34px!important;border-bottom:2px solid #d9b45b!important;padding-bottom:24px!important}
    .agr-invoice-pdf-capture .brand{display:block!important;min-width:0!important}
    .agr-invoice-pdf-capture .brand-logo{display:block!important;width:205px!important;height:auto!important;max-width:205px!important;margin:0!important;object-fit:contain!important;border-radius:8px!important}
    .agr-invoice-pdf-capture .brand-copy{display:block!important;margin-top:-34px!important;padding-left:0!important}
    .agr-invoice-pdf-capture .brand-copy p{display:block!important;margin:4px 0!important;color:#5d687b!important;font-size:13px!important;line-height:1.35!important}
    .agr-invoice-pdf-capture .doc{display:block!important;text-align:right!important;padding-top:4px!important;min-width:0!important}
    .agr-invoice-pdf-capture .doc h2{margin:0 0 8px!important;font-size:25px!important;line-height:1.15!important;letter-spacing:.01em!important;color:#10264a!important}
    .agr-invoice-pdf-capture .doc>div{font-size:14px!important;margin-top:3px!important}
    .agr-invoice-pdf-capture .paid{display:inline-block!important;margin-top:10px!important;padding:6px 11px!important;border:1px solid #1d7a56!important;border-radius:999px!important;color:#1d7a56!important;font-size:12px!important;font-weight:700!important}
    .agr-invoice-pdf-capture .grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:18px!important;margin:27px 0 22px!important}
    .agr-invoice-pdf-capture .box{display:block!important;min-height:88px!important;padding:16px 18px!important;border:1px solid #e3e7ee!important;border-radius:12px!important;background:#fff!important;font-size:13px!important;line-height:1.55!important}
    .agr-invoice-pdf-capture .box span{display:block!important;color:#6b768a!important;font-size:11px!important;text-transform:uppercase!important;letter-spacing:.08em!important;margin:0 0 6px!important}
    .agr-invoice-pdf-capture .box strong{display:inline!important;font-size:17px!important;line-height:1.35!important;color:#10264a!important}
    .agr-invoice-pdf-capture table{display:table!important;width:100%!important;border-collapse:collapse!important;border-spacing:0!important;margin:22px 0 24px!important;font-size:13px!important}
    .agr-invoice-pdf-capture thead{display:table-header-group!important}
    .agr-invoice-pdf-capture tbody{display:table-row-group!important}
    .agr-invoice-pdf-capture tr{display:table-row!important}
    .agr-invoice-pdf-capture th,.agr-invoice-pdf-capture td{display:table-cell!important;text-align:left!important;padding:12px 14px!important;border-bottom:1px solid #e3e7ee!important;vertical-align:middle!important;white-space:normal!important}
    .agr-invoice-pdf-capture th{font-size:11px!important;text-transform:uppercase!important;letter-spacing:.04em!important;color:#6b768a!important;font-weight:700!important;background:#fafbfc!important}
    .agr-invoice-pdf-capture th:last-child,.agr-invoice-pdf-capture td:last-child{text-align:right!important}
    .agr-invoice-pdf-capture .totals{display:block!important;width:355px!important;max-width:355px!important;margin:18px 0 0 auto!important;padding:0!important}
    .agr-invoice-pdf-capture .totals>div{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;column-gap:34px!important;align-items:center!important;padding:8px 2px!important;font-size:13px!important}
    .agr-invoice-pdf-capture .totals>div span{display:block!important;padding-right:12px!important;white-space:nowrap!important}
    .agr-invoice-pdf-capture .totals>div strong{display:block!important;min-width:92px!important;text-align:right!important;white-space:nowrap!important;font-size:14px!important;color:#10264a!important}
    .agr-invoice-pdf-capture .totals .grand{border-top:2px solid #10264a!important;margin-top:7px!important;padding-top:12px!important;font-size:17px!important;font-weight:700!important}
    .agr-invoice-pdf-capture .totals .grand strong{font-size:17px!important}
    .agr-invoice-pdf-capture .footer{display:block!important;margin-top:38px!important;padding-top:18px!important;border-top:1px solid #e3e7ee!important;color:#6b768a!important;font-size:12px!important;line-height:1.65!important}
  `;

  const sheet=sourceSheet.cloneNode(true);
  host.appendChild(sheet);
  document.head.appendChild(style);
  document.body.appendChild(host);

  try{
    const imgs=[...sheet.querySelectorAll('img')];
    await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve;})));
    if(document.fonts?.ready) await document.fonts.ready.catch(()=>{});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

    const dataUri=await html2pdf().set({
      margin:0,
      filename:(k.invoiceNumber||('AGR-'+k.id))+'-Factura-Final.pdf',
      image:{type:'jpeg',quality:0.99},
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
