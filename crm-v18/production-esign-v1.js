// AGR CRM · Production-style Foxit eSign presentation
(function(){
  let scheduled=false;

  function polishContractUi(){
    scheduled=false;

    const preview=document.getElementById('printCaseContract');
    if(preview){
      const text=String(preview.textContent||'').trim();
      if(/no usa foxit|probar pdf/i.test(text) && text!=='Vista previa PDF'){
        preview.textContent='Vista previa PDF';
      }
    }

    const send=document.getElementById('sendCaseContractFoxit');
    if(send && String(send.textContent||'').trim()!=='Enviar a firmar'){
      send.textContent='Enviar a firmar';
    }

    document.querySelectorAll('button').forEach(btn=>{
      const text=String(btn.textContent||'').trim();
      if(/^sin\s+(foxit\s+)?e-?sign$/i.test(text)){
        if(btn.style.display!=='none') btn.style.display='none';
        return;
      }
      if(/^(usar|con)\s+(foxit\s+)?e-?sign$/i.test(text) && text!=='Enviar a firmar'){
        btn.textContent='Enviar a firmar';
      }
    });
  }

  function schedulePolish(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(polishContractUi);
  }

  polishContractUi();
  new MutationObserver(schedulePolish).observe(document.documentElement,{childList:true,subtree:true});
})();
