window.addEventListener('error',function(e){
  const banner=document.querySelector('.demo-banner');
  if(banner){
    banner.textContent='CRM v15 · Error de carga: '+(e.message||'JavaScript');
    banner.style.background='#fdecec';
    banner.style.color='#8f2f2f';
  }
});
const seed={
  services:[
    {id:1,name:'I-130 Petición familiar',category:'Inmigración',price:1200,active:true},
    {id:2,name:'I-485 Ajuste de estatus',category:'Inmigración',price:1400,active:true},
    {id:3,name:'I-765 Permiso de trabajo',category:'Inmigración',price:250,active:true},
    {id:4,name:'N-400 Naturalización',category:'Inmigración',price:375,active:true},
    {id:5,name:'DACA Renovación',category:'Inmigración',price:350,active:true},
    {id:6,name:'FOIA USCIS / EOIR',category:'Inmigración',price:120,active:true},
    {id:7,name:'Declaración de impuestos',category:'Impuestos',price:0,active:true},
    {id:8,name:'ITIN / CAA',category:'Impuestos',price:0,active:true},
    {id:9,name:'Notary Public',category:'Notaría',price:25,active:true},
    {id:10,name:'Trámite DMV',category:'DMV',price:0,active:true},
    {id:11,name:'Formación de LLC Connecticut',category:'Negocios',price:850,active:true},
    {id:12,name:'Traducción certificada',category:'Traducciones',price:35,active:true},
    {id:13,name:'Apostilla',category:'Traducciones',price:40,active:true},
    {id:14,name:'Divorcio CT sin hijos/bienes',category:'Documentos',price:500,active:true},
    {id:15,name:'Divorcio CT con hijos',category:'Documentos',price:600,active:true},
    {id:16,name:'Carta / Affidavit',category:'Documentos',price:0,active:true}
  ],
  clients:[
    {id:1,name:'Cliente de prueba 1',phone:'203-555-0101',email:'cliente1@example.com'},
    {id:2,name:'Cliente de prueba 2',phone:'203-555-0102',email:'cliente2@example.com'},
    {id:3,name:'Cliente de prueba 3',phone:'203-555-0103',email:'cliente3@example.com'}
  ],
  cases:[
    {id:1,clientId:1,service:'Ajuste de estatus',status:'espera_uscis',next:'Monitorear recibo y notificaciones',serviceTotal:1200},
    {id:2,clientId:2,service:'Declaración de impuestos',status:'evidencia',next:'Esperar W-2',serviceTotal:350},
    {id:3,clientId:3,service:'LLC Connecticut',status:'inicial',next:'Enviar intake',serviceTotal:850}
  ],
  payments:[
    {id:101,caseId:1,clientId:1,amount:600,method:'Cash',date:'2026-09-15',note:'Pago de prueba'},
    {id:102,caseId:2,clientId:2,amount:350,method:'Debit Card',date:'2026-09-20',note:'Pago de prueba'},
    {id:103,caseId:3,clientId:3,amount:300,method:'Zelle',date:'2026-09-22',note:'Pago de prueba'}
  ],
  appointments:[
    {id:1,date:'2026-09-30',time:'10:30 AM',clientId:1,service:'Seguimiento migratorio'},
    {id:2,date:'2026-10-01',time:'2:00 PM',clientId:3,service:'Consulta LLC'}
  ]
};

const statusOrder=[
  'inicial',
  'evidencia',
  'preparacion',
  'revision',
  'enviado',
  'espera_uscis',
  'rfe',
  'aprobado',
  'completado'
];

const statusLabels={
  inicial:'Inicial',
  evidencia:'Obteniendo evidencia',
  preparacion:'Preparación de documentos',
  revision:'En revisión',
  enviado:'Enviado',
  espera_uscis:'En espera de USCIS',
  rfe:'RFE / Respuesta pendiente',
  aprobado:'Aprobado',
  completado:'Completado'
};

const storeKey='agr-crm-demo-v1';
const STRIPE_BACKEND_URL='https://agrsolutionsllc-website-stripe-back.vercel.app/api/create-payment-link';
const STRIPE_SYNC_URL='https://agrsolutionsllc-website-stripe-back.vercel.app/api/sync-payments';
let data=JSON.parse(localStorage.getItem(storeKey)||'null')||structuredClone(seed);
if(!Array.isArray(data.services)) data.services=structuredClone(seed.services);
if(!data.documents || typeof data.documents!=='object') data.documents={};
if(!Array.isArray(data.notes)) data.notes=[];
if(!Array.isArray(data.history)) data.history=[];
if(!Array.isArray(data.communications)) data.communications=[];
if(!Array.isArray(data.tasks)) data.tasks=[];

// migrate old prototype statuses if they exist in this browser
const migration={nuevo:'inicial',pendiente:'evidencia',proceso:'preparacion',completado:'completado'};
data.cases=data.cases.map(c=>({...c,status:migration[c.status]||c.status||'inicial'}));
if(data.payments.some(p=>p.amount===undefined)){
  const legacy=data.payments;
  data.payments=[];
  legacy.forEach((p,i)=>{
    const k=data.cases.find(c=>c.clientId===p.clientId && (c.service===p.service || (p.service==='Taxes 2025' && c.service==='Declaración de impuestos')));
    if(k && Number(p.paid||0)>0){
      if(!k.serviceTotal && p.total) k.serviceTotal=Number(p.total);
      data.payments.push({id:9000+i,caseId:k.id,clientId:k.clientId,amount:Number(p.paid||0),method:'Other',date:'',note:'Migrado desde prototipo'});
    }
  });
}

const save=()=>localStorage.setItem(storeKey,JSON.stringify(data));
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clientById=id=>data.clients.find(c=>c.id===Number(id));
const clientName=id=>clientById(id)?.name||'Cliente';
const caseById=id=>data.cases.find(c=>c.id===Number(id));
const caseCollected=id=>data.payments.filter(p=>Number(p.caseId)===Number(id)).reduce((s,p)=>s+Number(p.amount||0),0);
const caseDiscountCredits=id=>data.payments.filter(p=>Number(p.caseId)===Number(id)).reduce((s,p)=>s+Number(p.discountCredit||0),0);
const casePaid=id=>caseCollected(id)+caseDiscountCredits(id);
const caseBalance=c=>Math.max(Number(c.serviceTotal||0)-casePaid(c.id),0);
const caseStandardPrice=c=>Number(c.serviceTotal||0);
const caseCashPrice=c=>Number(c.cashPrice ?? Math.max(caseStandardPrice(c)-Number(c.cashZelleDiscount||0),0));
const caseZellePrice=c=>Number(c.zellePrice ?? caseCashPrice(c));
const caseCardPrice=c=>Number(c.cardPrice ?? caseStandardPrice(c));
const caseCashDiscount=c=>Math.max(caseStandardPrice(c)-caseCashPrice(c),0);
const caseZelleDiscount=c=>Math.max(caseStandardPrice(c)-caseZellePrice(c),0);
const caseCashPayoff=c=>Math.max(caseBalance(c)-caseCashDiscount(c),0);
const caseZellePayoff=c=>Math.max(caseBalance(c)-caseZelleDiscount(c),0);

function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function dt(v){return v?new Date(v).toLocaleString('es-US',{dateStyle:'medium',timeStyle:'short'}):'—'}
function deadlineInfo(date){
  if(!date) return {label:'Sin deadline',className:'deadline-none'};
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(date+'T12:00:00'); d.setHours(0,0,0,0);
  const days=Math.ceil((d-today)/86400000);
  if(days<0) return {label:'Vencido · '+Math.abs(days)+' día'+(Math.abs(days)===1?'':'s'),className:'deadline-red'};
  if(days<=7) return {label:'Urgente · '+days+' día'+(days===1?'':'s'),className:'deadline-red'};
  if(days<=30) return {label:'Próximo · '+days+' días',className:'deadline-yellow'};
  return {label:'En tiempo · '+days+' días',className:'deadline-green'};
}
function logCaseEvent(caseId,text,type='info'){
  if(!caseId) return;
  data.history.unshift({id:Date.now()+Math.random(),caseId:Number(caseId),text,type,at:new Date().toISOString()});
  save();
}
function defaultChecklist(service=''){
  const s=service.toLowerCase();
  if(s.includes('impuesto')||s.includes('itin')) return ['Identificación vigente','SSN / ITIN','W-2 / 1099','Comprobantes adicionales','Declaración anterior (si aplica)'];
  if(s.includes('llc')||s.includes('negocio')) return ['Identificación del propietario','Nombre del negocio','Dirección comercial','Información de miembros / owners','Información para EIN'];
  if(s.includes('divorcio')) return ['Identificación','Certificado de matrimonio','Direcciones de las partes','Información financiera (si aplica)','Documentos de hijos (si aplica)'];
  if(s.includes('tradu')) return ['Documento original legible','Nombre completo del solicitante','Destino / agencia receptora'];
  if(s.includes('apost')) return ['Documento original/certificado','Identificación','País de destino'];
  if(s.includes('i-')||s.includes('n-400')||s.includes('daca')||s.includes('foia')||s.includes('inmigr')) return ['Identificación / pasaporte','Actas civiles aplicables','Evidencia de estatus / entrada','Documentos de soporte','Traducciones certificadas (si aplica)','Notificaciones USCIS / EOIR (si aplica)'];
  return ['Identificación','Formulario / intake','Documentos de soporte'];
}
function ensureCaseDocs(k){
  const key=String(k.id);
  if(!Array.isArray(data.documents[key])){
    data.documents[key]=defaultChecklist(k.service).map((name,i)=>({id:Date.now()+i,name,status:'Falta',reference:''}));
    save();
  }
  return data.documents[key];
}

