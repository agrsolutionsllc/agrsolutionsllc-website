// AGR CRM · Active invoice renderer fixes
(function(){
  // Company table: compact global-invoice action and keep folder numbers on one line.
  const companyActionsStyle=document.createElement('style');
  companyActionsStyle.textContent=`
    #view-companies th:first-child,#companiesTable td:first-child{min-width:104px!important;width:104px!important}
    #companiesTable .folder-number-badge{white-space:nowrap!important;min-width:72px!important}
    #companiesTable td:last-child{white-space:nowrap!important;min-width:220px!important}
    #companiesTable td:last-child .client-account-btn,
    #companiesTable td:last-child .delete-icon-btn{display:inline-flex!important;vertical-align:middle;align-items:center;justify-content:center}
    #companiesTable td:last-child .delete-icon-btn{margin-left:8px}
  `;
  document.head.appendChild(companyActionsStyle);

  function shortenCompanyInvoiceLabel(){
    document.querySelectorAll('[data-company-account-id]').forEach(btn=>{
      if(btn.textContent.trim()!=='Factura global') btn.textContent='Factura global';
    });
    const heading=document.querySelector('#view-companies thead th:last-child');
    if(heading && heading.textContent.trim()!=='Factura global') heading.textContent='Factura global';
  }
  shortenCompanyInvoiceLabel();
  const companiesRoot=document.getElementById('view-companies')||document.documentElement;
  new MutationObserver(shortenCompanyInvoiceLabel).observe(companiesRoot,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',shortenCompanyInvoiceLabel);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="companies"]')) setTimeout(shortenCompanyInvoiceLabel,0);
  });

  // Keep the CRM invoice preview fix that already works.
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

  function loadJsPDF(){
    if(window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-agr-jspdf]');
      if(existing){
        const timer=setInterval(()=>{
          if(window.jspdf?.jsPDF){clearInterval(timer);resolve(window.jspdf.jsPDF);}
        },50);
        setTimeout(()=>{clearInterval(timer);reject(new Error('No se pudo cargar jsPDF.'));},8000);
        return;
      }
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.async=true;
      s.dataset.agrJspdf='1';
      s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('jsPDF no disponible.'));
      s.onerror=()=>reject(new Error('No se pudo cargar jsPDF.'));
      document.head.appendChild(s);
    });
  }

  async function logoDataUrl(){
    const canvas=document.createElement('canvas');
    canvas.width=900;
    canvas.height=560;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const img=new Image();
    img.crossOrigin='anonymous';
    img.src='https://agrsolutionsllc.com/logo-agr.jpeg.jpeg?invoice=6';
    await new Promise(resolve=>{
      img.onload=resolve;
      img.onerror=resolve;
      if(img.complete) resolve();
    });
    if(img.naturalWidth&&img.naturalHeight){
      const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
      const w=img.naturalWidth*scale;
      const h=img.naturalHeight*scale;
      ctx.drawImage(img,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    }
    return canvas.toDataURL('image/jpeg',0.94);
  }

  const fmt=n=>typeof money==='function'?money(Number(n||0)):'$'+Number(n||0).toFixed(2);

  window.finalInvoicePdfBase64=async function(k,p){
    const JsPDF=await loadJsPDF();
    const doc=new JsPDF({unit:'pt',format:'letter',orientation:'portrait'});
    const navy=[16,38,74], gray=[93,104,123], light=[225,230,238], gold=[217,180,91], green=[29,122,86];
    const client=clientById(k.clientId);
    const rows=typeof casePaymentRowsChronological==='function'?casePaymentRowsChronological(k):[];
    const paidTotal=rows.reduce((s,x)=>s+Number(x.amount||0),0);
    const creditsTotal=rows.reduce((s,x)=>s+Number(x.discountCredit||0),0);
    const servicePrice=typeof caseApplicablePrice==='function'?Number(caseApplicablePrice(k)||0):Number(k.serviceTotal||k.priceCash||k.price||0);
    const docNo=k.invoiceNumber||('AGR-'+k.id);

    const logo=await logoDataUrl();
    doc.addImage(logo,'JPEG',42,38,150,93);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
    doc.text('294 Tyler Street, East Haven, CT 06512',42,148);
    doc.text('203-824-0351 · agrsolutionsllc.com',42,164);

    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(24);
    doc.text('FACTURA FINAL',570,58,{align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(14);
    doc.text(docNo,570,81,{align:'right'});
    doc.setDrawColor(...green); doc.setTextColor(...green); doc.setLineWidth(1);
    doc.roundedRect(456,94,114,30,14,14,'S');
    doc.setFont('helvetica','bold'); doc.setFontSize(12.5);
    doc.text('PAID IN FULL',513,114,{align:'center'});

    doc.setDrawColor(...gold); doc.setLineWidth(1.5); doc.line(42,184,570,184);

    const boxY=206, boxH=82;
    doc.setDrawColor(...light); doc.setLineWidth(1);
    doc.roundedRect(42,boxY,250,boxH,9,9,'S');
    doc.roundedRect(320,boxY,250,boxH,9,9,'S');
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    doc.text('CLIENTE',56,226); doc.text('SERVICIO',334,226);
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    const clientName=String(client?.name||'Cliente');
    doc.text(doc.splitTextToSize(clientName,220),56,247);
    doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
    if(client?.email) doc.text(doc.splitTextToSize(String(client.email),220),56,269);
    doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text(doc.splitTextToSize(String(k.service||'Servicio'),220),334,247);
    doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
    doc.text('Referencia: '+docNo,334,269);

    let y=324;
    doc.setTextColor(...gray); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
    doc.text('FECHA',56,y); doc.text('MÉTODO',244,y); doc.text('MONTO',556,y,{align:'right'});
    y+=12; doc.setDrawColor(...light); doc.line(42,y,570,y); y+=22;
    doc.setFont('helvetica','normal'); doc.setTextColor(...navy); doc.setFontSize(11.5);
    rows.forEach(r=>{
      if(y>570){
        doc.addPage(); y=58;
        doc.setTextColor(...gray); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
        doc.text('FECHA',56,y); doc.text('MÉTODO',244,y); doc.text('MONTO',556,y,{align:'right'});
        y+=12; doc.setDrawColor(...light); doc.line(42,y,570,y); y+=22;
        doc.setTextColor(...navy); doc.setFont('helvetica','normal'); doc.setFontSize(11.5);
      }
      doc.text(String(r.date||'—'),56,y);
      doc.text(String(r.method||'—'),244,y);
      doc.text(fmt(Number(r.amount||0)),556,y,{align:'right'});
      if(Number(r.discountCredit||0)>0){
        doc.setFontSize(8.5); doc.setTextColor(...gray);
        doc.text('+ '+fmt(Number(r.discountCredit||0))+' descuento',556,y+12,{align:'right'});
        doc.setFontSize(11.5); doc.setTextColor(...navy);
      }
      y+=27; doc.setDrawColor(...light); doc.line(42,y-10,570,y-10);
    });

    y+=14;
    if(y>620){doc.addPage();y=70;}
    const tx=390, vx=556;
    doc.setFontSize(10.5); doc.setTextColor(...gray); doc.setFont('helvetica','normal');
    doc.text('Precio del servicio',tx,y); doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.text(fmt(servicePrice),vx,y,{align:'right'}); y+=20;
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.text('Total recibido',tx,y); doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.text(fmt(paidTotal),vx,y,{align:'right'}); y+=20;
    if(creditsTotal>0){
      doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.text('Descuento aplicado',tx,y); doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.text(fmt(creditsTotal),vx,y,{align:'right'}); y+=20;
    }
    doc.setDrawColor(...navy); doc.setLineWidth(1.3); doc.line(tx,y-7,vx,y-7);
    doc.setFontSize(12); doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.text('Saldo restante',tx,y+8);
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.text(fmt(0),vx,y+8,{align:'right'});

    const footerY=Math.min(744,Math.max(y+64,680));
    doc.setDrawColor(...light); doc.setLineWidth(1); doc.line(42,footerY-18,570,footerY-18);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
    doc.text('Esta factura confirma que el balance correspondiente al servicio indicado ha sido pagado en su totalidad.',42,footerY);
    doc.text('Gracias por confiar en AGR Solutions LLC.',42,footerY+14);

    const dataUri=doc.output('datauristring');
    return String(dataUri).split(',').pop();
  };
})();
