// AGR CRM · New case package selector
(function(){
  const PRESETS={
    aos:{label:'AOS / Ajuste de estatus',caseType:'Ajuste de estatus',main:['I-485','Ajuste de estatus'],items:[
      ['I-130','Petición familiar'],['I-485','Ajuste de estatus'],['I-765','Permiso de trabajo'],['I-131','Advance Parole'],['I-864','Affidavit of Support']
    ]},
    consular:{label:'Proceso consular',caseType:'Proceso consular',main:['I-130','Petición familiar'],items:[
      ['I-130','Petición familiar'],['NVC','National Visa Center'],['DS-260','Immigrant Visa Application'],['I-864','Affidavit of Support']
    ]},
    sij:{label:'SIJ / Visa juvenil',caseType:'Special Immigrant Juvenile',main:['SIJ','juvenil','I-360'],items:[
      ['Corte estatal','Orden / hallazgos SIJ'],['I-360','Petición SIJ'],['I-485','Ajuste de estatus'],['I-765','Permiso de trabajo']
    ]}
  };

  const style=document.createElement('style');
  style.textContent=`
    .new-case-package-field{display:block;margin:0 0 18px}
    .new-case-package-field>span{display:block;font-weight:700;color:#596579;margin-bottom:8px;font-size:1rem}
    .new-case-package-field select{width:100%;min-height:54px;border:1px solid #d9dfe9;border-radius:14px;background:#fff;padding:0 16px;font:inherit;color:#172033}
    .new-case-package-preview{margin-top:9px;padding:10px 12px;border-radius:12px;background:#f5f8fc;border:1px solid #e2e7ef;color:#536178;font-size:.86rem;line-height:1.4}
    .new-case-package-preview strong{color:#0b2b57}
  `;
  document.head.appendChild(style);

  const newId=()=>Date.now()+Math.floor(Math.random()*1000);

  function isVisible(el){
    return !!(el&&el.isConnected&&(el.offsetWidth||el.offsetHeight||el.getClientRects().length));
  }

  function findServiceSelect(){
    return [...document.querySelectorAll('select')].find(sel=>{
      if(!isVisible(sel) || sel.closest('#caseBundleDialog')) return false;
      const txt=[...sel.options].map(o=>o.textContent||'').join(' | ');
      return /I-130 Petición familiar/i.test(txt) && /I-485 Ajuste de estatus/i.test(txt);
    })||null;
  }

  function chooseMainService(serviceSelect,preset){
    if(!serviceSelect||!preset) return;
    const needles=Array.isArray(preset.main)?preset.main:[preset.main];
    const option=[...serviceSelect.options].find(o=>needles.some(n=>String(o.textContent||'').toLowerCase().includes(String(n).toLowerCase())));
    if(option){
      serviceSelect.value=option.value;
      serviceSelect.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function previewHtml(key){
    if(!key||key==='individual') return 'Se creará un solo trámite, igual que hasta ahora.';
    const p=PRESETS[key]; if(!p) return '';
    return `<strong>${p.label}</strong><br>${p.items.map(x=>x[0]).join(' · ')}<br><span style="font-size:.8rem">Se guardarán dentro de un solo caso principal.</span>`;
  }

  function attachToForm(){
    const serviceSelect=findServiceSelect();
    if(!serviceSelect) return;
    const form=serviceSelect.closest('form');
    if(!form || form.dataset.agrPackageReady==='1') return;

    const serviceLabel=serviceSelect.closest('label')||serviceSelect.parentElement;
    const wrapper=document.createElement('label');
    wrapper.className='new-case-package-field';
    wrapper.innerHTML=`<span>Tipo de caso / paquete</span>
      <select class="new-case-package-select">
        <option value="individual">Caso individual</option>
        <option value="aos">AOS / Ajuste de estatus</option>
        <option value="consular">Proceso consular</option>
        <option value="sij">SIJ / Visa juvenil</option>
      </select>
      <div class="new-case-package-preview">${previewHtml('individual')}</div>`;
    serviceLabel.parentNode.insertBefore(wrapper,serviceLabel);

    const packageSelect=wrapper.querySelector('.new-case-package-select');
    const preview=wrapper.querySelector('.new-case-package-preview');
    packageSelect.addEventListener('change',()=>{
      preview.innerHTML=previewHtml(packageSelect.value);
      const p=PRESETS[packageSelect.value];
      if(p) chooseMainService(serviceSelect,p);
    });

    form.dataset.agrPackageReady='1';
    form.addEventListener('submit',()=>{
      const key=packageSelect.value;
      if(!key||key==='individual'||!PRESETS[key]) return;
      const beforeIds=new Set((typeof data!=='undefined'&&Array.isArray(data.cases)?data.cases:[]).map(c=>String(c.id)));
      const preset=PRESETS[key];
      setTimeout(()=>{
        try{
          const cases=Array.isArray(data.cases)?data.cases:[];
          const created=cases.filter(c=>!beforeIds.has(String(c.id))).sort((a,b)=>Number(b.id)-Number(a.id))[0];
          if(!created) return;
          created.caseType=preset.caseType;
          created.subProcesses=preset.items.map(([formCode,label],i)=>({
            id:newId()+i,
            form:formCode,
            label,
            status:'No iniciado',
            receiptNumber:'',
            filedDate:'',
            decisionDate:'',
            notes:''
          }));
          if(typeof save==='function') save();
          else localStorage.setItem('agr-crm-demo-v1',JSON.stringify(data));
          if(typeof render==='function') render();
        }catch(err){console.error('No se pudo guardar el paquete del caso',err);}
      },120);
    },true);
  }

  attachToForm();
  let timer=null;
  new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(attachToForm,20);
  }).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-open="case"]')) setTimeout(attachToForm,30);
  },true);
})();