function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)}
function todayISO(){return new Date().toISOString().slice(0,10)}
function taskState(t){
  if(t.done) return 'done';
  if(!t.date) return 'normal';
  const today=todayISO();
  if(t.date<today) return 'overdue';
  if(t.date===today) return 'today';
  return 'future';
}
function priorityRank(p){return p==='Alta'?0:p==='Media'?1:2}
function normalizeTime24(time=''){
  if(/^\d{2}:\d{2}$/.test(time)) return time;
  const m=String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(!m) return '09:00';
  let h=Number(m[1]); const min=m[2]; const ap=m[3].toUpperCase();
  if(ap==='PM' && h<12) h+=12;
  if(ap==='AM' && h===12) h=0;
  return String(h).padStart(2,'0')+':'+min;
}
function appointmentDateTime(a){
  const time=normalizeTime24(a.time||'09:00');
  const start=new Date(a.date+'T'+time+':00');
  const end=new Date(start.getTime()+Number(a.duration||60)*60000);
  return {start,end};
}
function gcalStamp(d){
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+'00';
}
function googleCalendarUrl(a){
  const client=clientById(a.clientId);
  const {start,end}=appointmentDateTime(a);
  const details=[
    'Cliente: '+(client?.name||''),
    client?.phone?'Teléfono: '+client.phone:'',
    client?.email?'Email: '+client.email:'',
    a.note?'Nota: '+a.note:'',
    '',
    'AGR Solutions LLC',
    '203-824-0351'
  ].filter(Boolean).join('\n');
  const params=new URLSearchParams({
    action:'TEMPLATE',
    text:'AGR Solutions LLC - '+(a.service||'Cita'),
    dates:gcalStamp(start)+'/'+gcalStamp(end),
    details,
    location:a.location||'294 Tyler Street, East Haven, CT 06512',
    ctz:'America/New_York'
  });
  return 'https://calendar.google.com/calendar/render?'+params.toString();
}
function formatApptTime(a){
  const {start,end}=appointmentDateTime(a);
  return start.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+'–'+end.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function localISODate(d){
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function nextWeekdayDate(target){
  const d=new Date();
  const diff=(target-d.getDay()+7)%7 || 7;
  d.setDate(d.getDate()+diff);
  return localISODate(d);
}
function parseWhatsAppAppointment(message=''){
  const raw=String(message||'').trim();
  const low=raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let date='';
  const today=new Date();
  if(/\bpasado manana\b/.test(low)){const d=new Date(today);d.setDate(d.getDate()+2);date=localISODate(d);}
  else if(/\bmanana\b/.test(low)){const d=new Date(today);d.setDate(d.getDate()+1);date=localISODate(d);}
  else if(/\bhoy\b/.test(low)) date=localISODate(today);
  if(!date){
    const iso=low.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    const us=low.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](20\d{2}|\d{2}))?\b/);
    if(iso) date=iso[1]+'-'+String(Number(iso[2])).padStart(2,'0')+'-'+String(Number(iso[3])).padStart(2,'0');
    else if(us){
      let y=us[3]?Number(us[3]):today.getFullYear(); if(y<100)y+=2000;
      date=y+'-'+String(Number(us[1])).padStart(2,'0')+'-'+String(Number(us[2])).padStart(2,'0');
    }
  }
  if(!date){
    const months={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
    const m=low.match(/\b(\d{1,2})\s*(?:de\s*)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s*(?:de\s*)?(20\d{2}))?\b/);
    if(m){date=localISODate(new Date(Number(m[3]||today.getFullYear()),months[m[2]],Number(m[1])));}
  }
  if(!date){
    const days={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
    for(const [name,num] of Object.entries(days)){if(new RegExp('\\b'+name+'\\b').test(low)){date=nextWeekdayDate(num);break;}}
  }
  let time='';
  let tm=low.match(/\b(?:a\s+las?\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if(tm){
    let h=Number(tm[1]); const min=tm[2]||'00'; const ap=tm[3];
    if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;
    time=String(h).padStart(2,'0')+':'+min;
  } else {
    tm=low.match(/\b(?:a\s+las?\s*)?([01]?\d|2[0-3]):([0-5]\d)\b/);
    if(tm) time=String(Number(tm[1])).padStart(2,'0')+':'+tm[2];
  }
  const digits=raw.replace(/\D/g,'');
  let phone='';
  const phoneMatch=raw.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  if(phoneMatch) phone=phoneMatch[0].replace(/\D/g,'').slice(-10);
  let clientId=null;
  if(phone) clientId=data.clients.find(c=>String(c.phone||'').replace(/\D/g,'').slice(-10)===phone)?.id||null;
  if(!clientId){
    const candidates=data.clients.filter(c=>c.name && low.includes(c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
    if(candidates.length) clientId=candidates[0].id;
  }
  let service='Cita por WhatsApp';
  if(/inmigr|uscis|residencia|ciudadania|asilo|permiso de trabajo|i-\d|n-400|daca/.test(low)) service='Consulta de inmigración';
  else if(/tax|impuesto|irs|itin|w-2|1099/.test(low)) service='Consulta de impuestos / IRS';
  else if(/llc|negocio|empresa|ein/.test(low)) service='Consulta de negocio / LLC';
  else if(/dmv|licencia|registro|placa/.test(low)) service='Consulta DMV';
  else if(/divorcio|custodia|child support/.test(low)) service='Documentos de divorcio / familia';
  else if(/notar|apostill|traducc/.test(low)) service='Notaría / traducción / apostilla';
  return {
    clientId:clientId||'',
    date,
    time,
    duration:60,
    service,
    location:'294 Tyler Street, East Haven, CT 06512',
    note:'Mensaje original de WhatsApp: '+raw
  };
}
function openWhatsAppAppointment(){
  const d=$('#whatsappAppointmentDialog');
  const ta=$('#whatsappAppointmentText');
  if(!d||!ta) return;
  ta.value='';
  d.showModal();
  setTimeout(()=>ta.focus(),50);
}
function nextInvoiceNumber(){
  const year=new Date().getFullYear();
  const nums=data.cases
    .map(c=>String(c.invoiceNumber||''))
    .map(v=>v.match(/^AGR-(\d{4})-(\d+)$/))
    .filter(Boolean)
    .filter(m=>Number(m[1])===year)
    .map(m=>Number(m[2]));
  const next=(nums.length?Math.max(...nums):0)+1;
  return `AGR-${year}-${String(next).padStart(4,'0')}`;
}
function statusLabel(s){return statusLabels[s]||s}
function badgeClass(s){
  if(['aprobado','completado'].includes(s)) return 'completado';
  if(['enviado','espera_uscis'].includes(s)) return 'proceso';
  if(['evidencia','revision','rfe'].includes(s)) return 'pendiente';
  return 'nuevo';
}

function switchView(view){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const labels={dashboard:'Dashboard',clients:'Clientes',cases:'Casos & trámites',services:'Servicios',payments:'Pagos',appointments:'Citas',tasks:'Tareas'};
  $('#pageTitle').textContent=labels[view]||'AGR CRM';
}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));

function render(){
  $('#statClients').textContent=data.clients.length;
  $('#statCases').textContent=data.cases.filter(c=>!['completado','aprobado'].includes(c.status)).length;
  const bal=data.cases.reduce((s,c)=>s+caseBalance(c),0);
  $('#statBalance').textContent=money(bal);
  const openTasks=data.tasks.filter(t=>!t.done);
  const urgentTasks=openTasks.filter(t=>['overdue','today'].includes(taskState(t)));
  const taskStat=$('#statTasks');
  if(taskStat) taskStat.textContent=urgentTasks.length;
  renderDashboardAlerts();
  renderTasks();

  $('#recentCases').innerHTML=data.cases.slice(0,5).map(c=>`
    <tr class="clickable-row" data-case-id="${c.id}">
      <td><strong>${clientName(c.clientId)}</strong></td>
      <td>${c.service}</td>
      <td><span class="badge ${badgeClass(c.status)}">${statusLabel(c.status)}</span></td>
    </tr>`).join('');

  const today=todayISO();
  const sortedAppointments=[...data.appointments].sort((a,b)=>(a.date+normalizeTime24(a.time)).localeCompare(b.date+normalizeTime24(b.time)));
  const upcomingAppointments=sortedAppointments.filter(a=>a.date>=today);
  const todayAppointments=upcomingAppointments.filter(a=>a.date===today);
  $('#statAppointments').textContent=upcomingAppointments.length;
  const apptCard=a=>{
    const d=new Date(a.date+'T12:00:00');
    const day=d.toLocaleDateString('es-US',{day:'2-digit'});
    const mon=d.toLocaleDateString('es-US',{month:'short'}).replace('.','');
    return `<div class="appointment appointment-rich">
      <div class="appointment-date">${day}<br><small>${mon}</small></div>
      <div class="appointment-info">
        <strong>${esc(clientName(a.clientId))}</strong>
        <span>${esc(a.service)} · ${formatApptTime(a)}</span>
        <small>${esc(a.location||'294 Tyler Street, East Haven, CT 06512')}</small>
      </div>
      <a class="calendar-btn" href="${googleCalendarUrl(a)}" target="_blank" rel="noopener">Google Calendar</a>
    </div>`;
  };
  const todayBox=$('#todayAppointmentList');
  if(todayBox) todayBox.innerHTML=todayAppointments.length?todayAppointments.map(apptCard).join(''):'<p class="empty-state">No tienes citas registradas para hoy.</p>';
  $('#appointmentList').innerHTML=upcomingAppointments.slice(0,5).map(apptCard).join('')||'<p>No hay próximas citas.</p>';
  $('#appointmentsTable').innerHTML=upcomingAppointments.map(apptCard).join('')||'<p>No hay citas próximas.</p>';

  renderClients();
  renderCases();
  renderServices();
  renderPayments();
  bindCaseOpeners();
}


function renderDashboardAlerts(){
  const box=$('#dashboardAlerts');
  if(!box) return;
  const today=todayISO();
  const taskAlerts=data.tasks.filter(t=>!t.done && (!t.date || t.date<=today)).sort((a,b)=>{
    const sa=taskState(a), sb=taskState(b);
    const order={overdue:0,today:1,normal:2,future:3};
    return (order[sa]-order[sb]) || (priorityRank(a.priority)-priorityRank(b.priority));
  });
  const deadlineAlerts=data.cases.filter(k=>k.deadline && !['completado','aprobado'].includes(k.status))
    .map(k=>({case:k,info:deadlineInfo(k.deadline)}))
    .filter(x=>['deadline-red','deadline-yellow'].includes(x.info.className));
  const balanceAlerts=data.cases.filter(k=>caseBalance(k)>0 && !['completado'].includes(k.status)).slice(0,5);
  const rows=[];
  taskAlerts.slice(0,6).forEach(t=>rows.push({
    kind:'task',
    title:t.title,
    meta:(t.date||'Sin fecha')+' · '+(t.priority||'Media'),
    tone:taskState(t)==='overdue'?'red':taskState(t)==='today'?'yellow':'gray',
    id:t.id
  }));
  deadlineAlerts.slice(0,5).forEach(x=>rows.push({
    kind:'case',
    title:clientName(x.case.clientId)+' — '+x.case.service,
    meta:'Deadline: '+x.case.deadline+' · '+x.info.label,
    tone:x.info.className==='deadline-red'?'red':'yellow',
    id:x.case.id
  }));
  if(!rows.length){
    box.innerHTML='<div class="alert-empty">No hay tareas vencidas ni deadlines próximos.</div>';
    return;
  }
  box.innerHTML=rows.map(r=>`<button type="button" class="alert-row alert-${r.tone}" data-alert-kind="${r.kind}" data-alert-id="${r.id}">
    <span class="alert-dot"></span>
    <span><strong>${esc(r.title)}</strong><small>${esc(r.meta)}</small></span>
  </button>`).join('');
  box.querySelectorAll('[data-alert-kind="case"]').forEach(el=>el.onclick=()=>{
    const k=caseById(Number(el.dataset.alertId)); if(k) openModal('case-edit',k);
  });
  box.querySelectorAll('[data-alert-kind="task"]').forEach(el=>el.onclick=()=>switchView('tasks'));
}
function renderTasks(){
  const box=$('#tasksList');
  if(!box) return;
  const rows=[...data.tasks].sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    const sa=taskState(a), sb=taskState(b);
    const order={overdue:0,today:1,normal:2,future:3,done:4};
    return (order[sa]-order[sb]) || (priorityRank(a.priority)-priorityRank(b.priority)) || String(a.date||'').localeCompare(String(b.date||''));
  });
  box.innerHTML=rows.length?rows.map(t=>{
    const k=t.caseId?caseById(t.caseId):null;
    return `<article class="task-card ${taskState(t)}">
      <button type="button" class="task-check" data-task-toggle="${t.id}" aria-label="Completar tarea">${t.done?'✓':''}</button>
      <div class="task-body">
        <strong>${esc(t.title)}</strong>
        <span>${t.date?esc(t.date):'Sin fecha'} · ${esc(t.priority||'Media')}${k?' · '+esc(clientName(k.clientId))+' — '+esc(k.service):''}</span>
        ${t.note?`<small>${esc(t.note)}</small>`:''}
      </div>
    </article>`;
  }).join(''):'<p class="empty-state">No hay tareas registradas.</p>';
  box.querySelectorAll('[data-task-toggle]').forEach(btn=>btn.onclick=()=>{
    const t=data.tasks.find(x=>x.id===Number(btn.dataset.taskToggle)); if(!t) return;
    t.done=!t.done; t.completedAt=t.done?new Date().toISOString():''; save(); render(); 
  });
}
function renderGlobalSearch(q=''){
  const box=$('#globalSearchResults');
  if(!box) return;
  const term=q.trim().toLowerCase();
  if(term.length<2){box.hidden=true;box.innerHTML='';return;}
  const results=[];
  data.clients.forEach(c=>{
    const text=[c.name,c.phone,c.email].join(' ').toLowerCase();
    if(text.includes(term)) results.push({type:'Cliente',title:c.name,meta:[c.phone,c.email].filter(Boolean).join(' · '),action:'client',id:c.id});
  });
  data.cases.forEach(k=>{
    const client=clientById(k.clientId);
    const text=[client?.name,k.service,k.invoiceNumber,k.receiptNumber,k.aNumber,k.status].join(' ').toLowerCase();
    if(text.includes(term)) results.push({type:'Caso',title:(client?.name||'Cliente')+' — '+k.service,meta:[k.invoiceNumber,k.receiptNumber,k.aNumber].filter(Boolean).join(' · '),action:'case',id:k.id});
  });
  box.innerHTML=results.slice(0,12).map(r=>`<button type="button" class="search-result" data-search-action="${r.action}" data-search-id="${r.id}">
    <span>${r.type}</span><strong>${esc(r.title)}</strong><small>${esc(r.meta||'')}</small>
  </button>`).join('')||'<div class="search-empty">Sin resultados.</div>';
  box.hidden=false;
  box.querySelectorAll('[data-search-action="case"]').forEach(el=>el.onclick=()=>{
    box.hidden=true; const k=caseById(Number(el.dataset.searchId)); if(k) openModal('case-edit',k);
  });
}
function renderClients(filter=''){
  const q=filter.toLowerCase();
  $('#clientsTable').innerHTML=data.clients.filter(c=>[c.name,c.phone,c.email].join(' ').toLowerCase().includes(q)).map(c=>{
    const cases=data.cases.filter(x=>x.clientId===c.id).length;
    const bal=data.cases.filter(x=>x.clientId===c.id).reduce((s,k)=>s+caseBalance(k),0);
    return `<tr><td><strong>${c.name}</strong></td><td>${c.phone}</td><td>${c.email||'—'}</td><td>${cases}</td><td>${money(bal)}</td></tr>`
  }).join('');
}

