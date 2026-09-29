const seed={
  clients:[
    {id:1,name:'Cliente de prueba 1',phone:'203-555-0101',email:'cliente1@example.com'},
    {id:2,name:'Cliente de prueba 2',phone:'203-555-0102',email:'cliente2@example.com'},
    {id:3,name:'Cliente de prueba 3',phone:'203-555-0103',email:'cliente3@example.com'}
  ],
  cases:[
    {id:1,clientId:1,service:'Ajuste de estatus',status:'espera_uscis',next:'Monitorear recibo y notificaciones'},
    {id:2,clientId:2,service:'Declaración de impuestos',status:'evidencia',next:'Esperar W-2'},
    {id:3,clientId:3,service:'LLC Connecticut',status:'inicial',next:'Enviar intake'}
  ],
  payments:[
    {id:1,clientId:1,service:'Ajuste de estatus',total:1200,paid:600},
    {id:2,clientId:2,service:'Taxes 2025',total:350,paid:350},
    {id:3,clientId:3,service:'LLC Connecticut',total:850,paid:300}
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
let data=JSON.parse(localStorage.getItem(storeKey)||'null')||structuredClone(seed);

// migrate old prototype statuses if they exist in this browser
const migration={nuevo:'inicial',pendiente:'evidencia',proceso:'preparacion',completado:'completado'};
data.cases=data.cases.map(c=>({...c,status:migration[c.status]||c.status||'inicial'}));

const save=()=>localStorage.setItem(storeKey,JSON.stringify(data));
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clientName=id=>data.clients.find(c=>c.id===Number(id))?.name||'Cliente';

function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)}
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
  const labels={dashboard:'Dashboard',clients:'Clientes',cases:'Casos & trámites',payments:'Pagos',appointments:'Citas'};
  $('#pageTitle').textContent=labels[view]||'AGR CRM';
}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.jump)));

function render(){
  $('#statClients').textContent=data.clients.length;
  $('#statCases').textContent=data.cases.filter(c=>!['completado','aprobado'].includes(c.status)).length;
  const bal=data.payments.reduce((s,p)=>s+(p.total-p.paid),0);
  $('#statBalance').textContent=money(bal);
  $('#statAppointments').textContent=data.appointments.length;

  $('#recentCases').innerHTML=data.cases.slice(0,5).map(c=>`
    <tr class="clickable-row" data-case-id="${c.id}">
      <td><strong>${clientName(c.clientId)}</strong></td>
      <td>${c.service}</td>
      <td><span class="badge ${badgeClass(c.status)}">${statusLabel(c.status)}</span></td>
      <td>${c.next||'—'}</td>
    </tr>`).join('');

  const apptHTML=data.appointments.map(a=>{
    const d=new Date(a.date+'T12:00:00');
    const day=d.toLocaleDateString('es-US',{day:'2-digit'});
    const mon=d.toLocaleDateString('es-US',{month:'short'}).replace('.','');
    return `<div class="appointment"><div class="appointment-date">${day}<br><small>${mon}</small></div><div><strong>${clientName(a.clientId)}</strong><span>${a.service} · ${a.time}</span></div></div>`
  }).join('');
  $('#appointmentList').innerHTML=apptHTML||'<p>No hay citas.</p>';
  $('#appointmentsTable').innerHTML=apptHTML||'<p>No hay citas.</p>';

  renderClients();
  renderCases();
  renderPayments();
  bindCaseOpeners();
}

function renderClients(filter=''){
  const q=filter.toLowerCase();
  $('#clientsTable').innerHTML=data.clients.filter(c=>[c.name,c.phone,c.email].join(' ').toLowerCase().includes(q)).map(c=>{
    const cases=data.cases.filter(x=>x.clientId===c.id).length;
    const bal=data.payments.filter(x=>x.clientId===c.id).reduce((s,p)=>s+(p.total-p.paid),0);
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
        <small>Próximo: ${c.next||'—'}</small>
        <div style="margin-top:10px;font-size:.78rem;font-weight:700;color:#071b3d">Abrir caso →</div>
      </article>`).join('')||'<small>Sin casos</small>'}
    </section>`
  }).join('');
  bindCaseOpeners();
}

function renderPayments(){
  $('#paymentsTable').innerHTML=data.payments.map(p=>`<tr><td><strong>${clientName(p.clientId)}</strong></td><td>${p.service}</td><td>${money(p.total)}</td><td>${money(p.paid)}</td><td><strong>${money(p.total-p.paid)}</strong></td></tr>`).join('');
}
$('#clientSearch').addEventListener('input',e=>renderClients(e.target.value));

