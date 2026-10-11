(function () {
  'use strict';

  const AGRIntakeEngine = {
    state: { token:'', apiBase:'', formId:'', schemas:[], answers:{}, intake:null, root:null, progressBar:null, progressText:null, saveStatus:null, saveBtn:null, submitBtn:null, autosaveTimer:null, loading:false, submitting:false },

    init(options={}) {
      const s=this.state;
      s.token=options.token||new URLSearchParams(window.location.search).get('token')||'';
      s.apiBase=options.apiBase||'https://agrsolutionsllc-website-stripe-back.vercel.app';
      s.formId=options.formId||'I-130';
      s.root=typeof options.root==='string'?document.querySelector(options.root):options.root;
      s.progressBar=document.querySelector(options.progressBar||'#progressBar');
      s.progressText=document.querySelector(options.progressText||'#progressText');
      s.saveStatus=document.querySelector(options.saveStatus||'#saveStatus');
      s.saveBtn=document.querySelector(options.saveBtn||'#saveBtn');
      s.submitBtn=document.querySelector(options.submitBtn||'#submitBtn');
      if(!s.root) throw new Error('AGR Intake Engine: no se encontró el contenedor principal.');
      if(!window.AGR_USCIS_SCHEMAS||!window.AGR_USCIS_SCHEMAS[s.formId]) throw new Error('AGR Intake Engine: no se encontró el esquema '+s.formId+'.');
      s.schemas=[window.AGR_USCIS_SCHEMAS[s.formId]];
      this.bindButtons();
      return this.load();
    },

    bindButtons(){
      const s=this.state;
      if(s.saveBtn) s.saveBtn.addEventListener('click',()=>this.save(true));
      if(s.submitBtn) s.submitBtn.addEventListener('click',()=>this.submit());
    },

    async load(){
      const s=this.state;
      if(!s.token){this.showFatal('Este enlace no contiene un token válido. Solicite un nuevo enlace a AGR Solutions LLC.');return;}
      s.loading=true;
      try{
        const r=await fetch(s.apiBase+'/api/intake-get?token='+encodeURIComponent(s.token));
        const result=await r.json();
        if(!r.ok||!result.ok||!result.intake) throw new Error(result.error||'No se pudo cargar el formulario.');
        s.intake=result.intake;
        s.answers=result.intake.answers||{};
        this.resolveSchemas();
        this.render();
        this.applyPrefill(result.intake.prefill||{});
        this.restoreAnswers();
        this.refreshAllConditions();
        this.updateProgress();
      }catch(e){console.error(e);this.showFatal(e.message||'No se pudo abrir el formulario.');}
      finally{s.loading=false;}
    },

    resolveSchemas(){
      const s=this.state, base=window.AGR_USCIS_SCHEMAS[s.formId];
      s.schemas=[base];
      (base.requires||[]).forEach(rule=>{
        if(!rule||!rule.form||!rule.when) return;
        const current=s.answers[rule.when.field];
        let matches=false;
        if(Object.prototype.hasOwnProperty.call(rule.when,'equals')) matches=current===rule.when.equals;
        if(Array.isArray(rule.when.in)) matches=rule.when.in.includes(current);
        if(matches&&window.AGR_USCIS_SCHEMAS[rule.form]) s.schemas.push(window.AGR_USCIS_SCHEMAS[rule.form]);
      });
    },

    render(){
      const s=this.state;
      s.root.innerHTML='';
      s.schemas.forEach(schema=>{
        const wrap=document.createElement('div');
        wrap.className='agr-intake-schema';
        wrap.dataset.schemaId=schema.id;
        const head=document.createElement('section');
        head.className='card agr-schema-header';
        head.innerHTML='<div class="gold">USCIS '+this.escape(schema.id)+'</div><h2 style="margin-top:8px">'+this.escape(schema.title)+'</h2><p class="muted">Edición USCIS: <strong>'+this.escape(schema.edition||'')+'</strong></p>';
        wrap.appendChild(head);
        (schema.sections||[]).forEach(sec=>wrap.appendChild(this.renderSection(sec)));
        s.root.appendChild(wrap);
      });
      this.bindInputs();
      this.refreshAllConditions();
    },

    renderSection(section){
      const w=document.createElement('section');
      w.className='card agr-intake-section';
      w.dataset.sectionId=section.id||'';
      if(section.visibleWhen) w.dataset.condition=JSON.stringify(section.visibleWhen);
      const h=document.createElement('div');
      h.innerHTML='<div class="gold">'+this.escape(section.uscisPart||'USCIS')+'</div><h2>'+this.escape(section.title||'')+'</h2>'+(section.description?'<p class="muted">'+this.escape(section.description)+'</p>':'');
      w.appendChild(h);
      const g=document.createElement('div');g.className='grid';
      (section.fields||[]).forEach(f=>g.appendChild(this.renderField(f)));
      w.appendChild(g);return w;
    },

    renderField(field){
      const c=document.createElement('div');c.className='field agr-field';
      if(['textarea','group','repeater','checkboxGroup','radio'].includes(field.type)) c.classList.add('full');
      c.dataset.fieldKey=field.key||'';
      if(field.visibleWhen) c.dataset.condition=JSON.stringify(field.visibleWhen);
      if(field.audience==='agr') c.classList.add('agr-internal-field');
      const l=document.createElement('label');l.innerHTML=this.escape(field.label||'')+(field.required?' <span style="color:#b91c1c">*</span>':'');c.appendChild(l);
      if(field.source){const x=document.createElement('small');x.className='agr-field-source';x.style.color='#8793a4';x.style.fontSize='11px';x.textContent='USCIS '+field.source;c.appendChild(x);}
      c.appendChild(this.createControl(field));return c;
    },

    createControl(field){switch(field.type){case'select':return this.createSelect(field);case'radio':return this.createRadio(field);case'checkbox':return this.createCheckbox(field);case'checkboxGroup':return this.createCheckboxGroup(field);case'textarea':return this.createTextarea(field);case'group':return this.createGroup(field);case'repeater':return this.createRepeater(field);default:return this.createInput(field);}},

    createInput(field){const i=document.createElement('input');i.name=field.key;i.dataset.answerKey=field.key;const m={text:'text',email:'email',tel:'tel',date:'date',number:'number'};i.type=m[field.type]||'text';if(field.type==='dateOrPresent'||field.type==='dateOrText'){i.type='text';i.placeholder=field.type==='dateOrPresent'?'MM/DD/YYYY o Presente':'MM/DD/YYYY o D/S';}if(field.required)i.required=true;if(Object.prototype.hasOwnProperty.call(field,'defaultValue'))i.value=field.defaultValue||'';return i;},
    createTextarea(field){const t=document.createElement('textarea');t.name=field.key;t.dataset.answerKey=field.key;if(field.required)t.required=true;return t;},
    createSelect(field){const s=document.createElement('select');s.name=field.key;s.dataset.answerKey=field.key;const b=document.createElement('option');b.value='';b.textContent='Seleccione';s.appendChild(b);(field.options||[]).forEach(o=>{const n=typeof o==='string'?{value:o,label:o}:o;const op=document.createElement('option');op.value=n.value??'';op.textContent=n.label??n.value??'';s.appendChild(op);});if(field.required)s.required=true;return s;},
    createRadio(field){const w=document.createElement('div');w.className='agr-choice-list';w.dataset.answerKey=field.key;(field.options||[]).forEach(o=>{const n=typeof o==='string'?{value:o,label:o}:o;const l=document.createElement('label');l.style.display='block';l.style.fontWeight='400';l.style.margin='7px 0';const i=document.createElement('input');i.type='radio';i.name=field.key;i.value=n.value??'';i.dataset.answerKey=field.key;if(field.required)i.required=true;l.appendChild(i);l.appendChild(document.createTextNode(' '+(n.label??n.value??'')));w.appendChild(l);});return w;},
    createCheckbox(field){const l=document.createElement('label');l.style.fontWeight='400';const i=document.createElement('input');i.type='checkbox';i.name=field.key;i.value='yes';i.dataset.answerKey=field.key;if(field.required)i.required=true;l.appendChild(i);l.appendChild(document.createTextNode(' Confirmo'));return l;},
    createCheckboxGroup(field){const w=document.createElement('div');w.className='agr-choice-list';w.dataset.answerKey=field.key;(field.options||[]).forEach(o=>{const n=typeof o==='string'?{value:o,label:o}:o;const l=document.createElement('label');l.style.display='block';l.style.fontWeight='400';l.style.margin='7px 0';const i=document.createElement('input');i.type='checkbox';i.name=field.key;i.value=n.value??'';i.dataset.answerKey=field.key;l.appendChild(i);l.appendChild(document.createTextNode(' '+(n.label??n.value??'')));w.appendChild(l);});return w;},

    createGroup(field){const w=document.createElement('div');w.className='agr-group';w.dataset.groupKey=field.key;const g=document.createElement('div');g.className='grid';(field.fields||[]).forEach(ch=>{const c=Object.assign({},ch);c.key=field.key+'.'+ch.key;g.appendChild(this.renderField(c));});w.appendChild(g);return w;},

    createRepeater(field){const w=document.createElement('div');w.className='agr-repeater';w.dataset.repeaterKey=field.key;w.dataset.fieldDefinition=encodeURIComponent(JSON.stringify(field));const items=document.createElement('div');items.className='agr-repeater-items';w.appendChild(items);const b=document.createElement('button');b.type='button';b.className='secondary agr-add-repeat';b.textContent=field.addLabel||'Agregar';b.addEventListener('click',()=>{const count=items.children.length;if(field.maxItems&&count>=field.maxItems){alert('Este formulario permite hasta '+field.maxItems+' registros en esta sección.');return;}this.addRepeaterItem(w,field,{},count);this.collectAnswers();this.updateProgress();});w.appendChild(b);return w;},

    addRepeaterItem(repeater,field,values={},index=0){const items=repeater.querySelector('.agr-repeater-items');if(!items)return;const card=document.createElement('div');card.className='agr-repeater-item';card.dataset.index=String(index);card.style.cssText='border:1px solid #dce4ef;border-radius:12px;padding:16px;margin-bottom:12px';const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:12px';const title=document.createElement('strong');title.textContent='Registro '+(index+1);const rm=document.createElement('button');rm.type='button';rm.className='secondary';rm.textContent='Eliminar';rm.addEventListener('click',()=>{card.remove();this.renumberRepeater(repeater);this.collectAnswers();this.updateProgress();this.scheduleAutosave();});head.appendChild(title);head.appendChild(rm);card.appendChild(head);const g=document.createElement('div');g.className='grid';(field.fields||[]).forEach(ch=>{const c=Object.assign({},ch);c.key=field.key+'['+index+'].'+ch.key;g.appendChild(this.renderField(c));});card.appendChild(g);items.appendChild(card);this.populateRepeaterItem(card,field,values,index);this.bindInputs(card);},
    populateRepeaterItem(card,field,values,index){(field.fields||[]).forEach(ch=>{const key=field.key+'['+index+'].'+ch.key;const value=this.getNestedValue(values,ch.key);this.setControlValue(card,key,value);});},
    renumberRepeater(repeater){const def=JSON.parse(decodeURIComponent(repeater.dataset.fieldDefinition));const cards=Array.from(repeater.querySelectorAll(':scope > .agr-repeater-items > .agr-repeater-item'));const existing=cards.map(c=>this.collectRepeaterItemValues(c,def));const items=repeater.querySelector('.agr-repeater-items');items.innerHTML='';existing.forEach((v,i)=>this.addRepeaterItem(repeater,def,v,i));if(!existing.length)this.state.answers[repeater.dataset.repeaterKey]=[];},
    collectRepeaterItemValues(card,field){const out={};(field.fields||[]).forEach(ch=>{const base=field.key+'['+card.dataset.index+'].'+ch.key;this.setNestedValue(out,ch.key,this.readControlValue(card,base));});return out;},

    bindInputs(scope){const root=scope||this.state.root;if(!root)return;root.querySelectorAll('input, select, textarea').forEach(el=>{if(el.dataset.agrBound==='1')return;el.dataset.agrBound='1';const ev=el.type==='radio'||el.type==='checkbox'||el.tagName==='SELECT'?'change':'input';el.addEventListener(ev,()=>{this.collectAnswers();const before=this.state.schemas.length;this.resolveSchemas();const after=this.state.schemas.length;if(before!==after){const saved=Object.assign({},this.state.answers);this.render();this.state.answers=saved;this.restoreAnswers();}this.refreshAllConditions();this.updateProgress();this.scheduleAutosave();});});},

    collectAnswers(){const s=this.state;const answers=Object.assign({},s.answers);s.root.querySelectorAll('[data-answer-key]').forEach(el=>{const key=el.dataset.answerKey;if(!key||key.includes('[')&&key.includes('].')||el.closest('.agr-repeater-item'))return;if(el.type==='radio'){if(el.checked)this.setNestedValue(answers,key,el.value);return;}if(el.type==='checkbox'){const same=s.root.querySelectorAll('input[type="checkbox"][name="'+CSS.escape(el.name)+'"]');if(same.length>1){this.setNestedValue(answers,key,Array.from(same).filter(x=>x.checked).map(x=>x.value));}else this.setNestedValue(answers,key,el.checked?(el.value||'yes'):'');return;}if(el.tagName==='DIV')return;this.setNestedValue(answers,key,el.value);});s.root.querySelectorAll('.agr-repeater').forEach(rep=>{const key=rep.dataset.repeaterKey;const def=JSON.parse(decodeURIComponent(rep.dataset.fieldDefinition));answers[key]=Array.from(rep.querySelectorAll(':scope > .agr-repeater-items > .agr-repeater-item')).map(c=>this.collectRepeaterItemValues(c,def));});s.answers=answers;return answers;},

    restoreAnswers(){const s=this.state;Object.entries(s.answers||{}).forEach(([key,value])=>{const rep=s.root.querySelector('.agr-repeater[data-repeater-key="'+CSS.escape(key)+'"]');if(rep&&Array.isArray(value)){const def=JSON.parse(decodeURIComponent(rep.dataset.fieldDefinition));const items=rep.querySelector('.agr-repeater-items');items.innerHTML='';value.forEach((row,i)=>this.addRepeaterItem(rep,def,row||{},i));return;}this.setControlValue(s.root,key,value);});},
    setControlValue(scope,key,value){const esc=CSS.escape(key);const els=Array.from(scope.querySelectorAll('[data-answer-key="'+esc+'"], [name="'+esc+'"]'));if(!els.length)return;const radios=els.filter(e=>e.type==='radio');if(radios.length){radios.forEach(e=>e.checked=String(e.value)===String(value??''));return;}const checks=els.filter(e=>e.type==='checkbox');if(checks.length){if(checks.length>1){const vals=Array.isArray(value)?value.map(String):[];checks.forEach(e=>e.checked=vals.includes(String(e.value)));}else checks[0].checked=value===true||value==='yes'||value===checks[0].value;return;}const c=els.find(e=>['INPUT','SELECT','TEXTAREA'].includes(e.tagName));if(c)c.value=value==null?'':String(value);},
    readControlValue(scope,key){const esc=CSS.escape(key);const els=Array.from(scope.querySelectorAll('[name="'+esc+'"], [data-answer-key="'+esc+'"]'));if(!els.length)return'';const radios=els.filter(e=>e.type==='radio');if(radios.length){const c=radios.find(e=>e.checked);return c?c.value:'';}const checks=els.filter(e=>e.type==='checkbox');if(checks.length>1)return checks.filter(e=>e.checked).map(e=>e.value);if(checks.length===1)return checks[0].checked?(checks[0].value||'yes'):'';const e=els.find(x=>['INPUT','SELECT','TEXTAREA'].includes(x.tagName));return e?e.value:'';},

    applyPrefill(prefill){if(!prefill)return;const map={email:'petitionerEmail',phone:'petitionerDayPhone',aNumber:'petitionerANumber'};Object.entries(map).forEach(([from,to])=>{if(prefill[from]&&!this.state.answers[to])this.state.answers[to]=prefill[from];});if(prefill.clientName&&!this.state.answers.petitionerFirstName&&!this.state.answers.petitionerLastName){const p=String(prefill.clientName).trim().split(/\s+/);if(p.length===1)this.state.answers.petitionerFirstName=p[0];else if(p.length>=2){this.state.answers.petitionerFirstName=p[0];this.state.answers.petitionerLastName=p[p.length-1];if(p.length>2)this.state.answers.petitionerMiddleName=p.slice(1,-1).join(' ');}}},
    refreshAllConditions(){const s=this.state;this.collectAnswers();s.root.querySelectorAll('[data-condition]').forEach(el=>{let c;try{c=JSON.parse(el.dataset.condition);}catch{return;}const visible=this.evaluateCondition(c);el.classList.toggle('hidden',!visible);el.querySelectorAll('input, select, textarea').forEach(i=>i.disabled=!visible);});},
    evaluateCondition(c){if(!c)return true;const v=this.getNestedValue(this.state.answers,c.field);if(Object.prototype.hasOwnProperty.call(c,'equals'))return v===c.equals;if(Array.isArray(c.in))return c.in.includes(v);if(Object.prototype.hasOwnProperty.call(c,'notEquals'))return v!==c.notEquals;return true;},
    calculateProgress(){let total=0,done=0;this.state.root.querySelectorAll('.agr-field').forEach(f=>{if(f.classList.contains('hidden'))return;const ctrls=Array.from(f.querySelectorAll('input, select, textarea')).filter(e=>!e.disabled);if(!ctrls.length||!ctrls.some(e=>e.required))return;total++;let has=false;ctrls.forEach(e=>{if((e.type==='radio'||e.type==='checkbox')?e.checked:String(e.value||'').trim())has=true;});if(has)done++;});return total?Math.round(done/total*100):0;},
    updateProgress(){const p=this.calculateProgress();if(this.state.progressBar)this.state.progressBar.style.width=p+'%';if(this.state.progressText)this.state.progressText.textContent='Progreso '+p+'%';return p;},
    scheduleAutosave(){clearTimeout(this.state.autosaveTimer);this.state.autosaveTimer=setTimeout(()=>this.save(false),1500);},

    async save(showMessage=true){const s=this.state;if(s.loading||s.submitting)return false;const answers=this.collectAnswers(),progress=this.updateProgress();if(showMessage)this.showStatus('Guardando información...','');if(s.saveBtn)s.saveBtn.disabled=true;try{const r=await fetch(s.apiBase+'/api/intake-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:s.token,answers,progress})});const result=await r.json();if(!r.ok||!result.ok)throw new Error(result.error||'No se pudo guardar la información.');s.intake=result.intake||s.intake;if(showMessage)this.showStatus('✓ Información guardada. Puede cerrar esta página y continuar después usando el mismo enlace.','success');return true;}catch(e){console.error(e);if(showMessage)this.showStatus(e.message||'No se pudo guardar la información.','error');return false;}finally{if(s.saveBtn)s.saveBtn.disabled=false;}},

    async submit(){const s=this.state;if(s.submitting)return;this.collectAnswers();this.refreshAllConditions();const invalid=s.root.querySelector(':invalid');if(invalid){invalid.scrollIntoView({behavior:'smooth',block:'center'});invalid.focus();this.showStatus('Complete los campos obligatorios antes de enviar el intake.','error');return;}const saved=await this.save(false);if(!saved){this.showStatus('No pudimos guardar el formulario. Intente nuevamente.','error');return;}if(!window.confirm('¿Está seguro/a de que desea enviar este intake a AGR Solutions LLC? AGR revisará la información antes de preparar los formularios oficiales.'))return;s.submitting=true;if(s.saveBtn)s.saveBtn.disabled=true;if(s.submitBtn){s.submitBtn.disabled=true;s.submitBtn.textContent='Enviando...';}try{const r=await fetch(s.apiBase+'/api/intake-submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:s.token})});const result=await r.json();if(!r.ok||!result.ok)throw new Error(result.error||'No se pudo enviar el intake.');s.intake=result.intake||s.intake;this.showStatus('✓ Su intake fue enviado correctamente a AGR Solutions LLC. AGR revisará la información.','success');if(s.submitBtn){s.submitBtn.textContent='Intake enviado';s.submitBtn.disabled=true;}}catch(e){console.error(e);this.showStatus(e.message||'No se pudo enviar el intake.','error');if(s.submitBtn){s.submitBtn.disabled=false;s.submitBtn.textContent='Enviar intake a AGR';}}finally{s.submitting=false;if(s.saveBtn)s.saveBtn.disabled=false;}},

    showStatus(message,type){const b=this.state.saveStatus;if(!b)return;b.className='notice';if(type==='success')b.classList.add('success');if(type==='error')b.classList.add('error');b.textContent=message;b.classList.remove('hidden');},
    showFatal(message){this.state.root.innerHTML='<section class="card"><div class="gold">AGR Solutions LLC</div><h1>Enlace no disponible</h1><p class="muted">'+this.escape(message)+'</p></section>';},
    getNestedValue(obj,path){if(!obj||!path)return undefined;return String(path).split('.').reduce((c,k)=>c==null?undefined:c[k],obj);},
    setNestedValue(obj,path,value){if(!obj||!path)return;const parts=String(path).split('.');let c=obj;parts.forEach((p,i)=>{if(i===parts.length-1){c[p]=value;return;}if(!c[p]||typeof c[p]!=='object')c[p]={};c=c[p];});},
    escape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  };

  window.AGRIntakeEngine=AGRIntakeEngine;
})();