function renderCases(){
  const visibleStatuses=['inicial','evidencia','preparacion','revision','enviado','espera_uscis','rfe','aprobado','completado'];
  $('#caseBoard').innerHTML=visibleStatuses.map(status=>{
    const rows=data.cases.filter(c=>c.status===status);
    return `<section class="column"><div class="column-head"><strong>${statusLabel(status)}</strong><span>${rows.length}</span></div>
      ${rows.map(c=>`<article class="case-card clickable-case" data-case-id="${c.id}">
        <h3>${clientName(c.clientId)}</h3>
        <p>${c.service}</p>
        <small>${c.deadline?'Deadline: '+c.deadline:'Sin deadline'}</small>
        <div style="margin-top:10px;font-size:.78rem;font-weight:700;color:#071b3d">Abrir caso →</div>
      </article>`).join('')||'<small>Sin casos</small>'}
    </section>`
  }).join('');
  bindCaseOpeners();
}

function renderServices(){
  $('#servicesTable').innerHTML=data.services.map(s=>`
    <tr class="clickable-row" data-service-id="${s.id}">
      <td><strong>${s.name}</strong></td>
      <td>${s.category||'—'}</td>
      <td>${s.price?money(s.price):'Variable'}</td>
      <td>${s.active===false?'No':'Sí'}</td>
    </tr>`).join('');
  bindServiceOpeners();
}

function renderPayments(){
  $('#paymentsTable').innerHTML=data.cases.map(c=>`<tr class="clickable-row" data-case-payment-id="${c.id}">
    <td><strong>${clientName(c.clientId)}</strong></td>
    <td>${c.service}</td>
    <td>${money(c.serviceTotal||0)}</td>
    <td>${money(casePaid(c.id))}</td>
    <td><strong>${money(caseBalance(c))}</strong></td>
  </tr>`).join('');
  bindCasePaymentOpeners();
}
$('#clientSearch').addEventListener('input',e=>renderClients(e.target.value));

const dialog=$('#recordDialog'), form=$('#recordForm'), fields=$('#formFields'), modalTitle=$('#modalTitle');
let mode='client';
let editingCaseId=null;
let editingPaymentId=null;
let editingServiceId=null;

const templates={
  client:()=>[['name','Nombre completo','text','full'],['phone','Teléfono','tel',''],['email','Email','email','']],
  case:()=>[
    ['clientId','Cliente','client',''],
    ['service','Servicio / trámite','serviceSelect','full'],
    ['status','Estado inicial','status',''],
    ['deadline','Deadline / fecha límite','date',''],
    ['receiptNumber','Receipt Number (cuando se reciba)','text',''],
    ['aNumber','A-Number (opcional)','text',''],
    ['serviceTotal','Precio estándar del servicio','number',''],
    ['cashPrice','Precio Cash','number',''],
    ['zellePrice','Precio Zelle','number',''],
    ['cardPrice','Precio Tarjeta / Stripe','number',''],
    ['initialPayment','Pago inicial requerido','number',''],
    ['invoiceNumber','Número de factura','text',''],
    ['stripePaymentLink','Enlace Stripe','url','full']
  ],
  caseEdit:()=>[
    ['status','Estado','status',''],
    ['deadline','Deadline / fecha límite','date',''],
    ['receiptNumber','Receipt Number (cuando se reciba)','text',''],
    ['aNumber','A-Number (opcional)','text','']
  ],
  service:()=>[['name','Nombre del servicio','text','full'],['category','Categoría','text',''],['price','Precio sugerido','number',''],['active','Activo','activeSelect','']],
  payment:()=>[['caseId','Caso / trámite','caseSelect','full'],['amount','Monto del pago','number',''],['method','Forma de pago','paymentMethod',''],['date','Fecha del pago','date',''],['note','Nota / referencia','text','full']],
  appointment:()=>[
    ['clientId','Cliente','client',''],
    ['date','Fecha','date',''],
    ['time','Hora','time',''],
    ['duration','Duración','durationSelect',''],
    ['service','Motivo / servicio','text','full'],
    ['location','Lugar','text','full'],
    ['note','Nota interna','text','full']
  ],
  task:()=>[['title','Tarea','text','full'],['date','Fecha','date',''],['priority','Prioridad','taskPriority',''],['caseId','Vincular a caso (opcional)','caseOptional','full'],['note','Nota','text','full']]
};

function fieldHTML([name,label,type,cls],values={}){
  let input='';
  const val=values[name] ?? '';
  if(type==='client') {
    input=`<select name="${name}" required><option value="">Selecciona</option>${data.clients.map(c=>`<option value="${c.id}" ${Number(val)===c.id?'selected':''}>${c.name}</option>`).join('')}</select>`;
  } else if(type==='status') {
    input=`<select name="${name}" required>${statusOrder.map(s=>`<option value="${s}" ${val===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select>`;
  } else if(type==='serviceSelect') {
    input=`<select name="${name}" required><option value="">Selecciona un servicio</option>${data.services.filter(s=>s.active!==false || s.name===val).map(s=>`<option value="${s.name}" data-price="${s.price||0}" ${val===s.name?'selected':''}>${s.name}</option>`).join('')}</select>`;
  } else if(type==='activeSelect') {
    input=`<select name="${name}"><option value="true" ${val!==false?'selected':''}>Sí</option><option value="false" ${val===false?'selected':''}>No</option></select>`;
  } else if(type==='caseSelect') {
    input=`<select name="${name}" required><option value="">Selecciona un caso</option>${data.cases.filter(k=>caseBalance(k)>0 || Number(val)===k.id).map(k=>`<option value="${k.id}" ${Number(val)===k.id?'selected':''}>${clientName(k.clientId)} — ${k.service} — saldo ${money(caseBalance(k))}</option>`).join('')}</select>`;
  } else if(type==='durationSelect') {
    const durations=[30,45,60,90,120];
    input=`<select name="${name}" required>${durations.map(m=>`<option value="${m}" ${Number(val||60)===m?'selected':''}>${m} minutos</option>`).join('')}</select>`;
  } else if(type==='caseOptional') {
    input=`<select name="${name}"><option value="">Sin vincular</option>${data.cases.filter(k=>!['completado'].includes(k.status)).map(k=>`<option value="${k.id}" ${Number(val)===k.id?'selected':''}>${clientName(k.clientId)} — ${k.service}</option>`).join('')}</select>`;
  } else if(type==='taskPriority') {
    const ps=['Alta','Media','Baja'];
    input=`<select name="${name}" required>${ps.map(p=>`<option value="${p}" ${val===p?'selected':''}>${p}</option>`).join('')}</select>`;
  } else if(type==='paymentMethod') {
    const methods=['Cash','Debit Card','Credit Card','Zelle','Check','ACH / Bank Transfer','Other'];
    input=`<select name="${name}" required><option value="">Selecciona</option>${methods.map(m=>`<option value="${m}" ${val===m?'selected':''}>${m}</option>`).join('')}</select>`;
  } else {
    input=`<input name="${name}" type="${type}" value="${String(val).replace(/"/g,'&quot;')}" ${['name','phone','service','date'].includes(name)?'required':''}>`;
  }
  return `<label class="${cls}">${label}${input}</label>`;
}

