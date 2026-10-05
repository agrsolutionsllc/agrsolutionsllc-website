// AGR CRM · Production-style Foxit eSign presentation
(function(){
  function polishContractUi(){
    const preview=document.getElementById('printCaseContract');
    if(preview){
      const t=String(preview.textContent||'');
      if(/no usa foxit|probar pdf/i.test(t)) preview.textContent='Vista previa PDF';
    }

    const send=document.getElementById('sendCaseContractFoxit');
    if(send) send.textContent='Enviar a firmar';

    document.querySelectorAll('button').forEach(btn=>{
      const text=String(btn.textContent||'').trim();
      if(/^sin\s+(foxit\s+)?e-?sign$/i.test(text)) btn.style.display='none';
      if(/^(usar|con)\s+(foxit\s+)?e-?sign$/i.test(text)) btn.textContent='Enviar a firmar';
    });
  }

  polishContractUi();
  new MutationObserver(polishContractUi).observe(document.documentElement,{childList:true,subtree:true});
})();
