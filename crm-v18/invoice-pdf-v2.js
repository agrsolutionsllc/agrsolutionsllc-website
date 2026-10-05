// Dedicated final-invoice PDF renderer. Keeps PDF generation in the same document
// so html2canvas/html2pdf preserve layout and spacing reliably.
(function(){
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  window.finalInvoicePdfBase64=async function(k,p){
    if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');

    const client=clientById(k.clientId);
    const rows=casePaymentRowsChronological(k);
    const paidTotal=rows.reduce((s,x)=>s+Number(x.amount||0),0);
    const creditsTotal=rows.reduce((s,x)=>s+Number(x.discountCredit||0),0);
    const docNo=k.invoiceNumber||('AGR-'+k.id);

    const stage=document.createElement('div');
    stage.id='agrInvoicePdfStage';
    stage.style.position='fixed';
    stage.style.left='-10000px';
    stage.style.top='0';
    stage.style.width='768px';
    stage.style.background='#fff';
    stage.style.zIndex='-1';

    stage.innerHTML=`
      <style>
        #agrInvoicePdfStage, #agrInvoicePdfStage *{box-sizing:border-box}
        #agrInvoicePdfStage .invoice-sheet{width:768px;min-height:980px;padding:42px 46px;background:#fff;color:#10264a;font-family:Arial,Helvetica,sans-serif}
        #agrInvoicePdfStage .invoice-top{display:flex;justify-content:space-between;align-items:flex-start;gap:34px;padding-bottom:22px;border-bottom:2px solid #d9b45b}
        #agrInvoicePdfStage .invoice-brand{width:56%;display:block}
        #agrInvoicePdfStage .invoice-brand img{display:block;width:175px;height:auto;margin:0 0 8px 0}
        #agrInvoicePdfStage .invoice-company{font-size:14px;line-height:1.45;color:#59667a}
        #agrInvoicePdfStage .invoice-doc{width:40%;text-align:right;padding-top:6px}
        #agrInvoicePdfStage .invoice-doc h1{margin:0 0 8px;font-size:24px;line-height:1.15;color:#10264a}
        #agrInvoicePdfStage .invoice-doc .number{font-size:15px;margin-bottom:10px}
        #agrInvoicePdfStage .invoice-paid{display:inline-block;padding:6px 10px;border:1px solid #1d7a56;border-radius:999px;color:#1d7a56;font-weight:700;font-size:12px;letter-spacing:.04em}
        #agrInvoicePdfStage .invoice-info{display:flex;gap:18px;margin:26px 0 22px}
        #agrInvoicePdfStage .info-box{width:50%;border:1px solid #e1e6ee;border-radius:12px;padding:14px 15px;min-height:86px}
        #agrInvoicePdfStage .info-label{display:block;margin-bottom:6px;color:#6b768a;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        #agrInvoicePdfStage .info-box strong{display:block;font-size:16px;line-height:1.3;margin-bottom:4px;color:#10264a}
        #agrInvoicePdfStage .info-box small{display:block;color:#667287;font-size:12px;line-height:1.35}
        #agrInvoicePdfStage table{width:100%;border-collapse:collapse;margin:4px 0 24px;table-layout:fixed}
        #agrInvoicePdfStage th{padding:10px 12px;border-bottom:1px solid #dfe5ee;color:#6b768a;font-size:11px;text-transform:uppercase;letter-spacing:.06em;text-align:left}
        #agrInvoicePdfStage td{padding:12px;border-bottom:1px solid #e6eaf0;color:#10264a;font-size:14px;vertical-align:top}
        #agrInvoicePdfStage th:nth-child(1), #agrInvoicePdfStage td:nth-child(1){width:30%}
        #agrInvoicePdfStage th:nth-child(2), #agrInvoicePdfStage td:nth-child(2){width:40%}
        #agrInvoicePdfStage th:nth-child(3), #agrInvoicePdfStage td:nth-child(3){width:30%;text-align:right}
        #agrInvoicePdfStage .invoice-totals{width:340px;margin-left:auto;margin-top:8px}
        #agrInvoicePdfStage .invoice-total-row{display:flex;justify-content:space-between;gap:24px;padding:7px 0;font-size:14px}
        #agrInvoicePdfStage .invoice-total-row span{color:#59667a}
        #agrInvoicePdfStage .invoice-total-row strong{color:#10264a;white-space:nowrap}
        #agrInvoicePdfStage .invoice-total-row.grand{margin-top:5px;padding-top:12px;border-top:2px solid #10264a;font-size:17px}
        #agrInvoicePdfStage .invoice-footer{margin-top:36px;padding-top:16px;border-top:1px solid #e1e6ee;color:#667287;font-size:12px;line-height:1.55}
      </style>
      <div class="invoice-sheet">
        <div class="invoice-top">
          <div class="invoice-brand">
            <img src="https://agrsolutionsllc.com/logo-agr.jpeg.jpeg" alt="AGR Solutions LLC">
            <div class="invoice-company">294 Tyler Street, East Haven, CT 06512<br>203-824-0351 · agrsolutionsllc.com</div>
          </div>
          <div class="invoice-doc">
            <h1>FACTURA FINAL</h1>
            <div class="number">${safe(docNo)}</div>
            <span class="invoice-paid">PAID IN FULL</span>
          </div>
        </div>

        <div class="invoice-info">
          <div class="info-box">
            <span class="info-label">Cliente</span>
            <strong>${safe(client?.name||'Cliente')}</strong>
            ${client?.email?`<small>${safe(client.email)}</small>`:''}
          </div>
          <div class="info-box">
            <span class="info-label">Servicio</span>
            <strong>${safe(k.service||'Servicio')}</strong>
            <small>Referencia: ${safe(k.invoiceNumber||'—')}</small>
          </div>
        </div>

        <table>
          <thead><tr><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead>
          <tbody>
            ${rows.map(x=>`<tr><td>${safe(x.date||'—')}</td><td>${safe(x.method||'—')}</td><td>${money(Number(x.amount||0))}${Number(x.discountCredit||0)>0?`<br><small>+ ${money(Number(x.discountCredit||0))} descuento</small>`:''}</td></tr>`).join('')}
          </tbody>
        </table>

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
      const imgs=[...stage.querySelectorAll('img')];
      await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;})));
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const sheet=stage.querySelector('.invoice-sheet');
      const dataUri=await html2pdf().set({
        margin:[0.2,0.2,0.2,0.2],
        filename:docNo+'-Factura-Final.pdf',
        image:{type:'jpeg',quality:0.98},
        html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:900},
        jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
        pagebreak:{mode:['avoid-all','css','legacy']}
      }).from(sheet).outputPdf('datauristring');
      return String(dataUri).split(',').pop();
    }finally{
      stage.remove();
    }
  };
})();