function buildClientUpdate(caseValues){
  const client=clientById(caseValues.clientId);
  const name=client?.name||'cliente';
  const service=caseValues.service||'su trámite';
  const status=statusLabel(caseValues.status||'inicial');
  const next=caseValues.next?.trim();
  const paymentLink=caseValues.stripePaymentLink?.trim();
  const initialPayment=Number(caseValues.initialPayment||0);
  const invoiceNumber=caseValues.invoiceNumber?.trim();
  const paid=caseValues.id?casePaid(caseValues.id):0;
  const initialStillDue=Math.max(initialPayment-paid,0);
  const earlyStage=['inicial','evidencia','preparacion','revision'].includes(caseValues.status||'inicial');
  const showInitialPayment=initialPayment>0 && initialStillDue>0 && earlyStage;
  return `Hola ${name}, le compartimos una actualización de su caso con AGR Solutions LLC.

Servicio / trámite: ${service}${invoiceNumber?`\nReferencia: ${invoiceNumber}`:''}
Estado actual: ${status}${next?`\nPróximo paso: ${next}`:''}${showInitialPayment?`\n\nPara continuar con el inicio de su proceso, queda pendiente un pago inicial de ${money(initialStillDue)}.

Opciones de pago:
• Cash
• Zelle
• Credit / Debit Card${paymentLink?`\n\nPara pagar con tarjeta de crédito o débito, utilice el siguiente enlace seguro de Stripe:\n${paymentLink}`:''}`:''}

Si USCIS ha emitido documentos o notificaciones relacionados con su caso y se encuentran disponibles, los encontrará adjuntos a este correo.

Si necesita comunicarse con nosotros, puede responder a este mensaje.

AGR Solutions LLC
294 Tyler Street, East Haven, CT 06512
203-824-0351
https://agrsolutionsllc.com`;
}

function getCaseValuesFromForm(){
  const fd=Object.fromEntries(new FormData(form));
  const existing=editingCaseId?caseById(editingCaseId):null;
  return {
    ...(existing||{}),
    id:existing?.id||null,
    clientId:Number(fd.clientId||existing?.clientId||0),
    service:fd.service||existing?.service||'',
    status:fd.status||existing?.status||'inicial',
    next:existing?.next||'',
    deadline:fd.deadline!==undefined?fd.deadline:(existing?.deadline||''),
    receiptNumber:fd.receiptNumber!==undefined?fd.receiptNumber:(existing?.receiptNumber||''),
    aNumber:fd.aNumber!==undefined?fd.aNumber:(existing?.aNumber||''),
    cashPrice:fd.cashPrice!==undefined?fd.cashPrice:(existing?.cashPrice ?? caseCashPrice(existing||{})),
    zellePrice:fd.zellePrice!==undefined?fd.zellePrice:(existing?.zellePrice ?? caseZellePrice(existing||{})),
    cardPrice:fd.cardPrice!==undefined?fd.cardPrice:(existing?.cardPrice ?? caseCardPrice(existing||{})),
    initialPayment:fd.initialPayment!==undefined?fd.initialPayment:(existing?.initialPayment||0),
    invoiceNumber:fd.invoiceNumber||existing?.invoiceNumber||'',
    stripePaymentLink:fd.stripePaymentLink||existing?.stripePaymentLink||''
  };
}

function makeCaseSyncToken(){
  try{
    if(crypto?.randomUUID) return crypto.randomUUID();
    if(crypto?.getRandomValues){
      const a=new Uint32Array(4); crypto.getRandomValues(a);
      return Array.from(a,x=>x.toString(16).padStart(8,'0')).join('');
    }
  }catch(_){}
  return 'agr-'+Date.now()+'-'+Math.random().toString(36).slice(2);
}
function ensureCaseSyncToken(k){
  if(!k.syncToken){
    k.syncToken=makeCaseSyncToken();
    save();
  }
  return k.syncToken;
}
async function syncStripePaymentsForCase(k,{silent=true}={}){
  if(!k?.id) return {added:0};
  const syncToken=ensureCaseSyncToken(k);
  const response=await fetch(STRIPE_SYNC_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({caseId:k.id,syncToken})
  });
  let payload={};
  try{payload=await response.json();}catch(_){}
  if(!response.ok) throw new Error(payload.error||payload.message||('Error '+response.status));
  const existing=new Set(data.payments.map(p=>p.stripePaymentIntentId).filter(Boolean));
  let added=0;
  for(const p of (payload.payments||[])){
    if(!p?.id || existing.has(p.id) || Number(p.amount||0)<=0) continue;
    data.payments.push({
      id:Date.now()+added,
      caseId:Number(k.id),
      clientId:k.clientId,
      amount:Number(p.amount||0),
      discountCredit:0,
      method:'Credit / Debit Card',
      date:p.created?new Date(Number(p.created)*1000).toISOString().slice(0,10):new Date().toISOString().slice(0,10),
      note:'Pago Stripe confirmado automáticamente'+(p.invoiceNumber?' · '+p.invoiceNumber:''),
      stripePaymentIntentId:p.id,
      stripeSynced:true
    });
    existing.add(p.id);
    added++;
  }
  if(added){
    save();
    logCaseEvent(k.id,added===1?'Pago Stripe sincronizado automáticamente':'Pagos Stripe sincronizados automáticamente ('+added+')','payment');
  }
  return {added};
}

async function createStripePaymentLinkForCase(values){
  const amount=Number(values.initialPayment||0);
  if(!amount || amount<=0) return '';
  if(values.stripePaymentLink) return values.stripePaymentLink;

  const client=clientById(values.clientId);
  const response=await fetch(STRIPE_BACKEND_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      amount,
      caseId: values.id || editingCaseId || 'new',
      clientName: client?.name||'',
      clientEmail: client?.email||'',
      service: values.service||'AGR Solutions LLC',
      invoiceNumber: values.invoiceNumber||'',
      syncToken: values.syncToken||''
    })
  });
  const result=await response.json();
  if(!response.ok || !result.url) throw new Error(result.error||'No se pudo crear el enlace.');
  return result.url;
}

function refreshClientNotification(){
  const box=document.querySelector('#clientNotificationBox');
  if(!box) return;
  const values=getCaseValuesFromForm();
  const client=clientById(values.clientId);
  const message=buildClientUpdate(values);
  const phone=(client?.phone||'').replace(/\D/g,'');
  const email=(client?.email||'').trim();

  const preview=box.querySelector('.notification-preview');
  const wa=box.querySelector('.notify-whatsapp');
  const mail=box.querySelector('.notify-email');

  if(preview) preview.textContent=message;

  if(wa){
    if(phone){
      const normalized=phone.length===10?'1'+phone:phone;
      wa.href='https://wa.me/'+normalized+'?text='+encodeURIComponent(message);
      wa.classList.remove('disabled');
      wa.removeAttribute('aria-disabled');
    }else{
      wa.href='#';
      wa.classList.add('disabled');
      wa.setAttribute('aria-disabled','true');
    }
  }

  if(mail){
    if(email){
      const subject='Actualización de su caso - AGR Solutions LLC';
      mail.href='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);
      mail.target='_blank';
      mail.rel='noopener';
      mail.classList.remove('disabled');
      mail.removeAttribute('aria-disabled');
    }else{
      mail.href='#';
      mail.classList.add('disabled');
      mail.setAttribute('aria-disabled','true');
    }
  }

  const contact=box.querySelector('.notification-contact');
  if(contact){
    contact.textContent=`WhatsApp: ${client?.phone||'No registrado'} · Email: ${client?.email||'No registrado'}`;
  }
}


