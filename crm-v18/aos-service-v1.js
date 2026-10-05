// AGR CRM · Add AOS as a normal service (no package UI)
(function(){
  const AOS_NAME='AOS (8475247852)';
  const LEGACY_AOS_NAMES=[
    'Paquete AOS (I-130, I-130A, I-485, I-765, I-864)',
    'AOS / Ajuste de estatus',
    'Paquete AOS – Ajuste de estatus (I-130, I-130A, I-485, I-765, I-864)'
  ];

  function removePackageUi(){
    document.querySelectorAll('.new-case-package-field').forEach(el=>el.remove());
    document.querySelectorAll('[data-agr-new-case-bundles],[data-agr-case-bundles]').forEach(el=>el.remove());
  }

  function ensureAosService(){
    try{
      if(typeof data==='undefined' || !data || !Array.isArray(data.services)) return;

      const legacy=data.services.find(s=>LEGACY_AOS_NAMES.some(n=>String(s.name||'').trim().toLowerCase()===n.toLowerCase()));
      const current=data.services.find(s=>String(s.name||'').trim().toLowerCase()===AOS_NAME.toLowerCase());

      if(legacy && !current){
        legacy.name=AOS_NAME;
        legacy.category='Inmigración';
        legacy.active=true;
      }else if(legacy && current && Number(legacy.id)!==Number(current.id)){
        data.services=data.services.filter(s=>Number(s.id)!==Number(legacy.id));
      }else if(!current){
        const maxId=data.services.reduce((m,s)=>Math.max(m,Number(s.id||0)),0);
        data.services.push({id:maxId+1,name:AOS_NAME,category:'Inmigración',price:0,active:true});
      }

      if(typeof save==='function') save();
      if(typeof render==='function') render();
    }catch(err){
      console.error('No se pudo agregar el servicio AOS',err);
    }
  }

  removePackageUi();
  ensureAosService();

  new MutationObserver(()=>{
    removePackageUi();
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
