// AGR CRM · Caso principal + trámites incluidos
(function(){
  const STATUS_OPTIONS=['No iniciado','Preparando','Listo para enviar','Enviado','Receipt recibido','Biometría','RFE','Aprobado','Cerrado'];
  const PRESETS={
    aos:{label:'Paquete AOS',caseType:'Ajuste de estatus',items:[
      ['I-130','Petición familiar'],['I-485','Ajuste de estatus'],['I-765','Permiso de trabajo'],['I-131','Advance Parole'],['I-864','Affidavit of Support']
    ]},
    consular:{label:'Proceso consular',caseType:'Proceso consular',items:[
      ['I-130','Petición familiar'],['NVC','National Visa Center'],['DS-260','Immigrant Visa Application'],['I-864','Affidavit of Support']
    ]},
    sij:{label:'SIJ',caseType:'Special Immigrant Juvenile',items:[
      ['Corte estatal','Orden / hallazgos SIJ'],['I-360','Petición SIJ'],['I-485','Ajuste de estatus'],['I-765','Permiso de trabajo']
    ]}
  };

  const escHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const newId=()=>Date.now()+Math.floor(Math.random()*1000);

  const style=document.createElement('style');
  style.textContent=`
    .case-bundle-summary{margin:8px 0 2px;display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .case-bundle-chip{display:inline-flex;align-items:center;border-radius:999px;background:#edf3fb;color:#17345f;padding:4px 7px;font-size:.69rem;font-weight:800}
    .case-bundle-more{color:#6b778b;font-size:.7rem;font-weight:700}
    .case-bundle-btn{border:0;background:#f5f7fb;color:#0d2b57;border-radius:8px;padding:6px 8px;font-size:.73rem;font-weight:800;margin:5px 8px 0 0}
    .case-bundle-btn:hover{background:#e9eef7}
    #caseBundleDialog{border:0;border-radius:22px;width:min(980px,95vw);max-height:92vh;padding:0;box-shadow:0 30px 90px rgba(7,27,61,.3)}
    #caseBundleDialog::backdrop{background:rgba(7,27,61,.48);backdrop-filter:blur(3px)}
    .bundle-shell{padding:24px}
    .bundle-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid #e7eaf0;padding-bottom:16px;margin-bottom:18px}
    .bundle-head h2{margin:2px 0 4px;color:#071b3d;font-family:'Playfair Display',serif;font-size:1.7rem}
    .bundle-head p{margin:0;color:#667085}
    .bundle-close{border:0;width:38px;height:38px;border-radius:50%;background:#f1f3f6;font-size:1.3rem}
    .bundle-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
    .bundle-toolbar button{border:1px solid #d9e0ea;background:#fff;color:#0d2b57;border-radius:10px;padding:9px 11px;font-weight:800}
    .bundle-toolbar .bundle-add{background:#071b3d;color:#fff;border-color:#071b3d}
    .bundle-case-type{display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px;align-items:center;margin:0 0 16px;padding:12px 14px;background:#f7f9fc;border:1px solid #e4e9f1;border-radius:14px}
    .bundle-case-type label{font-size:.8rem;font-weight:800;color:#667085}
    .bundle-case-type input{width:100%;border:1px solid #d8dde6;border-radius:10px;padding:10px 11px;background:#fff}
    .bundle-table-wrap{overflow:auto;border:1px solid #e5e9f0;border-radius:14px}
    .bundle-table{width:100%;border-collapse:collapse;min-width:900px}
    .bundle-table th,.bundle-table td{padding:10px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top}
    .bundle-table th{background:#f8fafc;color:#6f7a8d;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}
    .bundle-table input,.bundle-table select{width:100%;border:1px solid #d8dde6;border-radius:9px;padding:8px 9px;background:#fff;color:#172033}
    .bundle-table .form-code{font-weight:800;color:#071b3d;min-width:86px}
    .bundle-remove{border:1px solid #efb4ad;background:#fff;color:#c43127;border-radius:9px;width:34px;height:34px;font-weight:900}
    .bundle-empty{padding:28px;text-align:center;color:#7b8495}
    .bundle-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
    .bundle-actions button{border:0;border-radius:11px;padding:10px 15px;font-weight:800}
    .bundle-cancel{background:#eef1f5;color:#24324a}.bundle-save{background:#071b3d;color:#fff}
    @media(max-width:700px){.bundle-case-type{grid-template-columns:1fr}.bundle-shell{padding:17px}}
  `;
  document.head.appendChild(style);

  const dialog=document.createElement('dialog');
  dialog.id='caseBundleDialog';
  dialog.innerHTML='<div class="bundle-shell"></div>';
  document.body.appendChild(dialog);

  let activeCaseId=null;
  let draft=[];

  function caseForId(id){
    try{return data.cases.find(c=>Number(c.id)===Number(id))||null;}catch(_){return null;}
  }

  function clientLabel(c){
    try{return clientName(c.clientId);}catch(_){return 'Cliente';}
  }

  function ensureSubProcesses(c){
    if(!Array.isArray(c.subProcesses)) c.subProcesses=[];
    return c.subProcesses;
  }

  function addDraftItem(form='',label=''){
    draft.push({id:newId(),form,label,status:'No iniciado',receiptNumber:'',filedDate:'',decisionDate:'',notes:''});
    renderDialog();
  }

  function applyPreset(key){
    const p=PRESETS[key]; if(!p) return;
    const existing=new Set(draft.map(x=>String(x.form||'').toLowerCase()));
    p.items.forEach(([form,label])=>{if(!existing.has(form.toLowerCase())) draft.push({id:newId(),form,label,status:'No iniciado',receiptNumber:'',filedDate:'',decisionDate:'',notes:''});});
    const typeInput=dialog.querySelector('#bundleCaseType'); if(typeInput && !typeInput.value.trim()) typeInput.value=p.caseType;
    renderRowsOnly();
  }

  function rowHtml(x){
    return `<tr data-sub-id="${x.id}">
      <td><input class="form-code" data-field="form" value="${escHtml(x.form)}" placeholder="I-485"></td>
      <td><input data-field="label" value="${escHtml(x.label)}" placeholder="Descripción"></td>
      <td><select data-field="status">${STATUS_OPTIONS.map(s=>`<option${s===x.status?' selected':''}>${escHtml(s)}</option>`).join('')}</select></td>
      <td><input data-field="receiptNumber" value="${escHtml(x.receiptNumber)}" placeholder="IOE..."></td>
      <td><input type="date" data-field="filedDate" value="${escHtml(x.filedDate)}"></td>
      <td><input type="date" data-field="decisionDate" value="${escHtml(x.decisionDate)}"></td>
      <td><input data-field="notes" value="${escHtml(x.notes)}" placeholder="Nota breve"></td>
      <td><button type="button" class="bundle-remove" title="Eliminar trámite">🗑</button></td>
    </tr>`;
  }

  function renderRowsOnly(){
    const body=dialog.querySelector('#bundleRows'); if(!body) return;
    body.innerHTML=draft.length?draft.map(rowHtml).join(''):`<tr><td colspan="8"><div class="bundle-empty">Aún no hay trámites. Usa <strong>+ Añadir trámite</strong> o un paquete rápido.</div></td></tr>`;
  }

  function renderDialog(){
    const c=caseForId(activeCaseId); if(!c) return;
    dialog.querySelector('.bundle-shell').innerHTML=`
      <div class="bundle-head"><div><span class="eyebrow">CASO PRINCIPAL</span><h2>${escHtml(c.service||'Caso')}</h2><p>${escHtml(clientLabel(c))} · Una sola tarjeta en el pipeline</p></div><button type="button" class="bundle-close">×</button></div>
      <div class="bundle-case-type"><label>Tipo de caso / paquete</label><input id="bundleCaseType" value="${escHtml(c.caseType||c.service||'')}" placeholder="Ej. Ajuste de estatus por matrimonio"></div>
      <div class="bundle-toolbar"><button type="button" class="bundle-add">+ Añadir trámite</button><button type="button" data-preset="aos">+ Paquete AOS</button><button type="button" data-preset="consular">+ Proceso consular</button><button type="button" data-preset="sij">+ SIJ</button></div>
      <div class="bundle-table-wrap"><table class="bundle-table"><thead><tr><th>Formulario</th><th>Trámite</th><th>Estado</th><th>Receipt</th><th>Fecha envío</th><th>Decisión</th><th>Nota</th><th></th></tr></thead><tbody id="bundleRows"></tbody></table></div>
      <div class="bundle-actions"><button type="button" class="bundle-cancel">Cancelar</button><button type="button" class="bundle-save">Guardar trámites</button></div>`;
    renderRowsOnly();
  }

  function openBundle(c){
    activeCaseId=Number(c.id);
    draft=JSON.parse(JSON.stringify(ensureSubProcesses(c)));
    renderDialog();
    dialog.showModal();
  }

  function saveDraftFromDom(){
    dialog.querySelectorAll('tr[data-sub-id]').forEach(row=>{
      const id=Number(row.dataset.subId); const item=draft.find(x=>Number(x.id)===id); if(!item) return;
      row.querySelectorAll('[data-field]').forEach(el=>item[el.dataset.field]=el.value);
    });
  }

  function saveBundle(){
    saveDraftFromDom();
    const c=caseForId(activeCaseId); if(!c) return;
    c.caseType=dialog.querySelector('#bundleCaseType')?.value.trim()||c.service||'';
    c.subProcesses=draft.filter(x=>String(x.form||'').trim()||String(x.label||'').trim());
    try{save();}catch(_){localStorage.setItem('agr-crm-demo-v1',JSON.stringify(data));}
    dialog.close();
    decorateCards();
    try{render();}catch(_){ }
    setTimeout(decorateCards,20);
  }

  dialog.addEventListener('click',e=>{
    if(e.target.classList.contains('bundle-close')||e.target.classList.contains('bundle-cancel')){dialog.close();return;}
    if(e.target.classList.contains('bundle-add')){saveDraftFromDom();addDraftItem();return;}
    const preset=e.target.closest('[data-preset]'); if(preset){saveDraftFromDom();applyPreset(preset.dataset.preset);return;}
    const remove=e.target.closest('.bundle-remove'); if(remove){saveDraftFromDom();const row=remove.closest('tr[data-sub-id]');draft=draft.filter(x=>Number(x.id)!==Number(row.dataset.subId));renderRowsOnly();return;}
    if(e.target.classList.contains('bundle-save')){saveBundle();return;}
  });

  function matchingCaseForCard(card){
    const name=card.querySelector('h3')?.textContent.trim()||'';
    const ps=[...card.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean);
    const service=ps[0]||'';
    const candidates=data.cases.filter(c=>clientLabel(c)===name && String(c.service||'').trim()===service);
    if(candidates.length===1) return candidates[0];
    const column=card.closest('.column');
    const label=column?.querySelector('.column-head strong')?.textContent.trim()||'';
    const statusKey=Object.keys(statusLabels).find(k=>statusLabels[k]===label);
    return candidates.find(c=>!statusKey||c.status===statusKey)||candidates[0]||null;
  }

  function decorateCards(){
    const cards=[...document.querySelectorAll('#caseBoard .case-card')];
    cards.forEach(card=>{
      const c=matchingCaseForCard(card); if(!c) return;
      card.querySelectorAll('.case-bundle-summary,.case-bundle-btn').forEach(el=>el.remove());
      const items=ensureSubProcesses(c);
      const summary=document.createElement('div'); summary.className='case-bundle-summary';
      if(items.length){
        items.slice(0,3).forEach(x=>{const chip=document.createElement('span');chip.className='case-bundle-chip';chip.textContent=x.form||x.label||'Trámite';summary.appendChild(chip);});
        if(items.length>3){const more=document.createElement('span');more.className='case-bundle-more';more.textContent='+'+(items.length-3)+' más';summary.appendChild(more);}
        card.appendChild(summary);
      }
      const btn=document.createElement('button');btn.type='button';btn.className='case-bundle-btn';btn.dataset.caseBundleId=c.id;btn.textContent=items.length?`Trámites (${items.length})`:'+ Trámites';card.appendChild(btn);
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-case-bundle-id]');
    if(btn){e.preventDefault();e.stopPropagation();const c=caseForId(btn.dataset.caseBundleId);if(c)openBundle(c);return;}
    if(e.target.closest('[data-view="cases"],[data-jump="cases"]')) setTimeout(decorateCards,30);
  },true);

  const board=document.getElementById('caseBoard');
  if(board){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(decorateCards,30);}).observe(board,{childList:true,subtree:true});}
  setTimeout(decorateCards,100);
})();