function renderCaseSetupCard(k){
  const existing=$('#caseSetupCard');
  if(existing) existing.remove();
  const formGrid=$('#formFields');
  if(!formGrid) return;
  const client=clientById(k.clientId);
  formGrid.insertAdjacentHTML('afterbegin',`
    <section id="caseSetupCard" class="case-setup-card full">
      <div class="setup-head">
        <div><span>DATOS DEL EXPEDIENTE</span><strong>Configurados al crear el caso</strong></div>
        <small>Estos datos se conservan durante todo el proceso.</small>
      </div>
      <div class="setup-grid">
        <div><span>Cliente</span><strong>${esc(client?.name||'—')}</strong></div>
        <div><span>Servicio</span><strong>${esc(k.service||'—')}</strong></div>
        <div><span>Factura</span><strong>${esc(k.invoiceNumber||'—')}</strong></div>
        <div><span>Total del servicio</span><strong>${money(k.serviceTotal||0)}</strong></div>
        <div><span>Pago inicial acordado</span><strong>${k.initialPayment?money(k.initialPayment):'No establecido'}</strong></div>
        <div><span>Pagado hasta hoy</span><strong>${money(casePaid(k.id))}</strong></div>
      </div>
    </section>`);
}
function renderCaseSummarySnapshot(k){
  const existing=$('#caseSummarySnapshot');
  if(existing) existing.remove();
  const formGrid=$('#formFields');
  if(!formGrid) return;
  const info=deadlineInfo(k.deadline||'');
  formGrid.insertAdjacentHTML('afterbegin',`
    <div id="caseSummarySnapshot" class="case-summary-snapshot full">
      <div><span>Total</span><strong>${money(k.serviceTotal||0)}</strong></div>
      <div><span>Pagado</span><strong>${money(casePaid(k.id))}</strong></div>
      <div><span>Saldo</span><strong>${money(caseBalance(k))}</strong></div>
      <div><span>Deadline</span><strong class="deadline-pill ${info.className}">${esc(info.label)}</strong></div>
    </div>`);
}
function setCaseTab(tab){
  $$('.case-tab').forEach(b=>b.classList.toggle('active',b.dataset.caseTab===tab));
  $$('[data-case-pane]').forEach(p=>{
    const active=p.dataset.casePane===tab;
    p.hidden=!active;
    p.classList.toggle('active',active);
  });
}
function renderCaseDocuments(k){
  const pane=$('#caseDocumentsPane');
  if(!pane) return;
  const docs=ensureCaseDocs(k);
  const received=docs.filter(d=>d.status==='Recibido').length;
  pane.innerHTML=`
    <div class="workspace-head">
      <div><span class="workspace-kicker">REQUISITOS</span><h3>Checklist del caso</h3></div>
      <span class="workspace-count">${received}/${docs.length} recibidos</span>
    </div>
    <p class="requirements-intro">Este checklist es solo para controlar qué falta. Los archivos reales permanecen en tus carpetas organizadas por cliente.</p>
    <div class="requirements-list">${docs.map(d=>`
      <div class="requirement-row" data-doc-id="${d.id}">
        <div class="requirement-name">
          <span class="requirement-dot ${d.status==='Recibido'?'done':d.status==='No aplica'?'na':'missing'}"></span>
          <strong>${esc(d.name)}</strong>
        </div>
        <select class="doc-status">
          ${['Falta','Recibido','No aplica'].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>`).join('')}</div>`;
  $$('.requirement-row').forEach(row=>{
    const id=Number(row.dataset.docId);
    row.querySelector('.doc-status').onchange=e=>{
      const d=docs.find(x=>x.id===id); if(!d) return;
      d.status=e.target.value;
      save();
      logCaseEvent(k.id,`Requisito “${d.name}” → ${d.status}`,'requirement');
      renderCaseDocuments(k);
      renderCaseHistory(k);
    };
  });
}

function buildBalanceReminder(k,requestedAmount){
  const client=clientById(k.clientId);
  const name=client?.name||'cliente';
  const balance=Math.max(caseCardPrice(k)-casePaid(k.id),0);
  const invoice=k.invoiceNumber?.trim();
  const requested=Math.min(balance,Math.max(0,Number(requestedAmount||balance)));
  const hasLiveLink=k.balancePaymentLinkMode==='live' && k.balancePaymentLink && Number(k.balancePaymentLinkAmount||0)===Number(requested);
  const paymentLink=hasLiveLink?(k.balancePaymentLink||'').trim():'';
  const paymentText=requested<balance
    ? 'En este momento puede realizar un pago parcial de '+money(requested)+'. Después de este pago, su saldo restante será de '+money(balance-requested)+'.'
    : 'Puede realizar el pago completo de '+money(requested)+'.';
  return 'Hola '+name+', le recordamos que actualmente tiene un saldo pendiente total de '+money(balance)+' con AGR Solutions LLC'+(invoice?' correspondiente a la referencia '+invoice:'')+'.\n\n'+paymentText+'\n\nPuede realizar su pago por:\n• Cash\n• Zelle\n• Credit / Debit Card'+(paymentLink?'\n\nPara pagar con tarjeta de crédito o débito, utilice este enlace seguro de pago:\n'+paymentLink:'\n\nEl enlace seguro para pago con tarjeta se generará desde el CRM por el monto seleccionado.')+'\n\nSi ya realizó este pago, por favor ignore este mensaje o envíenos su comprobante.\n\nGracias,\nAGR Solutions LLC\n294 Tyler Street, East Haven, CT 06512\n203-824-0351';
}

async function ensureBalancePaymentLink(k,requestedAmount){
  const balance=Math.max(caseCardPrice(k)-casePaid(k.id),0);
  const amount=Number(requestedAmount||0);
  if(balance<=0) return '';
  if(!Number.isFinite(amount) || amount<=0) throw new Error('Ingresa un monto válido.');
  if(amount>balance) throw new Error('El monto no puede ser mayor que el saldo pendiente de '+money(balance)+'.');
  if(k.balancePaymentLinkMode==='live' && k.balancePaymentLink && Number(k.balancePaymentLinkAmount||0)===Number(amount)) return k.balancePaymentLink;
  const client=clientById(k.clientId);
  const syncToken=ensureCaseSyncToken(k);
  const response=await fetch(STRIPE_BACKEND_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      amount,
      caseId:k.id,
      clientName:client?.name||'',
      clientEmail:client?.email||'',
      service:(k.service||'AGR Solutions LLC')+(amount<balance?' · Pago parcial':' · Saldo pendiente'),
      invoiceNumber:k.invoiceNumber||'',
      syncToken
    })
  });
  let payload={};
  try{payload=await response.json();}catch(_){}
  if(!response.ok) throw new Error(payload.error||payload.message||('Error '+response.status));
  const url=payload.url||payload.paymentLink||payload.payment_link||'';
  if(!url) throw new Error('Stripe no devolvió un enlace de pago.');
  if(payload.livemode!==true) throw new Error('Stripe devolvió un enlace de prueba. No se guardó.');
  k.balancePaymentLink=url;
  k.balancePaymentLinkAmount=amount;
  k.balancePaymentLinkMode='live';
  k.balancePaymentLinkCreatedAt=new Date().toISOString();
  save();
  return url;
}

function balanceReminderHTML(k){
  const balance=Math.max(caseCardPrice(k)-casePaid(k.id),0);
  if(balance<=0) return '<div class="balance-reminder paid"><strong>Saldo pagado</strong><span>Este caso no tiene saldo pendiente.</span></div>';
  const client=clientById(k.clientId);
  const phone=(client?.phone||'').replace(/\D/g,'');
  const email=(client?.email||'').trim();
  const savedAmount=(k.balancePaymentLinkMode==='live' && Number(k.balancePaymentLinkAmount||0)>0 && Number(k.balancePaymentLinkAmount||0)<=balance)
    ? Number(k.balancePaymentLinkAmount)
    : balance;
  const hasBalanceLink=Boolean(k.balancePaymentLinkMode==='live' && k.balancePaymentLink && Number(k.balancePaymentLinkAmount||0)===savedAmount);
  const message=buildBalanceReminder(k,savedAmount);
  const normalized=phone?(phone.length===10?'1'+phone:phone):'';
  const waHref=normalized?'https://wa.me/'+normalized+'?text='+encodeURIComponent(message):'#';
  const smsHref=normalized?'sms:+'+normalized+'?body='+encodeURIComponent(message):'#';
  const subject='Recordatorio de pago · '+(k.invoiceNumber||'AGR')+' · '+money(savedAmount);
  const mailHref=email?'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message):'#';
  return '<section class="balance-reminder">'+
    '<div class="balance-reminder-head"><div><span class="workspace-kicker">RECORDATORIO DE SALDO</span><strong>Saldo pendiente total</strong></div><strong class="balance-amount">'+money(balance)+'</strong></div>'+
    '<div class="balance-payment-picker">'+
      '<label>Monto a cobrar ahora</label>'+
      '<div class="balance-payment-picker-row"><span>$</span><input class="balance-payment-amount" type="number" min="0.01" max="'+balance.toFixed(2)+'" step="0.01" value="'+savedAmount.toFixed(2)+'"><button type="button" class="secondary balance-use-full">Usar saldo completo</button></div>'+
      '<small>Puede ser un pago parcial. Máximo disponible: '+money(balance)+'</small>'+
    '</div>'+
    '<div class="balance-preview">'+esc(message)+'</div>'+
    '<div class="balance-card-link-row">'+
      (hasBalanceLink
        ? '<a class="balance-card-link" href="'+esc(k.balancePaymentLink)+'" target="_blank" rel="noopener">Abrir enlace por '+money(savedAmount)+' ↗</a>'
        : '<button type="button" class="primary balance-create-link">Crear enlace para pagar '+money(savedAmount)+'</button>')+
      '<small class="balance-link-status" aria-live="polite">'+(hasBalanceLink?'Enlace Stripe listo por '+money(savedAmount)+'.':'')+'</small>'+
    '</div>'+
    '<div class="notification-actions">'+
      '<a class="notify-btn notify-whatsapp balance-wa '+(phone?'':'disabled')+'" href="'+waHref+'" target="_blank" rel="noopener">WhatsApp · saldo</a>'+
      '<a class="notify-btn notify-sms balance-sms '+(phone?'':'disabled')+'" href="'+smsHref+'">SMS · saldo</a>'+
      '<a class="notify-btn notify-email balance-mail '+(email?'':'disabled')+'" href="'+mailHref+'" target="_blank" rel="noopener">Correo · saldo</a>'+
      '<button type="button" class="notify-btn notify-copy balance-copy">Copiar mensaje</button>'+
    '</div>'+
    '<small class="copy-status" aria-live="polite"></small>'+
    '<small class="notification-note">El mensaje muestra el saldo total y, si corresponde, el monto parcial solicitado.</small>'+
  '</section>';
}

