// AGR CRM · Clean contract signing date text without changing signature placement.
(function(){
  try{
    if(typeof caseContractDraftHTML==='function'){
      const originalDraft=caseContractDraftHTML;
      caseContractDraftHTML=function(k,c){
        return originalDraft(k,c)
          .replace(/Fecha de firma:\s*Se completa al firmar/gi,'Fecha de firma:')
          .replace(/Fecha de firma:\s*se completa al firmar/gi,'Fecha de firma:');
      };
    }

    if(typeof contractPdfForFoxit==='function'){
      contractPdfForFoxit=async function(k,c){
        if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');
        const frame=$('#caseContractPreview');
        const doc=frame?.contentDocument;
        const source=doc?.querySelector('.doc');
        const signPage=source?.querySelector('.sign-page');
        if(!source||!signPage) throw new Error('No se pudo leer la vista del contrato.');

        const agrSignatureDataUrl=data.esignSettings?.agrSignatureDataUrl||'';
        if(!agrSignatureDataUrl) throw new Error('Configura una vez la firma predeterminada de AGR antes de enviar contratos a Foxit.');

        const client=clientById(k.clientId);
        const agreementDate=c.date||todayISO();
        const prev={
          margin:source.style.margin,
          boxShadow:source.style.boxShadow,
          maxWidth:source.style.maxWidth,
          width:source.style.width,
          padding:source.style.padding,
          signDisplay:signPage.style.display
        };

        source.style.margin='0';
        source.style.boxShadow='none';
        source.style.maxWidth='none';
        source.style.width='7.5in';
        source.style.padding='0.35in 0.45in';
        signPage.style.display='none';

        const options={
          margin:[18,18,18,18],
          filename:(k.invoiceNumber||('AGR-'+k.id))+'-Service-Agreement.pdf',
          image:{type:'jpeg',quality:0.98},
          html2canvas:{scale:1.6,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0},
          jsPDF:{unit:'pt',format:'letter',orientation:'portrait'},
          pagebreak:{mode:['css','legacy'],avoid:['.grid','.box']}
        };

        try{
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const worker=html2pdf().set(options).from(source).toPdf();
          const pdf=await worker.get('pdf');

          pdf.addPage('letter','portrait');
          const pageCount=pdf.internal.getNumberOfPages();

          const left=54;
          const contentW=504;
          const gap=32;
          const colW=(contentW-gap)/2;
          const rightX=left+colW+gap;

          pdf.setTextColor(23,34,59);
          pdf.setFont('helvetica','bold');
          pdf.setFontSize(18);
          pdf.text('Aceptación y firmas',left,72);

          pdf.setFont('helvetica','normal');
          pdf.setFontSize(9.5);
          pdf.setTextColor(100,116,139);
          pdf.text('Confirmación final del Acuerdo General de Servicios de Preparación Documental Migratoria',left,92);

          pdf.setFillColor(255,255,255);
          pdf.setDrawColor(216,221,230);
          pdf.roundedRect(left,118,contentW,58,6,6,'FD');
          pdf.setFont('helvetica','normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(23,34,59);
          const note='Al firmar electrónicamente, el cliente y AGR Solutions LLC confirman su aceptación de este acuerdo y reconocen que la firma electrónica será utilizada como evidencia de su consentimiento. Cada firmante podrá conservar una copia del documento completado.';
          pdf.text(pdf.splitTextToSize(note,contentW-24),left+12,136,{lineHeightFactor:1.35});

          pdf.setFont('helvetica','bold');
          pdf.setFontSize(9);
          pdf.setTextColor(11,35,72);
          pdf.text('CLIENTE',left,220);
          pdf.text('AGR SOLUTIONS LLC',rightX,220);

          pdf.setDrawColor(203,213,225);
          pdf.rect(left,236,colW,62);
          pdf.rect(rightX,236,colW,62);

          pdf.addImage(agrSignatureDataUrl,'PNG',rightX+16,244,150,46,'AGR_DEFAULT_SIGNATURE','FAST');

          pdf.setDrawColor(17,24,39);
          pdf.line(left,310,left+colW,310);
          pdf.line(rightX,310,rightX+colW,310);

          pdf.setFont('helvetica','bold');
          pdf.setFontSize(9.5);
          pdf.setTextColor(23,34,59);
          pdf.text('Firma del cliente',left,326);
          pdf.text('Firma autorizada de AGR',rightX,326);

          pdf.setFont('helvetica','normal');
          pdf.setFontSize(8.2);
          pdf.setTextColor(100,116,139);
          pdf.text('Nombre: '+(client?.name||'Cliente'),left,344);
          pdf.text('Firma electrónica mediante Foxit eSign',left,359);
          pdf.text('Fecha de firma:',left,374);

          pdf.text('Representante: '+(data.esignSettings?.agrSignerName||'Ariana G Reinoso'),rightX,344);
          pdf.text('Firma predeterminada de AGR Solutions LLC',rightX,359);
          pdf.text('Fecha del acuerdo: '+agreementDate,rightX,374);

          const dataUri=pdf.output('datauristring');
          return {pdfBase64:String(dataUri).split(',')[1]||'',pageCount,signaturePage:pageCount};
        }finally{
          signPage.style.display=prev.signDisplay;
          source.style.margin=prev.margin;
          source.style.boxShadow=prev.boxShadow;
          source.style.maxWidth=prev.maxWidth;
          source.style.width=prev.width;
          source.style.padding=prev.padding;
        }
      };
    }

    const hideTestButton=()=>{
      const btn=document.getElementById('printCaseContract');
      if(btn) btn.remove();
    };
    hideTestButton();
    new MutationObserver(hideTestButton).observe(document.documentElement,{childList:true,subtree:true});
  }catch(err){
    console.error('No se pudo limpiar el texto de fecha del contrato',err);
  }
})();
