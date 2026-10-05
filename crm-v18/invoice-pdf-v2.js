// AGR CRM · Active invoice renderer fixes
(function(){
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // Fix the ORIGINAL invoice HTML used by the CRM itself.
  // The source template had margin-top:-72px on .brand-copy, which pulled
  // the agency address up over the logo. Keep the approved 210px logo size.
  const originalPaymentDocumentHTML=window.paymentDocumentHTML;
  if(typeof originalPaymentDocumentHTML==='function'){
    const fixedPaymentDocumentHTML=function(k,p,options){
      let html=String(originalPaymentDocumentHTML(k,p,options)||'');
      html=html.replace(/\.brand-copy\{margin-top:\s*-\d+px\}/g,'.brand-copy{margin-top:14px}');
      html=html.replace('</head>',`<style>
        .brand{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:0!important}
        .brand-logo{width:210px!important;height:auto!important;max-width:210px!important;display:block!important;object-fit:contain!important}
        .brand-copy{margin-top:14px!important;display:block!important;position:static!important;transform:none!important}
        .brand-copy p{margin:4px 0!important;line-height:1.25!important}
      </style></head>`);
      return html;
    };
    window.paymentDocumentHTML=fixedPaymentDocumentHTML;
    try{ paymentDocumentHTML=fixedPaymentDocumentHTML; }catch(_){ }
  }

  async function makeLogoCanvas(){
    const canvas=document.createElement('canvas');
    canvas.width=420;
    canvas.height=260;
    canvas.style.width='210px';
    canvas.style.height='130px';
    canvas.style.display='block';
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const img=new Image();
    img.crossOrigin='anonymous';
    img.src='https://agrsolutionsllc.com/logo-agr.jpeg.jpeg?invoice=5';
    await new Promise(resolve=>{if(img.complete) resolve(); else {img.onload=resolve;img.onerror=resolve;}});
    if(img.naturalWidth&&img.naturalHeight){
      const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
      const w=img.naturalWidth*scale;
      const h=img.naturalHeight*scale;
      ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    }
    return canvas;
  }

  // PDF attached to the automatic Resend email.
  window.finalInvoicePdfBase64=async function(k,p){
    if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');

    const client=clientById(k.clientId);
    const rows=casePaymentRowsChronological(k);
    const paidTotal=rows.reduce((s,x)=>s+Number(x.amount||0),0);
    const creditsTotal=rows.reduce((s,x)=>s+Number(x.discountCredit||0),0);
    const docNo=k.invoiceNumber||('AGR-'+k.id);

    const stage=document.createElement('div');
    stage.id='agrInvoicePdfStage';
    // Keep the render target at the document origin. Moving it thousands of
    // pixels off-screen makes html2canvas clip/offset the invoice.
    stage.style.cssText='position:absolute;left:0;top:0;width:720px;background:#fff;z-index:-2147483647;pointer-events:none;';
    stage.innerHTML=`
      <style>
        #agrInvoicePdfStage,#agrInvoicePdfStage *{box-sizing:border-box}
        #agrInvoicePdfStage .invoice-sheet{width:720px;padding:34px 38px 38px;background:#fff;color:#10264a;font-family:Arial,Helvetica,sans-serif}
        #agrInvoicePdfStage .invoice-top{display:flex;justify-content:space-between;align-items:flex-start;gap:30px;padding-bottom:18px;border-bottom:2px solid #d9b45b;page-break-inside:avoid}
        #agrInvoicePdfStage .invoice-brand{width:55%;display:block}
        #agrInvoicePdfStage .invoice-logo-slot{width:210px;height:130px;display:block;margin:0 0 12px;overflow:hidden}
        #agrInvoicePdfStage .invoice-logo-slot canvas{width:210px!important;height:130px!important;display:block!important}
        #agrInvoicePdfStage .invoice-company{font-size:13px;line-height:1.45;color:#59667a}
        #agrInvoicePdfStage .invoice-doc{width:40%;text-align:right;padding-top:4px}
        #agrInvoicePdfStage .invoice-doc h1{margin:0 0 7px;font-size:23px;line-height:1.15;color:#10264a}
        #agrInvoicePdfStage .invoice-doc .number{font-size:14px;margin-bottom:9px}
        #agrInvoicePdfStage .invoice-paid{display:inline-block;padding:6px 10px;border:1px solid #1d7a56;border-radius:999px;color:#1d7a56;font-weight:700;font-size:11px;letter-spacing:.04em}
        #agrInvoicePdfStage .invoice-info{display:flex;gap:16px;margin:22px 0 18px;page-break-inside:avoid}
        #agrInvoicePdfStage .info-box{width:50%;border:1px solid #e1e6ee;border-radius:12px;padding:13px 14px;min-height:78px}
        #agrInvoicePdfStage .info-label{display:block;margin-bottom:5px;color:#6b768a;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        #agrInvoicePdfStage .info-box strong{display:block;font-size:15px;line-height:1.3;margin-bottom:3px;color:#10264a}
        #agrInvoicePdfStage .info-box small{display:block;color:#667287;font-size:11px;line-height:1.35}
        #agrInvoicePdfStage table{width:100%;border-collapse:collapse;margin:2px 0 18px;table-layout:fixed;page-break-inside:avoid}
        #agrInvoicePdfStage th{padding:9px 11px;border-bottom:1px solid #dfe5ee;color:#6b768a;font-size:10px;text-transform:uppercase;letter-spacing:.06em;text-align:left}
        #agrInvoicePdfStage td{padding:10px 11px;border-bottom:1px solid #e6eaf0;color:#10264a;font-size:13px;vertical-align:top}
        #agrInvoicePdfStage th:nth-child(1),#agrInvoicePdfStage td:nth-child(1){width:30%}
        #agrInvoicePdfStage th:nth-child(2),#agrInvoicePdfStage td:nth-child(2){width:40%}
        #agrInvoicePdfStage th:nth-child(3),#agrInvoicePdfStage td:nth-child(3){width:30%;text-align:right}
        #agrInvoicePdfStage .invoice-totals{width:320px;margin-left:auto;margin-top:6px;page-break-inside:avoid}
        #agrInvoicePdfStage .invoice-total-row{display:flex;justify-content:space-between;gap:20px;padding:6px 0;font-size:13px}
        #agrInvoicePdfStage .invoice-total-row span{color:#59667a}
        #agrInvoicePdfStage .invoice-total-row strong{color:#10264a;white-space:nowrap}
        #agrInvoicePdfStage .invoice-total-row.grand{margin-top:4px;padding-top:10px;border-top:2px solid #10264a;font-size:16px}
        #agrInvoicePdfStage .invoice-footer{margin-top:26px;padding-top:14px;border-top:1px solid #e1e6ee;color:#667287;font-size:11px;line-height:1.5;page-break-inside:avoid}
      </style>
      <div class="invoice-sheet">
        <div class="invoice-top">
          <div class="invoice-brand">
            <div class="invoice-logo-slot"></div>
            <div class="invoice-company">294 Tyler Street, East Haven, CT 06512<br>203-824-0351 · agrsolutionsllc.com</div>
          </div>
          <div class="invoice-doc">
            <h1>FACTURA FINAL</h1>
            <div class="number">${safe(docNo)}</div>
            <span class="invoice-paid">PAID IN FULL</span>
          </div>
        </div>
        <div class="invoice-info">
          <div class="info-box"><span class="info-label">Cliente</span><strong>${safe(client?.name||'Cliente')}</strong>${client?.email?`<small>${safe(client.email)}</small>`:''}</div>
          <div class="info-box"><span class="info-label">Servicio</span><strong>${safe(k.service||'Servicio')}</strong><small>Referencia: ${safe(k.invoiceNumber||'—')}</small></div>
        </div>
        <table><thead><tr><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${safe(x.date||'—')}</td><td>${safe(x.method||'—')}</td><td>${money(Number(x.amount||0))}${Number(x.discountCredit||0)>0?`<br><small>+ ${money(Number(x.discountCredit||0))} descuento</small>`:''}</td></tr>`).join('')}</tbody></table>
        <div class="invoice-totals">
          <div class="invoice-total-row"><span>Precio del servicio</span><strong>${money(Number(k.serviceTotal||0))}</strong></div>
          <div class="invoice-total-row"><span>Total recibido</span><strong>${money(paidTotal)}</strong></div>
          ${creditsTotal>0?`<div class="invoice-total-row"><span>Descuento aplicado</span><strong>${money(creditsTotal)}</strong></div>`:''}
          <div class="invoice-total-row grand"><span>Saldo restante</span><strong>${money(0)}</strong></div>
        </div>
        <div class="invoice-footer">Esta factura confirma que el balance correspondiente al servicio indicado ha sido pagado en su totalidad.<br>Gracias por confiar en AGR Solutions LLC.</div>
      </div>`;

    document.body.appendChild(stage);
    try{
      const logoCanvas=await makeLogoCanvas();
      stage.querySelector('.invoice-logo-slot')?.appendChild(logoCanvas);
      if(document.fonts?.ready) await document.fonts.ready.catch(()=>{});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const sheet=stage.querySelector('.invoice-sheet');
      const dataUri=await html2pdf().set({
        margin:[0.18,0.18,0.18,0.18],
        filename:docNo+'-Factura-Final.pdf',
        image:{type:'jpeg',quality:0.98},
        html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:760,scrollX:0,scrollY:0},
        jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
        pagebreak:{mode:['css','legacy']}
      }).from(sheet).outputPdf('datauristring');
      return String(dataUri).split(',').pop();
    }finally{
      stage.remove();
    }
  };
})();