const dialog=$('#recordDialog'), form=$('#recordForm'), fields=$('#formFields'), modalTitle=$('#modalTitle');
let mode='client';
let editingCaseId=null;

const templates={
  client:()=>[['name','Nombre completo','text','full'],['phone','Teléfono','tel',''],['email','Email','email','']],
  case:()=>[['clientId','Cliente','client',''],['service','Servicio / trámite','text',''],['status','Estado','status',''],['next','Próximo paso','text','full'],['serviceTotal','Total del servicio','number',''],['paid','Pagado','number',''],['invoiceNumber','Número de factura','text','']]
  payment:()=>[['clientId','Cliente','client',''],['service','Servicio','text',''],['total','Total','number',''],['paid','Pagado','number','']],
  appointment:()=>[['clientId','Cliente','client',''],['date','Fecha','date',''],['time','Hora','text',''],['service','Motivo / servicio','text','full']]
};

function fieldHTML([name,label,type,cls],values={}){
  let input='';
  const val=values[name] ?? '';
  if(type==='client') {
    input=`<select name="${name}" required><option value="">Selecciona</option>${data.clients.map(c=>`<option value="${c.id}" ${Number(val)===c.id?'selected':''}>${c.name}</option>`).join('')}</select>`;
  } else if(type==='status') {
    input=`<select name="${name}" required>${statusOrder.map(s=>`<option value="${s}" ${val===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select>`;
  } else {
    input=`<input name="${name}" type="${type}" value="${String(val).replace(/"/g,'&quot;')}" ${['name','phone','service','date'].includes(name)?'required':''}>`;
  }
  return `<label class="${cls}">${label}${input}</label>`;
}

function openModal(kind,values={}){
  mode=kind;
  editingCaseId=kind==='case-edit'?values.id:null;
  const actualKind=kind==='case-edit'?'case':kind;
  const titles={client:'Nuevo cliente',case:'Nuevo caso / trámite',payment:'Registrar pago',appointment:'Nueva cita'};
  modalTitle.textContent=kind==='case-edit'?'Editar caso / trámite':titles[actualKind];
  fields.innerHTML=templates[actualKind]().map(field=>fieldHTML(field,values)).join('');
  dialog.showModal();
}

function bindCaseOpeners(){
  $$('[data-case-id]').forEach(el=>{
    el.onclick=()=>{
      const c=data.cases.find(x=>x.id===Number(el.dataset.caseId));
      if(c) openModal('case-edit',c);
    };
  });
}

$$('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
$('#quickAdd').addEventListener('click',()=>openModal('client'));
$('#closeDialog').addEventListener('click',()=>{dialog.close();form.reset();editingCaseId=null;});
$('#cancelDialog').addEventListener('click',()=>{dialog.close();form.reset();editingCaseId=null;});


form.addEventListener('submit',e=>{
  if(e.submitter?.value==='cancel') return;
  e.preventDefault();
  const f=Object.fromEntries(new FormData(form));
  const id=Date.now();

  if(mode==='client') data.clients.push({id,name:f.name,phone:f.phone,email:f.email});

  if(mode==='case') {
    data.cases.push({
      id,
      clientId:Number(f.clientId),
      service:f.service,
      status:f.status||'inicial',
      next:f.next,
      serviceTotal:Number(f.serviceTotal||0),
      paid:Number(f.paid||0),
      invoiceNumber:f.invoiceNumber||''
    });
  }

  if(mode==='case-edit'){
    const index=data.cases.findIndex(c=>c.id===editingCaseId);
    if(index>=0){
      data.cases[index]={
        ...data.cases[index],
        clientId:Number(f.clientId),
        service:f.service,
        status:f.status,
        next:f.next,
        serviceTotal:Number(f.serviceTotal||0),
        paid:Number(f.paid||0),
        invoiceNumber:f.invoiceNumber||''
      };
    }
  }

  if(mode==='payment') data.payments.push({id,clientId:Number(f.clientId),service:f.service,total:Number(f.total||0),paid:Number(f.paid||0)});
  if(mode==='appointment') data.appointments.push({id,clientId:Number(f.clientId),date:f.date,time:f.time,service:f.service});

  save();
  render();
  dialog.close();
  form.reset();
  editingCaseId=null;
});

save();
render();