function bindBalanceReminder(k,root){
  root=root||document;
  const amountInput=root.querySelector('.balance-payment-amount');
  const useFull=root.querySelector('.balance-use-full');
  const wa=root.querySelector('.balance-wa');
  const sms=root.querySelector('.balance-sms');
  const mail=root.querySelector('.balance-mail');
  const copy=root.querySelector('.balance-copy');
  const createLink=root.querySelector('.balance-create-link');
  const status=root.querySelector('.copy-status');
  const linkStatus=root.querySelector('.balance-link-status');
  const preview=root.querySelector('.balance-preview');
  const balance=Math.max(caseCardPrice(k)-casePaid(k.id),0);
  const client=clientById(k.clientId);
  const phone=(client?.phone||'').replace(/\D/g,'');
  const email=(client?.email||'').trim();
  const normalized=phone?(phone.length===10?'1'+phone:phone):'';
  const currentAmount=()=>{
    const n=Number(amountInput?.value||balance);
    return Number.isFinite(n)?n:0;
  };
  const subjectForAmount=()=> 'Recordatorio de pago · '+(k.invoiceNumber||'AGR')+' · '+money(currentAmount());

  const refreshDraft=()=>{
    const amount=currentAmount();
    const valid=amount>0 && amount<=balance;
    if(amountInput) amountInput.classList.toggle('invalid',!valid);
    const message=buildBalanceReminder(k,valid?amount:balance);
    if(preview) preview.textContent=message;
    if(wa && !wa.classList.contains('disabled')) wa.href='https://wa.me/'+normalized+'?text='+encodeURIComponent(message);
    if(sms && !sms.classList.contains('disabled')) sms.href='sms:+'+normalized+'?body='+encodeURIComponent(message);
    if(mail && !mail.classList.contains('disabled')) mail.href='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)+'&su='+encodeURIComponent(subjectForAmount())+'&body='+encodeURIComponent(message);
    if(createLink) createLink.textContent=valid?'Crear enlace para pagar '+money(amount):'Ingresa un monto válido';
    if(linkStatus){
      const matches=k.balancePaymentLinkMode==='live' && k.balancePaymentLink && Number(k.balancePaymentLinkAmount||0)===Number(amount);
      linkStatus.textContent=matches?'Enlace Stripe listo por '+money(amount)+'.':'';
    }
  };

  if(amountInput) amountInput.addEventListener('input',refreshDraft);
  if(useFull) useFull.onclick=()=>{if(amountInput){amountInput.value=balance.toFixed(2);refreshDraft();}};

  if(createLink) createLink.onclick=async()=>{
    const amount=currentAmount();
    if(!Number.isFinite(amount) || amount<=0){
      if(linkStatus) linkStatus.textContent='Ingresa un monto mayor que $0.00.';
      return;
    }
    if(amount>balance){
      if(linkStatus) linkStatus.textContent='El monto no puede exceder '+money(balance)+'.';
      return;
    }
    const original=createLink.textContent;
    createLink.disabled=true;
    createLink.textContent='Creando enlace seguro...';
    if(linkStatus) linkStatus.textContent='';
    try{
      await ensureBalancePaymentLink(k,amount);
      data.communications.unshift({id:Date.now(),caseId:k.id,channel:'Stripe',action:'Enlace de pago creado · '+money(amount)+(amount<balance?' de '+money(balance)+' pendientes':''),at:new Date().toISOString()});
      save(); logCaseEvent(k.id,'Enlace Stripe creado por '+money(amount),'payment');
      renderCasePayments(k);
      renderCommunicationHistory(k);
    }catch(err){
      createLink.disabled=false;
      createLink.textContent=original;
      if(linkStatus) linkStatus.textContent='No se pudo crear el enlace: '+err.message;
    }
  };

  const logReminder=(channel)=>{
    const amount=currentAmount();
    data.communications.unshift({id:Date.now(),caseId:k.id,channel,action:'Recordatorio de pago abierto · '+money(amount)+' · saldo total '+money(balance),at:new Date().toISOString()});
    save(); logCaseEvent(k.id,'Recordatorio de pago por '+channel+' abierto','communication');
  };
  if(wa && !wa.classList.contains('disabled')) wa.onclick=()=>logReminder('WhatsApp');
  if(sms && !sms.classList.contains('disabled')) sms.onclick=()=>logReminder('SMS');
  if(mail && !mail.classList.contains('disabled')) mail.onclick=()=>logReminder('Correo');

  if(copy) copy.onclick=async()=>{
    const amount=currentAmount();
    if(!Number.isFinite(amount) || amount<=0 || amount>balance){
      if(status) status.textContent='Ingresa primero un monto válido.';
      return;
    }
    const message=buildBalanceReminder(k,amount);
    try{
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(message);
      else{
        const ta=document.createElement('textarea');
        ta.value=message; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      if(status){status.textContent='✓ Mensaje copiado';setTimeout(()=>{status.textContent='';},2200);}
      data.communications.unshift({id:Date.now(),caseId:k.id,channel:'Copiar',action:'Recordatorio copiado · '+money(amount)+' · saldo total '+money(balance),at:new Date().toISOString()});
      save(); logCaseEvent(k.id,'Recordatorio de pago copiado','communication');
    }catch(err){
      if(status) status.textContent='No se pudo copiar automáticamente.';
    }
  };
  refreshDraft();
}
function renderCasePayments(k){
  const pane=$('#casePaymentsPane'); if(!pane) return;
  const rows=data.payments.filter(p=>Number(p.caseId)===Number(k.id)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  pane.innerHTML=`
    <div class="workspace-head">
      <div><span class="workspace-kicker">PAGOS</span><h3>Historial de pagos</h3></div>
      <div class="workspace-head-actions">
        <button type="button" class="secondary" id="syncStripePayments">↻ Sincronizar Stripe</button>
        <button type="button" class="primary" id="workspaceAddPayment">+ Agregar pago</button>
      </div>
    </div>
    <small class="stripe-sync-status" id="stripeSyncStatus" aria-live="polite"></small>

    <section class="case-pricing-config">
      <div class="case-pricing-config-head">
        <div><span class="workspace-kicker">CONFIGURAR PRECIOS</span><h4>Precio estándar y precios por método</h4></div>
        <button type="button" class="secondary" id="togglePricingConfig">Editar precios</button>
      </div>
      <div class="case-pricing-summary">
        <div><span>Precio estándar</span><strong>${money(caseStandardPrice(k))}</strong></div>
        <div><span>Cash</span><strong>${money(caseCashPrice(k))}</strong></div>
        <div><span>Zelle</span><strong>${money(caseZellePrice(k))}</strong></div>
        <div><span>Tarjeta / Stripe</span><strong>${money(caseCardPrice(k))}</strong></div>
      </div>
      <div class="case-pricing-editor" id="casePricingEditor" hidden>
        <label>Precio estándar<input type="number" min="0" step="0.01" id="caseStandardPrice" value="${Number(caseStandardPrice(k)).toFixed(2)}"></label>
        <label>Precio Cash<input type="number" min="0" step="0.01" id="caseCashPrice" value="${Number(caseCashPrice(k)).toFixed(2)}"></label>
        <label>Precio Zelle<input type="number" min="0" step="0.01" id="caseZellePrice" value="${Number(caseZellePrice(k)).toFixed(2)}"></label>
        <label>Precio Tarjeta / Stripe<input type="number" min="0" step="0.01" id="caseCardPrice" value="${Number(caseCardPrice(k)).toFixed(2)}"></label>
        <div class="pricing-preview" id="casePricingLivePreview"></div>
        <div class="case-pricing-actions">
          <button type="button" class="primary" id="saveCasePricing">Guardar precios</button>
          <small id="casePricingStatus" aria-live="polite"></small>
        </div>
      </div>
    </section>

    <div class="finance-snapshot finance-snapshot-compact">
      <div><span>Cobrado</span><strong>${money(caseCollected(k.id))}</strong></div>
      <div><span>Saldo pendiente</span><strong>${money(caseBalance(k))}</strong></div>
    </div>

    <div class="workspace-table"><table>
      <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Nota</th></tr></thead>
      <tbody>
        ${rows.length?rows.map(p=>`<tr><td>${esc(p.date||'—')}</td><td><strong>${money(p.amount)}</strong>${Number(p.discountCredit||0)>0?'<small class="payment-credit"> + '+money(p.discountCredit)+' descuento</small>':''}</td><td>${esc(p.method||'—')}</td><td>${esc(p.note||'—')}</td></tr>`).join(''):'<tr><td colspan="4">No hay pagos registrados.</td></tr>'}
      </tbody>
    </table></div>
    ${balanceReminderHTML(k)}`;

  $('#workspaceAddPayment').onclick=()=>{dialog.close();openModal('payment',{caseId:k.id,date:new Date().toISOString().slice(0,10)});};

  const syncBtn=$('#syncStripePayments');
  const syncStatus=$('#stripeSyncStatus');
  if(syncBtn) syncBtn.onclick=async()=>{
    const original=syncBtn.textContent;
    syncBtn.disabled=true;
    syncBtn.textContent='Sincronizando...';
    if(syncStatus) syncStatus.textContent='';
    try{
      const result=await syncStripePaymentsForCase(k,{silent:false});
      if(syncStatus) syncStatus.textContent=result.added?'✓ '+result.added+' pago(s) importado(s) desde Stripe.':'✓ Stripe al día. No hay pagos nuevos.';
      if(result.added){
        renderCasePayments(k);
        renderCaseSummarySnapshot(k);
        renderCommunicationHistory(k);
      }
    }catch(err){
      if(syncStatus) syncStatus.textContent='No se pudo sincronizar Stripe: '+err.message;
    }finally{
      if(syncBtn){syncBtn.disabled=false;syncBtn.textContent=original;}
    }
  };

  const toggle=$('#togglePricingConfig');
  const editor=$('#casePricingEditor');
  const standardInput=$('#caseStandardPrice');
  const cashInput=$('#caseCashPrice');
  const zelleInput=$('#caseZellePrice');
  const cardInput=$('#caseCardPrice');
  const preview=$('#casePricingLivePreview');
  const saveBtn=$('#saveCasePricing');
  const priceStatus=$('#casePricingStatus');

  const refreshPricingEditor=()=>{
    const standard=Math.max(0,Number(standardInput?.value||0));
    const cash=Math.max(0,Number(cashInput?.value||standard));
    const zelle=Math.max(0,Number(zelleInput?.value||cash));
    const card=Math.max(0,Number(cardInput?.value||standard));
    if(preview) preview.innerHTML=
      '<span>Precio estándar</span><strong>'+money(standard)+'</strong>'+
      '<span>Cash</span><strong>'+money(cash)+'</strong>'+
      '<span>Zelle</span><strong>'+money(zelle)+'</strong>'+
      '<span>Tarjeta / Stripe</span><strong>'+money(card)+'</strong>';
  };
  if(toggle && editor) toggle.onclick=()=>{editor.hidden=!editor.hidden;toggle.textContent=editor.hidden?'Editar precios':'Ocultar';refreshPricingEditor();};
  [standardInput,cashInput,zelleInput,cardInput].forEach(el=>el?.addEventListener('input',refreshPricingEditor));

  if(saveBtn) saveBtn.onclick=()=>{
    const standard=Math.max(0,Number(standardInput?.value||0));
    const cash=Math.max(0,Number(cashInput?.value||0));
    const zelle=Math.max(0,Number(zelleInput?.value||0));
    const card=Math.max(0,Number(cardInput?.value||0));
    const collected=caseCollected(k.id);
    if(!Number.isFinite(standard)||standard<=0){if(priceStatus)priceStatus.textContent='Ingresa un precio estándar mayor que $0.00.';return;}
    if([cash,zelle,card].some(v=>!Number.isFinite(v)||v<=0)){if(priceStatus)priceStatus.textContent='Todos los precios deben ser mayores que $0.00.';return;}
    if(standard<collected){if(priceStatus)priceStatus.textContent='El precio estándar no puede ser menor que lo ya cobrado: '+money(collected)+'.';return;}
    k.serviceTotal=standard;
    k.cashPrice=cash;
    k.zellePrice=zelle;
    k.cardPrice=card;
    k.balancePaymentLink='';
    k.balancePaymentLinkAmount=0;
    k.balancePaymentLinkMode='';
    k.balancePaymentLinkCreatedAt='';
    save();
    logCaseEvent(k.id,'Precios actualizados · estándar '+money(standard)+' · Cash '+money(cash)+' · Zelle '+money(zelle)+' · Tarjeta '+money(card),'payment');
    renderCasePayments(k);
    renderCaseSummarySnapshot(k);
    renderCommunicationHistory(k);
  };

  refreshPricingEditor();
  bindBalanceReminder(k,pane);

  // Silent sync whenever the Payments tab is rendered.
  syncStripePaymentsForCase(k).then(result=>{
    if(result.added){
      renderCasePayments(k);
      renderCaseSummarySnapshot(k);
      renderCommunicationHistory(k);
    }
  }).catch(err=>{
    if(syncStatus && /permission|not have the required permissions|403/i.test(String(err.message||err))){
      syncStatus.textContent='Stripe necesita permiso de lectura de Payment Intents para sincronizar automáticamente.';
    }
  });
}
function renderCaseHistory(k){
  const pane=$('#caseHistoryPane'); if(!pane) return;
  const rows=data.history.filter(h=>Number(h.caseId)===Number(k.id)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  pane.innerHTML=`
    <div class="workspace-head"><div><span class="workspace-kicker">HISTORIAL</span><h3>Actividad del caso</h3></div></div>
    <div class="timeline">${rows.length?rows.map(h=>`<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(h.text)}</strong><small>${dt(h.at)}</small></div></div>`).join(''):'<p class="empty-state">Todavía no hay actividad registrada.</p>'}</div>`;
}
function renderCaseNotes(k){
  const pane=$('#caseNotesPane'); if(!pane) return;
  const rows=data.notes.filter(n=>Number(n.caseId)===Number(k.id)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  pane.innerHTML=`
    <div class="workspace-head"><div><span class="workspace-kicker">NOTAS INTERNAS</span><h3>Solo visibles para AGR</h3></div></div>
    <div class="note-add"><textarea id="newInternalNote" rows="4" placeholder="Escribe una nota interna..."></textarea><button type="button" class="primary" id="addInternalNote">Guardar nota</button></div>
    <div class="notes-list">${rows.length?rows.map(n=>`<article class="note-card"><p>${esc(n.text)}</p><small>${dt(n.at)}</small></article>`).join(''):'<p class="empty-state">No hay notas internas.</p>'}</div>`;
  $('#addInternalNote').onclick=()=>{
    const t=$('#newInternalNote').value.trim(); if(!t) return;
    data.notes.unshift({id:Date.now(),caseId:k.id,text:t,at:new Date().toISOString()}); save(); logCaseEvent(k.id,'Nota interna agregada','note'); renderCaseNotes(k); renderCaseHistory(k);
  };
}
function renderCommunicationHistory(k){
  const box=$('#communicationHistory'); if(!box) return;
  const rows=data.communications.filter(x=>Number(x.caseId)===Number(k.id)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  box.innerHTML=balanceReminderHTML(k)+`<div class="communication-log"><h4>Actividad de comunicaciones</h4>${rows.length?rows.map(x=>`<div><strong>${esc(x.channel)}</strong><span>${esc(x.action)}</span><small>${dt(x.at)}</small></div>`).join(''):'<p class="empty-state">Todavía no hay actividad.</p>'}</div>`;
  bindBalanceReminder(k,box);
}
function renderCaseWorkspace(k){
  const tabs=$('#caseWorkspaceTabs'); if(!tabs) return;
  tabs.hidden=false;
  $$('.case-tab').forEach(b=>b.onclick=()=>{setCaseTab(b.dataset.caseTab); if(b.dataset.caseTab==='documents')renderCaseDocuments(k); if(b.dataset.caseTab==='payments')renderCasePayments(k); if(b.dataset.caseTab==='history')renderCaseHistory(k); if(b.dataset.caseTab==='notes')renderCaseNotes(k); if(b.dataset.caseTab==='communications'){refreshClientNotification();renderCommunicationHistory(k);}});
  renderCaseSetupCard(k); renderCaseSummarySnapshot(k); renderCaseDocuments(k); renderCasePayments(k); renderCaseHistory(k); renderCaseNotes(k); renderCommunicationHistory(k); setCaseTab('summary');
  const wa=$('.notify-whatsapp'), mail=$('.notify-email');
  if(wa) wa.onclick=()=>{data.communications.unshift({id:Date.now(),caseId:k.id,channel:'WhatsApp',action:'Borrador abierto',at:new Date().toISOString()});save();logCaseEvent(k.id,'Borrador de WhatsApp abierto','communication');renderCommunicationHistory(k);};
  if(mail) mail.onclick=()=>{data.communications.unshift({id:Date.now(),caseId:k.id,channel:'Correo',action:'Borrador abierto',at:new Date().toISOString()});save();logCaseEvent(k.id,'Borrador de correo abierto','communication');renderCommunicationHistory(k);};
}
function openModal(kind,values={}){
  mode=kind;
  editingCaseId=kind==='case-edit'?values.id:null;
  editingPaymentId=null;
  editingServiceId=kind==='service-edit'?values.id:null;
  const actualKind=kind==='case-edit'?'caseEdit':(kind==='service-edit'?'service':kind);
  const titles={client:'Nuevo cliente',case:'Nuevo caso / trámite',caseEdit:'Seguimiento del caso',service:'Nuevo servicio',payment:'Agregar pago al caso',appointment:'Nueva cita',task:'Nueva tarea'};
  modalTitle.textContent=kind==='case-edit'?'Editar caso / trámite':(kind==='service-edit'?'Editar servicio':titles[actualKind]);
  fields.innerHTML=templates[actualKind]().map(field=>fieldHTML(field,values)).join('');
  const workspaceTabs=$('#caseWorkspaceTabs');
  if(workspaceTabs) workspaceTabs.hidden=kind!=='case-edit';
  if(kind!=='case-edit') {
    setCaseTab('summary');
  }
  if(actualKind==='case'){
    const totalPriceInput=fields.querySelector('[name="serviceTotal"]');
    const cashPriceInput=fields.querySelector('[name="cashPrice"]');
    const zellePriceInput=fields.querySelector('[name="zellePrice"]');
    const cardPriceInput=fields.querySelector('[name="cardPrice"]');
    if(cardPriceInput){
      cardPriceInput.insertAdjacentHTML('afterend','<div class="pricing-preview" id="pricingPreview"></div>');
      const refreshPricingPreview=()=>{
        const standard=Math.max(0,Number(totalPriceInput?.value||0));
        const cash=Math.max(0,Number(cashPriceInput?.value||standard));
        const zelle=Math.max(0,Number(zellePriceInput?.value||cash));
        const card=Math.max(0,Number(cardPriceInput?.value||standard));
        const box=fields.querySelector('#pricingPreview');
        if(box) box.innerHTML=
          '<span>Precio estándar</span><strong>'+money(standard)+'</strong>'+
          '<span>Cash</span><strong>'+money(cash)+'</strong>'+
          '<span>Zelle</span><strong>'+money(zelle)+'</strong>'+
          '<span>Tarjeta / Stripe</span><strong>'+money(card)+'</strong>';
      };
      [totalPriceInput,cashPriceInput,zellePriceInput,cardPriceInput].forEach(el=>el?.addEventListener('input',refreshPricingPreview));
      refreshPricingPreview();
    }
    const invoiceInput=fields.querySelector('[name="invoiceNumber"]');
    if(invoiceInput){
      invoiceInput.readOnly=true;
      if(!invoiceInput.value){
        const generated=nextInvoiceNumber();
        invoiceInput.value=generated;
        if(kind==='case-edit' && editingCaseId){
          const idx=data.cases.findIndex(x=>x.id===editingCaseId);
          if(idx>=0){
            data.cases[idx].invoiceNumber=generated;
            save();
          }
        }
      }
    }
    const stripeInput=fields.querySelector('[name="stripePaymentLink"]');
    if(stripeInput){
      stripeInput.readOnly=true;
      stripeInput.placeholder='Se genera automáticamente';
      stripeInput.insertAdjacentHTML('afterend','<button type="button" class="primary stripe-create-btn" id="createStripeLink">Crear enlace Stripe</button><small class="stripe-help">Usa el monto de “Pago inicial requerido”.</small>');
    }
  }

  const notificationBox=document.querySelector('#clientNotificationBox');
  if(notificationBox) notificationBox.hidden = kind!=='case-edit';

  dialog.showModal();
  if(kind==='case-edit') renderCaseWorkspace(values);
  if(actualKind==='payment'){
    const caseSelect=form.querySelector('[name="caseId"]');
    const amountInput=form.querySelector('[name="amount"]');
    const methodSelect=form.querySelector('[name="method"]');
    if(methodSelect){
      methodSelect.insertAdjacentHTML('afterend','<div class="payment-discount-helper" id="paymentDiscountHelper"></div>');
      const refreshPaymentDiscountHelper=()=>{
        const k=caseById(Number(caseSelect?.value||0));
        const box=form.querySelector('#paymentDiscountHelper');
        if(!box || !k){ if(box) box.innerHTML=''; return; }
        const isCash=methodSelect.value==='Cash';
        const isZelle=methodSelect.value==='Zelle';
        const discount=isCash?caseCashDiscount(k):(isZelle?caseZelleDiscount(k):0);
        const payoff=isCash?caseCashPayoff(k):(isZelle?caseZellePayoff(k):caseBalance(k));
        if((isCash||isZelle) && discount>0){
          box.innerHTML='<span>Liquidación '+methodSelect.value+' con precio especial:</span><strong>'+money(payoff)+'</strong><button type="button" class="secondary" id="useCashPayoff">Usar este monto</button>';
          const btn=box.querySelector('#useCashPayoff');
          if(btn) btn.onclick=()=>{ if(amountInput) amountInput.value=payoff.toFixed(2); };
        }else if(discount>0){
          box.innerHTML='<small>Este caso tiene precios especiales para Cash/Zelle.</small>';
        }else{
          box.innerHTML='';
        }
      };
      caseSelect?.addEventListener('change',refreshPaymentDiscountHelper);
      methodSelect.addEventListener('change',refreshPaymentDiscountHelper);
      refreshPaymentDiscountHelper();
    }
  }
  if(actualKind==='case' || actualKind==='caseEdit'){
    const serviceSelect=form.querySelector('[name="service"]');
    const totalInput=form.querySelector('[name="serviceTotal"]');
    if(serviceSelect && totalInput){
      serviceSelect.addEventListener('change',()=>{
        const opt=serviceSelect.options[serviceSelect.selectedIndex];
        const suggested=Number(opt?.dataset?.price||0);
        if(suggested>0 && (!totalInput.value || Number(totalInput.value)===0)) totalInput.value=suggested;
      });
    }
    ['clientId','service','status','deadline','receiptNumber','aNumber','serviceTotal','cashPrice','zellePrice','cardPrice','initialPayment','stripePaymentLink'].forEach(name=>{
      const el=form.querySelector('[name="'+name+'"]');
      if(el) el.addEventListener('input',refreshClientNotification);
      if(el) el.addEventListener('change',refreshClientNotification);
    });
    if(kind==='case-edit'){
      refreshClientNotification();

      const stripeInput=form.querySelector('[name="stripePaymentLink"]');
      const initialInput=form.querySelector('[name="initialPayment"]');
      const invoiceInput=form.querySelector('[name="invoiceNumber"]');

      if(editingCaseId && invoiceInput?.value){
        const idx=data.cases.findIndex(x=>x.id===editingCaseId);
        if(idx>=0 && !data.cases[idx].invoiceNumber){
          data.cases[idx].invoiceNumber=invoiceInput.value;
          save();
        }
      }

    }

    const stripeBtn=document.querySelector('#createStripeLink');
    if(stripeBtn){
      stripeBtn.addEventListener('click', async ()=>{
        const fd=Object.fromEntries(new FormData(form));
        const amount=Number(fd.initialPayment||0);
        const client=clientById(fd.clientId);
        if(!amount || amount<=0){
          alert('Primero ingresa el pago inicial requerido.');
          return;
        }
        stripeBtn.disabled=true;
        const original=stripeBtn.textContent;
        stripeBtn.textContent='Creando enlace...';
        try{
          const url=await createStripePaymentLinkForCase({
            id:editingCaseId,
            clientId:Number(fd.clientId||0),
            service:fd.service||'',
            initialPayment:amount,
            invoiceNumber:fd.invoiceNumber||'',
            stripePaymentLink:fd.stripePaymentLink||''
          });
          const input=form.querySelector('[name="stripePaymentLink"]');
          if(input) input.value=url;
          refreshClientNotification();
          alert('Enlace de Stripe creado correctamente.');
        }catch(err){
          alert('No se pudo crear el enlace Stripe: '+err.message);
        }finally{
          stripeBtn.disabled=false;
          stripeBtn.textContent=original;
        }
      });
    }
  }
}

function bindCaseOpeners(){
  $$('[data-case-id]').forEach(el=>{
    el.onclick=()=>{
      const c=data.cases.find(x=>x.id===Number(el.dataset.caseId));
      if(c) openModal('case-edit',c);
    };
  });
}

function bindServiceOpeners(){
  $$('[data-service-id]').forEach(el=>{
    el.onclick=()=>{
      const s=data.services.find(x=>x.id===Number(el.dataset.serviceId));
      if(s) openModal('service-edit',s);
    };
  });
}

function bindCasePaymentOpeners(){
  $$('[data-case-payment-id]').forEach(el=>{
    el.onclick=()=>{
      const caseId=Number(el.dataset.casePaymentId);
      const k=caseById(caseId);
      if(k) openModal('payment',{caseId:k.id,date:new Date().toISOString().slice(0,10)});
    };
  });
}



document.addEventListener('click',e=>{
  const openBtn=e.target.closest('[data-open]');
  if(openBtn){
    e.preventDefault();
    openModal(openBtn.dataset.open);
    return;
  }
  const waBtn=e.target.closest('[data-whatsapp-appointment]');
  if(waBtn){
    e.preventDefault();
    openWhatsAppAppointment();
  }
});
window.__AGR_CRM_READY__=true;
const waDialog=$('#whatsappAppointmentDialog');
const waPrepare=$('#prepareWhatsAppAppointment');
const waCancel=$('#cancelWhatsAppAppointment');
if(waCancel && waDialog) waCancel.addEventListener('click',()=>waDialog.close());
if(waPrepare && waDialog){
  waPrepare.addEventListener('click',()=>{
    const message=$('#whatsappAppointmentText')?.value?.trim()||'';
    if(!message){alert('Pega primero el mensaje de WhatsApp.');return;}
    const values=parseWhatsAppAppointment(message);
    waDialog.close();
    openModal('appointment',values);
    if(!values.clientId){
      alert('No pude identificar al cliente automáticamente. Selecciónalo antes de guardar la cita.');
    }
  });
}
$('#closeDialog').addEventListener('click',()=>{dialog.close();form.reset();editingCaseId=null;editingPaymentId=null;const t=$('#caseWorkspaceTabs');if(t)t.hidden=true;setCaseTab('summary');});
$('#cancelDialog').addEventListener('click',()=>{dialog.close();form.reset();editingCaseId=null;editingPaymentId=null;const t=$('#caseWorkspaceTabs');if(t)t.hidden=true;setCaseTab('summary');});


form.addEventListener('submit',async e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  const f=Object.fromEntries(new FormData(form));
  const id=Date.now();

  if(mode==='client') data.clients.push({id,name:f.name,phone:f.phone,email:f.email});

  if(mode==='service') {
    data.services.push({
      id,
      name:f.name,
      category:f.category||'',
      price:Number(f.price||0),
      active:f.active!=='false'
    });
  }

  if(mode==='service-edit'){
    const index=data.services.findIndex(s=>s.id===editingServiceId);
    if(index>=0){
      data.services[index]={
        ...data.services[index],
        name:f.name,
        category:f.category||'',
        price:Number(f.price||0),
        active:f.active!=='false'
      };
    }
  }

  if(mode==='case') {
    const newCase={
      id,
      clientId:Number(f.clientId),
      service:f.service,
      status:f.status||'inicial',
      deadline:f.deadline||'',
      receiptNumber:f.receiptNumber||'',
      aNumber:f.aNumber||'',
      serviceTotal:Number(f.serviceTotal||0),
      cashPrice:Number(f.cashPrice||f.serviceTotal||0),
      zellePrice:Number(f.zellePrice||f.cashPrice||f.serviceTotal||0),
      cardPrice:Number(f.cardPrice||f.serviceTotal||0),
      initialPayment:Number(f.initialPayment||0),
      invoiceNumber:f.invoiceNumber||nextInvoiceNumber(),
      stripePaymentLink:f.stripePaymentLink||'',
      syncToken:makeCaseSyncToken()
    };
    if(newCase.initialPayment>0 && !newCase.stripePaymentLink){
      try{
        newCase.stripePaymentLink=await createStripePaymentLinkForCase(newCase);
      }catch(err){
        alert('El caso se guardará, pero no se pudo crear el enlace Stripe automáticamente: '+err.message);
      }
    }
    data.cases.push(newCase);
    ensureCaseDocs(newCase);
    logCaseEvent(newCase.id,'Caso creado','case');
  }

  if(mode==='case-edit'){
    const index=data.cases.findIndex(c=>c.id===editingCaseId);
    if(index>=0){
      const current=data.cases[index];
      const updatedCase={
        ...current,
        clientId:current.clientId,
        service:current.service,
        status:f.status||current.status,
        deadline:f.deadline!==undefined?f.deadline:(current.deadline||''),
        receiptNumber:f.receiptNumber!==undefined?f.receiptNumber:(current.receiptNumber||''),
        aNumber:f.aNumber!==undefined?f.aNumber:(current.aNumber||''),
        serviceTotal:Number(current.serviceTotal||0),
        cashPrice:Number(current.cashPrice ?? caseCashPrice(current)),
        zellePrice:Number(current.zellePrice ?? caseZellePrice(current)),
        cardPrice:Number(current.cardPrice ?? caseCardPrice(current)),
        initialPayment:Number(current.initialPayment||0),
        invoiceNumber:current.invoiceNumber||nextInvoiceNumber(),
        stripePaymentLink:current.stripePaymentLink||'',
        updatedAt:new Date().toISOString()
      };
      if(updatedCase.initialPayment>0 && !updatedCase.stripePaymentLink){
        try{
          updatedCase.stripePaymentLink=await createStripePaymentLinkForCase(updatedCase);
        }catch(err){
          alert('El caso se guardará, pero no se pudo crear el enlace Stripe automáticamente: '+err.message);
        }
      }
      const oldCase=data.cases[index];
      data.cases[index]=updatedCase;
      const changes=[];
      if(oldCase.status!==updatedCase.status) changes.push('Estado: '+statusLabel(oldCase.status)+' → '+statusLabel(updatedCase.status));
      if(oldCase.deadline!==updatedCase.deadline && updatedCase.deadline) changes.push('Deadline: '+updatedCase.deadline);
      if(changes.length) logCaseEvent(updatedCase.id,changes.join(' · '),'case');
    }
  }

  if(mode==='payment'){
    const k=caseById(f.caseId);
    if(k){
      const balance=caseBalance(k);
      const amount=Number(f.amount||0);
      const method=f.method||'';
      const isCash=method==='Cash';
      const isZelle=method==='Zelle';
      const discountAvailable=isCash?caseCashDiscount(k):(isZelle?caseZelleDiscount(k):0);
      const discountedPayoff=isCash?caseCashPayoff(k):(isZelle?caseZellePayoff(k):balance);
      let discountCredit=0;
      if(amount<=0){
        alert('Ingresa un monto mayor a $0.');
        return;
      }
      if(amount>balance){
        alert('El pago no puede ser mayor que el saldo pendiente de '+money(balance)+'.');
        return;
      }
      if((isCash||isZelle) && discountAvailable>0 && Math.abs(amount-discountedPayoff)<0.01){
        discountCredit=Math.min(discountAvailable,balance-amount);
      }
      data.payments.push({
        id,
        caseId:Number(f.caseId),
        clientId:k.clientId,
        amount,
        discountCredit,
        method,
        date:f.date||new Date().toISOString().slice(0,10),
        note:f.note||(discountCredit>0?'Descuento Cash/Zelle aplicado':'')
      });
      logCaseEvent(k.id,`Pago registrado: ${money(amount)} · ${method}${discountCredit>0?' · descuento '+money(discountCredit):''}`,'payment');
    }
  }

  if(mode==='appointment') data.appointments.push({
    id,
    clientId:Number(f.clientId),
    date:f.date,
    time:f.time,
    duration:Number(f.duration||60),
    service:f.service,
    location:f.location||'294 Tyler Street, East Haven, CT 06512',
    note:f.note||''
  });
  if(mode==='task') data.tasks.push({id,title:f.title,date:f.date||'',priority:f.priority||'Media',caseId:f.caseId?Number(f.caseId):null,note:f.note||'',done:false,createdAt:new Date().toISOString()});

  save();
  render();
  dialog.close();
  form.reset();
  editingCaseId=null;
  editingPaymentId=null;
});

save();
render();
const globalSearch=$('#globalSearch');
if(globalSearch) globalSearch.addEventListener('input',e=>renderGlobalSearch(e.target.value));
document.addEventListener('click',e=>{
  const wrap=$('.global-search-wrap');
  if(wrap && !wrap.contains(e.target)){
    const box=$('#globalSearchResults'); if(box) box.hidden=true;
  }
});