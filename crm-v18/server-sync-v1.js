(function(){
  const STORE_KEY='agr-crm-demo-v1';
  const META_KEY='agr-crm-server-sync-meta-v1';
  const API_STATE='http://127.0.0.1:8787/api/state';
  const API_HEALTH='http://127.0.0.1:8787/api/health';
  let internalWrite=false;
  let saveTimer=null;

  function isCrmState(value){
    return !!value && typeof value==='object' && Array.isArray(value.clients) && Array.isArray(value.cases) && Array.isArray(value.services);
  }

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(STORE_KEY)||'null');}
    catch(_){return null;}
  }

  function readMeta(){
    try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')||{};}
    catch(_){return {};}
  }

  function writeMeta(patch){
    const next={...readMeta(),...patch};
    nativeSetItem.call(localStorage,META_KEY,JSON.stringify(next));
    return next;
  }

  function setBanner(status,text){
    const banner=document.querySelector('.demo-banner');
    if(!banner) return;
    banner.dataset.serverSync=status;
    if(status==='ok'){
      banner.textContent=text||'AGR CRM · Servidor local conectado · PostgreSQL activo';
      banner.style.background='#e8f6ee';
      banner.style.color='#146c43';
    }else if(status==='error'){
      banner.textContent=text||'AGR CRM · Servidor local desconectado · Los cambios siguen guardándose en este navegador';
      banner.style.background='#fff3cd';
      banner.style.color='#7a5d00';
    }else{
      banner.textContent=text||'AGR CRM · Conectando con servidor local…';
      banner.style.background='#eef2f7';
      banner.style.color='#334155';
    }
  }

  async function getRemote(){
    const response=await fetch(API_STATE,{method:'GET',cache:'no-store'});
    if(!response.ok) throw new Error('GET /api/state '+response.status);
    return response.json();
  }

  async function putRemote(payload){
    if(!isCrmState(payload)) return null;
    const response=await fetch(API_STATE,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({data:payload}),
      cache:'no-store',
      keepalive:true
    });
    if(!response.ok) throw new Error('PUT /api/state '+response.status);
    const result=await response.json();
    writeMeta({serverUpdatedAt:result.updatedAt||new Date().toISOString(),lastSyncAt:new Date().toISOString()});
    setBanner('ok');
    return result;
  }

  function queuePush(payload){
    if(!isCrmState(payload)) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try{await putRemote(payload);}catch(err){
        console.warn('[AGR CRM] No se pudo sincronizar con PostgreSQL:',err);
        setBanner('error');
      }
    },250);
  }

  const nativeSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this!==localStorage || key!==STORE_KEY || internalWrite) return;
    try{
      const payload=JSON.parse(value);
      writeMeta({localChangedAt:new Date().toISOString()});
      queuePush(payload);
    }catch(err){
      console.warn('[AGR CRM] Estado local no válido para sincronizar:',err);
    }
  };

  async function bootstrap(){
    setBanner('connecting');
    const local=readLocal();
    try{
      const health=await fetch(API_HEALTH,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('health '+r.status)));
      if(!health || health.database!==true) throw new Error('database unavailable');

      const remote=await getRemote();
      const remoteData=remote && remote.data;
      const meta=readMeta();
      const remoteTime=Date.parse((remote&&remote.updatedAt)||'')||0;
      const knownServerTime=Date.parse(meta.serverUpdatedAt||'')||0;

      // Primera migración segura: si PostgreSQL todavía no contiene un estado CRM completo,
      // conservar el navegador como fuente de verdad y copiarlo al servidor.
      if(!isCrmState(remoteData)){
        if(isCrmState(local)) await putRemote(local);
        else setBanner('error','AGR CRM · Servidor conectado, pero no hay un estado CRM válido para migrar');
        return;
      }

      // Si el navegador no tiene un CRM válido, recuperar la copia del servidor.
      if(!isCrmState(local)){
        internalWrite=true;
        nativeSetItem.call(localStorage,STORE_KEY,JSON.stringify(remoteData));
        internalWrite=false;
        writeMeta({serverUpdatedAt:remote.updatedAt||new Date().toISOString(),lastSyncAt:new Date().toISOString()});
        location.reload();
        return;
      }

      // Una vez sincronizado al menos una vez, PostgreSQL manda cuando tiene una versión más nueva.
      if(knownServerTime>0 && remoteTime>knownServerTime+500){
        internalWrite=true;
        nativeSetItem.call(localStorage,STORE_KEY,JSON.stringify(remoteData));
        internalWrite=false;
        writeMeta({serverUpdatedAt:remote.updatedAt,lastSyncAt:new Date().toISOString()});
        location.reload();
        return;
      }

      // Si es la primera vez con datos válidos en ambos lados, no sobrescribir el navegador.
      // Subir la copia local para preservar clientes/casos que ya existían allí.
      if(knownServerTime===0){
        await putRemote(local);
        return;
      }

      setBanner('ok');
    }catch(err){
      console.warn('[AGR CRM] Servidor local no disponible:',err);
      setBanner('error');
    }
  }

  window.addEventListener('online',bootstrap);
  window.addEventListener('focus',()=>{ if(document.visibilityState==='visible') bootstrap(); });
  setTimeout(bootstrap,0);
})();
