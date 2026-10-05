// AGR CRM · Invoice header spacing fix
// Keeps the approved logo size and only moves agency contact details below the logo.
(function(){
  if(typeof window.paymentDocumentHTML!=='function') return;
  const originalPaymentDocumentHTML=window.paymentDocumentHTML;
  window.paymentDocumentHTML=function(k,p,options){
    let html=originalPaymentDocumentHTML(k,p,options);
    html=html.replace(
      '.brand-copy{margin-top:-72px}',
      '.brand-copy{margin-top:10px}'
    );
    return html;
  };
})();
