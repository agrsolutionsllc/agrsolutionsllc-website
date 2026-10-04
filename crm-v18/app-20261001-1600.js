window.addEventListener('error',function(e){
  const banner=document.querySelector('.demo-banner');
  if(banner){
    banner.textContent='CRM v18 · Error de carga: '+(e.message||'JavaScript');
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
const FOXIT_SEND_URL='https://agrsolutionsllc-website-stripe-back.vercel.app/api/foxit-send-contract';
const FOXIT_STATUS_URL='https://agrsolutionsllc-website-stripe-back.vercel.app/api/foxit-envelope-status';
const FOXIT_SIGNED_PDF_URL='https://agrsolutionsllc-website-stripe-back.vercel.app/api/foxit-signed-document';
let data=JSON.parse(localStorage.getItem(storeKey)||'null')||structuredClone(seed);
if(!Array.isArray(data.services)) data.services=structuredClone(seed.services);
if(!data.documents || typeof data.documents!=='object') data.documents={};
if(!Array.isArray(data.notes)) data.notes=[];
if(!Array.isArray(data.history)) data.history=[];
if(!Array.isArray(data.communications)) data.communications=[];
if(!Array.isArray(data.tasks)) data.tasks=[];
if(!Array.isArray(data.clientAccountCharges)) data.clientAccountCharges=[];
if(!Array.isArray(data.clientAccountPayments)) data.clientAccountPayments=[];
if(!Array.isArray(data.clientAccountInvoices)) data.clientAccountInvoices=[];
if(!Array.isArray(data.cashbook)) data.cashbook=[];
if(!Array.isArray(data.expenses)) data.expenses=[];
if(!data.caseContracts || typeof data.caseContracts!=='object') data.caseContracts={};
if(!data.esignSettings || typeof data.esignSettings!=='object') data.esignSettings={agrSignerName:'',agrSignerEmail:''};

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
function folderLetterForName(name=''){
  const clean=String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const match=clean.match(/[A-Za-z]/);
  return (match?match[0]:'X').toUpperCase();
}
function nextFolderNumberForName(name='',excludeId=null){
  const letter=folderLetterForName(name);
  const nums=data.clients
    .filter(c=>!c.isCompany && Number(c.id)!==Number(excludeId))
    .map(c=>String(c.folderNumber||'').trim().toUpperCase())
    .map(v=>{
      const m=v.match(/^([A-Z])-?(\d+)$/);
      return m && m[1]===letter ? Number(m[2]) : 0;
    })
    .filter(n=>n>0);
  return letter+'-'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
}
function nextCompanyFolderNumberForName(name='',excludeId=null){
  const letter=folderLetterForName(name);
  const nums=data.clients
    .filter(c=>c.isCompany && Number(c.id)!==Number(excludeId))
    .map(c=>String(c.folderNumber||'').trim().toUpperCase())
    .map(v=>{
      const m=v.match(/^([A-Z])-?(\d+)$/);
      return m && m[1]===letter ? Number(m[2]) : 0;
    })
    .filter(n=>n>0);
  return letter+'-'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
}
function migrateFolderNumbersByLetter(){
  if(Number(data.folderSchemeVersion||0)>=2) return;
  const counters={};
  data.clients
    .filter(c=>!c.isCompany)
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}))
    .forEach(c=>{
      const letter=folderLetterForName(c.name);
      counters[letter]=(counters[letter]||0)+1;
      c.folderNumber=letter+'-'+String(counters[letter]).padStart(3,'0');
    });
  data.folderSchemeVersion=2;
  save();
}
migrateFolderNumbersByLetter();
function migrateCompanyFolderNumbers(){
  if(Number(data.companyFolderSchemeVersion||0)>=2) return;
  const counters={};
  data.clients
    .filter(c=>c.isCompany)
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}))
    .forEach(c=>{
      const letter=folderLetterForName(c.name);
      counters[letter]=(counters[letter]||0)+1;
      c.folderNumber=letter+'-'+String(counters[letter]).padStart(3,'0');
    });
  data.companyFolderSchemeVersion=2;
  save();
}
migrateCompanyFolderNumbers();
function repairMissingCompanyFolderNumbers(){
  const used={};
  data.clients.filter(c=>c.isCompany).forEach(c=>{
    const v=String(c.folderNumber||'').trim().toUpperCase();
    const m=v.match(/^([A-Z])-(\d+)$/);
    if(m){
      const letter=m[1];
      used[letter]=Math.max(used[letter]||0,Number(m[2]));
    }
  });

  let changed=false;
  data.clients
    .filter(c=>c.isCompany)
    .filter(c=>!/^[A-Z]-\d+$/.test(String(c.folderNumber||'').trim().toUpperCase()))
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}))
    .forEach(c=>{
      const letter=folderLetterForName(c.name);
      used[letter]=(used[letter]||0)+1;
      c.folderNumber=letter+'-'+String(used[letter]).padStart(3,'0');
      changed=true;
    });

  if(changed) save();
}
repairMissingCompanyFolderNumbers();
const caseById=id=>data.cases.find(c=>c.id===Number(id));
const caseCollected=id=>data.payments.filter(p=>Number(p.caseId)===Number(id)).reduce((s,p)=>s+Number(p.amount||0),0);
const caseDiscountCredits=id=>data.payments.filter(p=>Number(p.caseId)===Number(id)).reduce((s,p)=>s+Number(p.discountCredit||0),0);
const casePaid=id=>caseCollected(id)+caseDiscountCredits(id);
const caseStandardPrice=c=>Number(c.serviceTotal||0);
const caseCashPrice=c=>Number(c.cashPrice ?? Math.max(caseStandardPrice(c)-Number(c.cashZelleDiscount||0),0));
const caseZellePrice=c=>caseCashPrice(c);
const caseCardPrice=c=>Number(c.cardPrice ?? caseStandardPrice(c));
const paymentUsesCardPrice=method=>/card|stripe|credit|debit/i.test(String(method||''));
const casePaymentRows=c=>data.payments.filter(p=>Number(p.caseId)===Number(c.id));
const caseUsesCardPrice=c=>casePaymentRows(c).some(p=>paymentUsesCardPrice(p.method));
const caseApplicablePrice=c=>caseUsesCardPrice(c)?caseCardPrice(c):caseCashPrice(c);
const caseBalance=c=>Math.max(caseApplicablePrice(c)-casePaid(c.id),0);
const caseBalanceForMethod=(c,method)=>{
  const target=paymentUsesCardPrice(method)?caseCardPrice(c):((method==='Cash'||method==='Zelle')?caseCashPrice(c):caseApplicablePrice(c));
  return Math.max(target-casePaid(c.id),0);
};
const caseCashDiscount=c=>Math.max(caseStandardPrice(c)-caseCashPrice(c),0);
const caseZelleDiscount=c=>caseCashDiscount(c);
const caseCashPayoff=c=>Math.max(caseCashPrice(c)-casePaid(c.id),0);
const caseZellePayoff=c=>caseCashPayoff(c);
const accountChargesForClient=id=>data.clientAccountCharges.filter(x=>Number(x.clientId)===Number(id));
const accountPaymentsForClient=id=>data.clientAccountPayments.filter(x=>Number(x.clientId)===Number(id));
const accountChargeTotal=x=>Number(x.quantity||1)*Number(x.unitPrice||0);
const accountChargesTotal=id=>accountChargesForClient(id).reduce((s,x)=>s+accountChargeTotal(x),0);
const accountPaymentsTotal=id=>accountPaymentsForClient(id).reduce((s,x)=>s+Number(x.amount||0),0);
const accountBalance=id=>Math.max(accountChargesTotal(id)-accountPaymentsTotal(id),0);
const monthNames={1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
function normalizePeriodLabel(v=''){
  const s=String(v||'').trim();
  if(!s) return '';
  const n=Number(s);
  if(Number.isInteger(n)&&n>=1&&n<=12) return monthNames[n];
  return s;
}
function groupAccountCharges(charges){
  const map=new Map();
  for(const c of charges){
    const key=[String(c.concept||'').trim().toLowerCase(),Number(c.unitPrice||0)].join('|');
    if(!map.has(key)) map.set(key,{concept:c.concept||'Servicio',unitPrice:Number(c.unitPrice||0),quantity:0,periods:[],total:0});
    const g=map.get(key);
    g.quantity+=Number(c.quantity||1);
    if(c.period) g.periods.push(normalizePeriodLabel(c.period));
    g.total+=accountChargeTotal(c);
  }
  return [...map.values()];
}


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
function casePaymentRowsChronological(k){
  return data.payments
    .filter(p=>Number(p.caseId)===Number(k.id))
    .slice()
    .sort((a,b)=>{
      const da=String(a.date||''); const db=String(b.date||'');
      if(da!==db) return da.localeCompare(db);
      return Number(a.id||0)-Number(b.id||0);
    });
}
function paymentBalanceAfter(k,paymentId){
  let paid=0;
  let usesCard=false;
  for(const p of casePaymentRowsChronological(k)){
    paid+=Number(p.amount||0)+Number(p.discountCredit||0);
    if(paymentUsesCardPrice(p.method)) usesCard=true;
    if(String(p.id)===String(paymentId)){
      const target=usesCard?caseCardPrice(k):caseCashPrice(k);
      return Math.max(target-paid,0);
    }
  }
  const target=usesCard?caseCardPrice(k):caseCashPrice(k);
  return Math.max(target-paid,0);
}
function isFinalPayment(k,p){
  return paymentBalanceAfter(k,p.id)<=0.009;
}
function paymentDocumentHTML(k,p,{finalInvoice=false}={}){
  const client=clientById(k.clientId);
  const rows=casePaymentRowsChronological(k);
  const after=paymentBalanceAfter(k,p.id);
  const paidThrough=rows.filter(x=>{
    const dx=String(x.date||''); const dp=String(p.date||'');
    return dx<dp || (dx===dp && Number(x.id||0)<=Number(p.id||0));
  });
  const paidTotal=paidThrough.reduce((s,x)=>s+Number(x.amount||0),0);
  const creditsTotal=paidThrough.reduce((s,x)=>s+Number(x.discountCredit||0),0);
  const effectivePaid=paidTotal+creditsTotal;
  const docNo=finalInvoice
    ? (k.invoiceNumber||('AGR-'+k.id))
    : ((k.invoiceNumber||('AGR-'+k.id))+'-R'+String(p.id).slice(-4));
  const paymentsTable=finalInvoice
    ? `<table><thead><tr><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.date||'—')}</td><td>${esc(x.method||'—')}</td><td>${money(Number(x.amount||0))}${Number(x.discountCredit||0)>0?' + '+money(Number(x.discountCredit||0))+' descuento':''}</td></tr>`).join('')}</tbody></table>`
    : `<table><thead><tr><th>Fecha</th><th>Método</th><th>Pago recibido</th></tr></thead><tbody><tr><td>${esc(p.date||'—')}</td><td>${esc(p.method||'—')}</td><td>${money(Number(p.amount||0))}</td></tr></tbody></table>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${finalInvoice?'Factura final':'Recibo de pago'} · ${esc(docNo)}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#10264a;margin:0;background:#fff}
  .sheet{max-width:820px;margin:0 auto;padding:48px}
  .invoice-actions{max-width:820px;margin:18px auto 0;padding:0 48px;display:flex;justify-content:flex-end;gap:10px}
  .invoice-actions button{border:1px solid #dfe5ee;border-radius:10px;padding:10px 14px;background:#fff;color:#10264a;font-weight:700;cursor:pointer}
  .invoice-actions button.primary{background:#10264a;color:#fff;border-color:#10264a}
  .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #d9b45b;padding-bottom:22px}
  .brand{display:flex;flex-direction:column;align-items:flex-start;gap:8px}.brand-logo{width:190px;height:150px;object-fit:contain;border-radius:10px;display:block}.brand-copy p{margin:3px 0;color:#5d687b}
  .doc{text-align:right}.doc h2{margin:0 0 6px;font-size:24px}.paid{display:inline-block;margin-top:8px;padding:6px 11px;border:1px solid #1d7a56;border-radius:999px;color:#1d7a56;font-weight:700}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:28px 0}.box{padding:16px;border:1px solid #e3e7ee;border-radius:12px}
  .box span{display:block;color:#6b768a;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.box strong{font-size:17px}
  table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #e3e7ee}th{font-size:12px;text-transform:uppercase;color:#6b768a}
  .totals{margin-left:auto;max-width:360px}.totals div{display:flex;justify-content:space-between;padding:8px 0}.totals .grand{border-top:2px solid #10264a;margin-top:6px;padding-top:12px;font-size:18px;font-weight:700}
  .footer{margin-top:42px;padding-top:18px;border-top:1px solid #e3e7ee;color:#6b768a;font-size:12px;line-height:1.6}
  @media print{.sheet{max-width:none;padding:28px}.no-print{display:none!important}.invoice-actions{display:none!important}}
</style>
</head>
<body>
<div class="invoice-actions no-print">
  <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
<div class="sheet">
  <div class="top">
    <div class="brand"><img class="brand-logo" src="https://agrsolutionsllc.com/logo-agr.jpeg.jpeg" alt="AGR Solutions LLC"><div class="brand-copy"><p>294 Tyler Street, East Haven, CT 06512</p><p>203-824-0351 · agrsolutionsllc.com</p></div></div>
    <div class="doc"><h2>${finalInvoice?'FACTURA FINAL':'RECIBO DE PAGO'}</h2><div>${esc(docNo)}</div>${finalInvoice?'<span class="paid">PAID IN FULL</span>':''}</div>
  </div>
  <div class="grid">
    <div class="box"><span>Cliente</span><strong>${esc(client?.name||'Cliente')}</strong><br>${client?.email?esc(client.email):''}</div>
    <div class="box"><span>Servicio</span><strong>${esc(k.service||'Servicio')}</strong><br>Referencia: ${esc(k.invoiceNumber||'—')}</div>
  </div>
  ${paymentsTable}
  <div class="totals">
    <div><span>Precio del servicio</span><strong>${money(Number(k.serviceTotal||0))}</strong></div>
    ${finalInvoice?'<div><span>Total recibido</span><strong>'+money(paidTotal)+'</strong></div>':'<div><span>Pago recibido</span><strong>'+money(Number(p.amount||0))+'</strong></div>'}
    ${creditsTotal>0?'<div><span>Descuento aplicado</span><strong>'+money(creditsTotal)+'</strong></div>':''}
    <div class="grand"><span>Saldo restante</span><strong>${money(finalInvoice?0:after)}</strong></div>
  </div>
  <div class="footer">
    ${finalInvoice
      ? 'Esta factura confirma que el balance correspondiente al servicio indicado ha sido pagado en su totalidad.'
      : 'Este recibo confirma un pago parcial. El saldo restante continúa pendiente hasta completar el total acordado.'}
    <br>Gracias por confiar en AGR Solutions LLC.
  </div>
</div>

</body></html>`;
}
function openPaymentDocument(k,p,finalInvoice=false){
  const w=window.open('','_blank');
  if(!w){alert('Permite ventanas emergentes para abrir el documento.');return;}
  try{w.opener=null;}catch(_){}
  w.document.open();
  w.document.write(paymentDocumentHTML(k,p,{finalInvoice}));
  w.document.close();
}

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

const autoBackupSettingsKey='agr-crm-auto-backup-settings-v1';
const autoBackupDBName='agr-crm-backup-handles';
const autoBackupStore='handles';

function getAutoBackupSettings(){
  try{return JSON.parse(localStorage.getItem(autoBackupSettingsKey)||'{}')||{};}catch{return {};}
}
function setAutoBackupSettings(patch){
  const next={...getAutoBackupSettings(),...patch};
  localStorage.setItem(autoBackupSettingsKey,JSON.stringify(next));
  return next;
}
function openAutoBackupDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(autoBackupDBName,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(autoBackupStore);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function saveAutoBackupHandle(handle){
  const db=await openAutoBackupDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(autoBackupStore,'readwrite');
    tx.objectStore(autoBackupStore).put(handle,'directory');
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
async function getAutoBackupHandle(){
  const db=await openAutoBackupDB();
  const value=await new Promise((resolve,reject)=>{
    const tx=db.transaction(autoBackupStore,'readonly');
    const req=tx.objectStore(autoBackupStore).get('directory');
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
  db.close();
  return value;
}
async function ensureDirectoryPermission(handle,ask=false){
  if(!handle) return false;
  const opts={mode:'readwrite'};
  if(await handle.queryPermission(opts)==='granted') return true;
  if(ask && await handle.requestPermission(opts)==='granted') return true;
  return false;
}
async function writeBackupToDirectory(handle){
  const payload=crmBackupPayload();
  const name='AGR-CRM-AUTO-'+backupFileStamp()+'.json';
  const fileHandle=await handle.getFileHandle(name,{create:true});
  const writable=await fileHandle.createWritable();
  await writable.write(JSON.stringify(payload,null,2));
  await writable.close();
  setAutoBackupSettings({lastRun:Date.now(),lastFile:name});
  return name;
}
function autoBackupIsDue(settings=getAutoBackupSettings()){
  if(!settings.enabled) return false;
  const days=Math.max(1,Number(settings.frequencyDays||7));
  const last=Number(settings.lastRun||0);
  return !last || Date.now()-last >= days*86400000;
}
async function renderAutoBackupSettings(){
  const settings=getAutoBackupSettings();
  const enabled=$('#autoBackupEnabled');
  const freq=$('#autoBackupFrequency');
  const folder=$('#autoBackupFolderLabel');
  const last=$('#autoBackupLastRun');
  if(enabled) enabled.checked=!!settings.enabled;
  if(freq) freq.value=String(settings.frequencyDays||7);
  let handle=null;
  try{handle=await getAutoBackupHandle();}catch{}
  if(folder) folder.textContent=handle?'Carpeta: '+handle.name:'Carpeta no configurada';
  if(last){
    last.textContent=settings.lastRun
      ? 'Último backup automático: '+new Date(settings.lastRun).toLocaleString('es-US')+(settings.lastFile?' · '+settings.lastFile:'')
      : 'Aún no hay backup automático.';
  }
}
async function maybeRunAutomaticBackup(){
  const settings=getAutoBackupSettings();
  if(!autoBackupIsDue(settings)) return;
  let handle=null;
  try{handle=await getAutoBackupHandle();}catch{}
  if(!handle) return;
  const status=$('#autoBackupStatus');
  try{
    const allowed=await ensureDirectoryPermission(handle,false);
    if(!allowed){
      if(status) status.textContent='Backup pendiente: vuelve a autorizar la carpeta cuando entres a Backup.';
      return;
    }
    const name=await writeBackupToDirectory(handle);
    if(status) status.textContent='✓ Backup automático guardado: '+name;
    await renderAutoBackupSettings();
  }catch(err){
    if(status) status.textContent='No se pudo guardar el backup automático: '+err.message;
  }
}

function backupFileStamp(){
  const d=new Date();
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+p(d.getSeconds());
}
function crmBackupPayload(){
  return {
    app:'AGR CRM',
    version:'v18',
    createdAt:new Date().toISOString(),
    storeKey,
    counts:{
      clients:data.clients?.length||0,
      companies:data.clients?.filter(c=>c.isCompany).length||0,
      cases:data.cases?.length||0,
      payments:data.payments?.length||0,
      cashbook:data.cashbook?.length||0,
      expenses:data.expenses?.length||0,
      appointments:data.appointments?.length||0,
      tasks:data.tasks?.length||0
    },
    data:structuredClone(data)
  };
}
async function downloadStandaloneCRM(){
  const fetchText=async url=>{
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo descargar '+url);
    return await res.text();
  };
  const fetchDataUrl=async url=>{
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo descargar '+url);
    const blob=await res.blob();
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el logo.'));
      reader.readAsDataURL(blob);
    });
  };

  const base=new URL('./',location.href);
  const indexUrl=new URL('index.html',base).href+'?offline='+Date.now();
  const cssUrl=new URL('styles.css',base).href+'?offline='+Date.now();
  const jsUrl=new URL('app.js',base).href+'?offline='+Date.now();
  const logoUrl=new URL('../logo-agr.jpeg.jpeg',base).href+'?offline='+Date.now();

  const [html,css,js,logoData]=await Promise.all([
    fetchText(indexUrl),
    fetchText(cssUrl),
    fetchText(jsUrl),
    fetchDataUrl(logoUrl)
  ]);

  let standalone=html
    .replace(/<link rel="stylesheet" href="\.\/styles\.css\?v=[^"]+"\s*\/?>/i,'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>')
    .replace(/<script src="\.\/app\.js\?v=[^"]+"><\/script>/i,'<script>'+js.replace(/<\/script/gi,'<\\/script')+'<\/script>')
    .replace(/src="\.\.\/logo-agr\.jpeg\.jpeg"/g,'src="'+logoData+'"');

  standalone=standalone.replace(
    '<div class="demo-banner">',
    '<div class="demo-banner">COPIA LOCAL DEL CRM · Restaura tu backup de datos desde la sección Backup<br><span style="display:none">'
  ).replace(
    '</div>\n  <div class="app-shell">',
    '</span></div>\n  <div class="app-shell">'
  );

  const blob=new Blob([standalone],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='AGR-CRM-COMPLETO-'+backupFileStamp()+'.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function downloadCRMBackup(prefix='AGR-CRM-BACKUP'){
  const payload=crmBackupPayload();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=prefix+'-'+backupFileStamp()+'.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return payload;
}
function validateCRMBackupPayload(payload){
  const restored=payload?.data && typeof payload.data==='object' ? payload.data : payload;
  if(!restored || typeof restored!=='object') throw new Error('El archivo no contiene datos válidos.');
  const required=['clients','cases','payments','appointments'];
  for(const key of required){
    if(!Array.isArray(restored[key])) throw new Error('Falta la sección "'+key+'" del CRM.');
  }
  return restored;
}
function renderBackup(){
  renderAutoBackupSettings();
  const box=$('#backupSummary');
  if(!box) return;
  const counts={
    clientes:data.clients.filter(c=>!c.isCompany).length,
    empresas:data.clients.filter(c=>c.isCompany).length,
    casos:data.cases.length,
    pagos:data.payments.length,
    caja:data.cashbook.length,
    egresos:data.expenses.length
  };
  box.innerHTML=
    '<div><span>Clientes</span><strong>'+counts.clientes+'</strong></div>'+
    '<div><span>Empresas</span><strong>'+counts.empresas+'</strong></div>'+
    '<div><span>Casos</span><strong>'+counts.casos+'</strong></div>'+
    '<div><span>Pagos</span><strong>'+counts.pagos+'</strong></div>'+
    '<div><span>Ingresos</span><strong>'+counts.caja+'</strong></div>'+
    '<div><span>Egresos</span><strong>'+counts.egresos+'</strong></div>';
}
function switchView(view){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const labels={dashboard:'Dashboard',clients:'Clientes',companies:'Empresas',cases:'Casos & trámites',services:'Servicios',payments:'Pagos',cashbook:'Caja',appointments:'Citas',tasks:'Tareas',backup:'Backup'};
  $('#pageTitle').textContent=labels[view]||'AGR CRM';
  if(view==='cashbook') requestAnimationFrame(()=>renderCashbook());
  if(view==='backup') requestAnimationFrame(()=>renderBackup());
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
  renderCompanies();
  renderCases();
  renderServices();
  renderPayments();
  renderCashbook();
  renderExpenses();
  renderBackup();
  bindCaseOpeners();
}



function cashbookTotals(){
  const today=todayISO();
  const month=today.slice(0,7);
  const total=data.cashbook.reduce((s,x)=>s+Number(x.amount||0),0);
  const todayTotal=data.cashbook.filter(x=>x.date===today).reduce((s,x)=>s+Number(x.amount||0),0);
  const monthTotal=data.cashbook.filter(x=>String(x.date||'').startsWith(month)).reduce((s,x)=>s+Number(x.amount||0),0);
  return {todayTotal,monthTotal,total};
}
function populateCashbookClients(){
  const clientSelect=$('#cashbookClient');
  if(!clientSelect) return;
  const current=clientSelect.value;
  const options=data.clients
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')))
    .map(c=>'<option value="'+Number(c.id)+'">'+esc(c.name)+(c.isCompany?' · Empresa':'')+'</option>')
    .join('');
  clientSelect.innerHTML='<option value="">Sin cliente vinculado</option>'+options;
  if(current && data.clients.some(c=>String(c.id)===String(current))) clientSelect.value=current;
}
function cashbookItemRowHTML(item={}){
  const qty=Math.max(1,Number(item.quantity||1));
  const unit=Math.max(0,Number(item.unitPrice||0));
  return `<div class="cashbook-item-row">
    <input class="cashbook-item-service" type="text" placeholder="Ej. Contrato de renta" value="${esc(item.service||'')}">
    <input class="cashbook-item-subservice" type="text" placeholder="Ej. Renovación / Mes enero" value="${esc(item.subservice||'')}">
    <input class="cashbook-item-qty" type="number" min="1" step="1" value="${qty}">
    <input class="cashbook-item-unit" type="number" min="0" step="0.01" value="${unit||''}" placeholder="0.00">
    <strong class="cashbook-item-total">${money(qty*unit)}</strong>
    <button type="button" class="cashbook-remove-item" aria-label="Eliminar">×</button>
  </div>`;
}
function getCashbookItems(){
  return [...document.querySelectorAll('.cashbook-item-row')].map(row=>({
    service:row.querySelector('.cashbook-item-service')?.value?.trim()||'',
    subservice:row.querySelector('.cashbook-item-subservice')?.value?.trim()||'',
    quantity:Math.max(1,Number(row.querySelector('.cashbook-item-qty')?.value||1)),
    unitPrice:Math.max(0,Number(row.querySelector('.cashbook-item-unit')?.value||0))
  })).filter(x=>x.service && x.unitPrice>0);
}
function refreshCashbookItems(){
  document.querySelectorAll('.cashbook-item-row').forEach(row=>{
    const qty=Math.max(1,Number(row.querySelector('.cashbook-item-qty')?.value||1));
    const unit=Math.max(0,Number(row.querySelector('.cashbook-item-unit')?.value||0));
    const total=row.querySelector('.cashbook-item-total');
    if(total) total.textContent=money(qty*unit);
  });
  const grand=getCashbookItems().reduce((s,x)=>s+x.quantity*x.unitPrice,0);
  const box=$('#cashbookGrandTotal');
  if(box) box.textContent=money(grand);
}
function bindCashbookItems(){
  const wrap=$('#cashbookItems');
  if(!wrap) return;
  wrap.querySelectorAll('.cashbook-item-qty,.cashbook-item-unit').forEach(el=>el.oninput=refreshCashbookItems);
  wrap.querySelectorAll('.cashbook-remove-item').forEach(btn=>btn.onclick=()=>{
    const rows=wrap.querySelectorAll('.cashbook-item-row');
    if(rows.length<=1){
      const row=btn.closest('.cashbook-item-row');
      row.querySelectorAll('input').forEach(input=>input.value=input.classList.contains('cashbook-item-qty')?'1':'');
    }else{
      btn.closest('.cashbook-item-row')?.remove();
    }
    refreshCashbookItems();
  });
}
function ensureCashbookItemRow(){
  const wrap=$('#cashbookItems');
  if(!wrap) return;
  if(!wrap.querySelector('.cashbook-item-row')) wrap.innerHTML=cashbookItemRowHTML();
  bindCashbookItems();
  refreshCashbookItems();
}
function renderCashbook(){
  const summary=$('#cashbookSummary'), table=$('#cashbookTable'), form=$('#cashbookForm');
  if(!summary||!table||!form) return;
  populateCashbookClients();
  const t=cashbookTotals();
  summary.innerHTML=`
    <div><span>Hoy</span><strong>${money(t.todayTotal)}</strong></div>
    <div><span>Este mes</span><strong>${money(t.monthTotal)}</strong></div>
    <div><span>Total registrado</span><strong>${money(t.total)}</strong></div>
  `;
  const rows=[...data.cashbook].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
  table.innerHTML=rows.length?rows.map(x=>{
    const items=Array.isArray(x.items)&&x.items.length?x.items:[{service:x.concept||'Ingreso',subservice:'',quantity:1,unitPrice:Number(x.amount||0)}];
    const detail=items.map(i=>esc(i.service)+(i.subservice?' · '+esc(i.subservice):'')+' · '+Number(i.quantity||1)+' × '+money(i.unitPrice||0)).join('<br>');
    return `<tr><td>${esc(x.date||'—')}</td><td>${x.clientId?esc(clientName(x.clientId)):'—'}</td><td>${detail}</td><td>${esc(x.category||'—')}</td><td>${esc(x.method||'—')}</td><td><strong>${money(x.amount)}</strong></td><td>${esc(x.note||'—')}</td></tr>`;
  }).join(''):'<tr><td colspan="7">No hay ingresos rápidos registrados.</td></tr>';
  const dateInput=$('#cashbookDate');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  ensureCashbookItemRow();
}

function expenseTotals(){
  const today=todayISO();
  const month=today.slice(0,7);
  const total=data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const todayTotal=data.expenses.filter(x=>x.date===today).reduce((s,x)=>s+Number(x.amount||0),0);
  const monthTotal=data.expenses.filter(x=>String(x.date||'').startsWith(month)).reduce((s,x)=>s+Number(x.amount||0),0);
  return {todayTotal,monthTotal,total};
}
function expenseItemRowHTML(item={}){
  const qty=Math.max(1,Number(item.quantity||1));
  const unit=Math.max(0,Number(item.unitPrice||0));
  return `<div class="cashbook-item-row expense-item-row">
    <input class="expense-item-service" type="text" placeholder="Ej. Envío USPS" value="${esc(item.service||'')}">
    <input class="expense-item-subservice" type="text" placeholder="Ej. Priority Mail / Cliente X" value="${esc(item.subservice||'')}">
    <input class="expense-item-qty" type="number" min="1" step="1" value="${qty}">
    <input class="expense-item-unit" type="number" min="0" step="0.01" value="${unit||''}" placeholder="0.00">
    <strong class="expense-item-total">${money(qty*unit)}</strong>
    <button type="button" class="cashbook-remove-item expense-remove-item" aria-label="Eliminar">×</button>
  </div>`;
}
function getExpenseItems(){
  return [...document.querySelectorAll('.expense-item-row')].map(row=>({
    service:row.querySelector('.expense-item-service')?.value?.trim()||'',
    subservice:row.querySelector('.expense-item-subservice')?.value?.trim()||'',
    quantity:Math.max(1,Number(row.querySelector('.expense-item-qty')?.value||1)),
    unitPrice:Math.max(0,Number(row.querySelector('.expense-item-unit')?.value||0))
  })).filter(x=>x.service && x.unitPrice>0);
}
function refreshExpenseItems(){
  document.querySelectorAll('.expense-item-row').forEach(row=>{
    const qty=Math.max(1,Number(row.querySelector('.expense-item-qty')?.value||1));
    const unit=Math.max(0,Number(row.querySelector('.expense-item-unit')?.value||0));
    const total=row.querySelector('.expense-item-total');
    if(total) total.textContent=money(qty*unit);
  });
  const grand=getExpenseItems().reduce((s,x)=>s+x.quantity*x.unitPrice,0);
  const box=$('#expenseGrandTotal');
  if(box) box.textContent=money(grand);
}
function bindExpenseItems(){
  const wrap=$('#expenseItems');
  if(!wrap) return;
  wrap.querySelectorAll('.expense-item-qty,.expense-item-unit').forEach(el=>el.oninput=refreshExpenseItems);
  wrap.querySelectorAll('.expense-remove-item').forEach(btn=>btn.onclick=()=>{
    const rows=wrap.querySelectorAll('.expense-item-row');
    if(rows.length<=1){
      const row=btn.closest('.expense-item-row');
      row.querySelectorAll('input').forEach(input=>input.value=input.classList.contains('expense-item-qty')?'1':'');
    }else{
      btn.closest('.expense-item-row')?.remove();
    }
    refreshExpenseItems();
  });
}
function ensureExpenseItemRow(){
  const wrap=$('#expenseItems');
  if(!wrap) return;
  if(!wrap.querySelector('.expense-item-row')) wrap.innerHTML=expenseItemRowHTML();
  bindExpenseItems();
  refreshExpenseItems();
}
function renderExpenses(){
  const summary=$('#expenseSummary'), table=$('#expenseTable'), form=$('#expenseForm');
  if(!summary||!table||!form) return;
  const t=expenseTotals();
  summary.innerHTML=`
    <div><span>Hoy</span><strong>${money(t.todayTotal)}</strong></div>
    <div><span>Este mes</span><strong>${money(t.monthTotal)}</strong></div>
    <div><span>Total registrado</span><strong>${money(t.total)}</strong></div>
  `;
  const rows=[...data.expenses].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
  table.innerHTML=rows.length?rows.map(x=>{
    const items=Array.isArray(x.items)&&x.items.length?x.items:[{service:x.concept||'Gasto',subservice:'',quantity:1,unitPrice:Number(x.amount||0)}];
    const detail=items.map(i=>esc(i.service)+(i.subservice?' · '+esc(i.subservice):'')+' · '+Number(i.quantity||1)+' × '+money(i.unitPrice||0)).join('<br>');
    return `<tr><td>${esc(x.date||'—')}</td><td>${esc(x.payee||'—')}</td><td>${detail}</td><td>${esc(x.category||'—')}</td><td>${esc(x.method||'—')}</td><td><strong>${money(x.amount)}</strong></td><td>${esc(x.note||'—')}</td></tr>`;
  }).join(''):'<tr><td colspan="7">No hay egresos registrados.</td></tr>';
  const dateInput=$('#expenseDate');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  ensureExpenseItemRow();
}
function switchCashTab(tab){
  document.querySelectorAll('[data-cash-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.cashTab===tab));
  document.querySelectorAll('[data-cash-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.cashPane===tab));
  if(tab==='expense') requestAnimationFrame(()=>renderExpenses());
  else requestAnimationFrame(()=>renderCashbook());
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
    const text=[c.folderNumber,c.name,c.phone,c.email].join(' ').toLowerCase();
    if(text.includes(term)) results.push({type:c.isCompany?'Empresa':'Cliente',title:c.name,meta:[c.folderNumber?'Carpeta '+c.folderNumber:'',c.phone,c.email].filter(Boolean).join(' · '),action:'client',id:c.id});
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
function deleteClientRecord(clientId){
  const id=Number(clientId);
  const client=clientById(id);
  if(!client) return;
  const hasCases=data.cases.some(x=>Number(x.clientId)===id);
  const hasAccount=data.clientAccountCharges.some(x=>Number(x.clientId)===id) ||
    data.clientAccountPayments.some(x=>Number(x.clientId)===id) ||
    data.clientAccountInvoices.some(x=>Number(x.clientId)===id);
  const hasCash=data.cashbook.some(x=>Number(x.clientId)===id) || data.expenses.some(x=>Number(x.clientId)===id);
  if(hasCases||hasAccount||hasCash){
    alert('No se puede eliminar todavía a '+client.name+'. Primero elimina o desvincula sus casos o movimientos.');
    return;
  }
  if(!window.confirm('¿Eliminar '+(client.isCompany?'empresa':'cliente')+'?\n\n'+client.name+'\n\nEsta acción no se puede deshacer.')) return;
  data.clients=data.clients.filter(x=>Number(x.id)!==id);
  save();
  render();
}

function ensureDeleteIconStyle(){
  if(document.getElementById('agrDeleteIconStyle')) return;
  const style=document.createElement('style');
  style.id='agrDeleteIconStyle';
  style.textContent='.delete-icon-btn{width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:12px!important}.delete-icon-btn svg{width:19px;height:19px;display:block}.delete-icon-btn:hover{transform:translateY(-1px)}';
  document.head.appendChild(style);
}

function renderClients(filter=''){
  ensureDeleteIconStyle();
  const q=filter.toLowerCase();
  const table=$('#clientsTable');
  if(!table) return;
  table.innerHTML=data.clients
    .filter(c=>!c.isCompany && [c.folderNumber,c.name,c.phone,c.email].join(' ').toLowerCase().includes(q))
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')))
    .map(c=>{
      const cases=data.cases.filter(x=>x.clientId===c.id).length;
      const caseBal=data.cases.filter(x=>x.clientId===c.id).reduce((s,k)=>s+caseBalance(k),0);
      return `<tr><td><span class="folder-number-badge">${esc(c.folderNumber||'—')}</span></td><td><strong>${c.name}</strong></td><td>${c.phone}</td><td>${c.email||'—'}</td><td>${cases}</td><td><strong>${money(caseBal)}</strong></td><td><button type="button" class="danger delete-icon-btn" data-delete-client-id="${c.id}" title="Eliminar" aria-label="Eliminar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg></button></td></tr>`
    }).join('')||'<tr><td colspan="7">No hay clientes personales registrados.</td></tr>';
  table.querySelectorAll('[data-delete-client-id]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();deleteClientRecord(Number(btn.dataset.deleteClientId));});
}
function renderCompanies(filter=''){
  ensureDeleteIconStyle();
  const q=filter.toLowerCase();
  const table=$('#companiesTable');
  if(!table) return;
  table.innerHTML=data.clients
    .filter(c=>c.isCompany && [c.folderNumber,c.name,c.phone,c.email].join(' ').toLowerCase().includes(q))
    .slice()
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')))
    .map(c=>{
      const cases=data.cases.filter(x=>x.clientId===c.id).length;
      const caseBal=data.cases.filter(x=>x.clientId===c.id).reduce((s,k)=>s+caseBalance(k),0);
      const acctBal=accountBalance(c.id);
      return `<tr><td><span class="folder-number-badge">${esc(c.folderNumber||'—')}</span></td><td><strong>${c.name}</strong></td><td>${c.phone}</td><td>${c.email||'—'}</td><td>${cases}</td><td><strong>${money(caseBal+acctBal)}</strong>${acctBal>0?'<small class="account-balance-note">Cuenta global: '+money(acctBal)+'</small>':''}</td><td><button type="button" class="primary client-account-btn" data-company-account-id="${c.id}">Cuenta / Factura global</button> <button type="button" class="danger delete-icon-btn" data-delete-client-id="${c.id}" title="Eliminar" aria-label="Eliminar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg></button></td></tr>`
    }).join('')||'<tr><td colspan="7">No hay empresas registradas.</td></tr>';
  table.querySelectorAll('[data-company-account-id]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();openClientAccount(Number(btn.dataset.companyAccountId));});
  table.querySelectorAll('[data-delete-client-id]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();deleteClientRecord(Number(btn.dataset.deleteClientId));});
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
$('#clientSearch')?.addEventListener('input',e=>renderClients(e.target.value));
$('#companySearch')?.addEventListener('input',e=>renderCompanies(e.target.value));

const dialog=$('#recordDialog'), form=$('#recordForm'), fields=$('#formFields'), modalTitle=$('#modalTitle');
let mode='client';
let editingCaseId=null;
let editingPaymentId=null;
let editingServiceId=null;

const templates={
  client:()=>[['folderNumber','No. de carpeta física','text',''],['name','Nombre completo','text','full'],['phone','Teléfono','tel',''],['email','Email','email',''],['isCompany','Tipo de cliente','clientType','']],
  company:()=>[['folderNumber','No. de carpeta física','text',''],['name','Nombre de la empresa','text','full'],['phone','Teléfono','tel',''],['email','Email','email','']],
  case:()=>[
    ['clientId','Cliente','client',''],
    ['service','Servicio / trámite','serviceSelect','full'],
    ['status','Estado inicial','status',''],
    ['deadline','Deadline / fecha límite','date',''],
    ['receiptNumber','Receipt Number (cuando se reciba)','text',''],
    ['aNumber','A-Number (opcional)','text',''],
    ['serviceTotal','Precio estándar / Cash / Zelle','number',''],
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
  } else if(type==='clientType') {
    input=`<select name="${name}"><option value="false" ${val!==true?'selected':''}>Persona</option><option value="true" ${val===true?'selected':''}>Empresa</option></select>`;
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
    cashPrice:fd.serviceTotal!==undefined?fd.serviceTotal:(existing?.serviceTotal ?? caseStandardPrice(existing||{})),
    zellePrice:fd.serviceTotal!==undefined?fd.serviceTotal:(existing?.serviceTotal ?? caseStandardPrice(existing||{})),
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
  const deleteCaseButton=$('#deleteCaseButton');
  if(deleteCaseButton){
    deleteCaseButton.hidden=tab!=='summary';
    deleteCaseButton.style.display=tab==='summary'?'':'none';
  }
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
  const balance=caseBalance(k);
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
  const balance=caseBalance(k);
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
  const balance=caseBalance(k);
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
  const balance=caseBalance(k);
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
        <div><span>Cash / Zelle</span><strong>${money(caseCashPrice(k))}</strong></div>
        <div><span>Tarjeta / Stripe</span><strong>${money(caseCardPrice(k))}</strong></div>
      </div>
      <div class="case-pricing-editor" id="casePricingEditor" hidden>
        <label>Precio estándar<input type="number" min="0" step="0.01" id="caseStandardPrice" value="${Number(caseStandardPrice(k)).toFixed(2)}"></label>
        <label>Precio Cash / Zelle<input type="number" min="0" step="0.01" id="caseCashPrice" value="${Number(caseCashPrice(k)).toFixed(2)}"></label>
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
      
    </div>

    <div class="workspace-table"><table>
      <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Nota</th><th>Documento</th></tr></thead>
      <tbody>
        ${rows.length?rows.map(p=>`<tr><td>${esc(p.date||'—')}</td><td><strong>${money(p.amount)}</strong>${Number(p.discountCredit||0)>0?'<small class="payment-credit"> + '+money(p.discountCredit)+' descuento</small>':''}</td><td>${esc(p.method||'—')}</td><td>${esc(p.note||'—')}</td><td><button type="button" class="secondary payment-doc-btn" data-payment-doc="${p.id}" data-final="${isFinalPayment(k,p)?'1':'0'}">${isFinalPayment(k,p)?'Factura final':'Recibo'}</button>${isFinalPayment(k,p)?' <button type="button" class="secondary payment-email-btn" data-payment-email="'+p.id+'">Correo</button>':''}</td></tr>`).join(''):'<tr><td colspan="5">No hay pagos registrados.</td></tr>'}
      </tbody>
    </table></div>
    ${balanceReminderHTML(k)}`;

  $('#workspaceAddPayment').onclick=()=>{dialog.close();openModal('payment',{caseId:k.id,date:new Date().toISOString().slice(0,10)});};
  pane.querySelectorAll('.payment-doc-btn').forEach(btn=>{
    btn.onclick=()=>{
      const p=data.payments.find(x=>String(x.id)===String(btn.dataset.paymentDoc));
      if(p) openPaymentDocument(k,p,btn.dataset.final==='1');
    };
  });
  pane.querySelectorAll('.payment-email-btn').forEach(btn=>{
    btn.onclick=()=>{
      const p=data.payments.find(x=>String(x.id)===String(btn.dataset.paymentEmail));
      const client=clientById(k.clientId);
      if(!p || !client?.email){alert('Este cliente no tiene un correo registrado.');return;}
      const docNo=k.invoiceNumber||('AGR-'+k.id);
      const subject='Factura final · '+docNo+' · AGR Solutions LLC';
      const body='Hola '+(client.name||'')+',\n\nAdjuntamos su factura final correspondiente a '+(k.service||'su servicio')+'.\n\nReferencia: '+docNo+'\n\nGracias por confiar en AGR Solutions LLC.\n203-824-0351\nagrsolutionsllc.com';
      const gmail='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(client.email)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      window.open(gmail,'_blank','noopener');
      alert('Se abrió el correo preparado. Guarda la factura como PDF y adjúntala antes de enviarla.');
    };
  });

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
  const cardInput=$('#caseCardPrice');
  const preview=$('#casePricingLivePreview');
  const saveBtn=$('#saveCasePricing');
  const priceStatus=$('#casePricingStatus');

  const refreshPricingEditor=()=>{
    const standard=Math.max(0,Number(standardInput?.value||0));
    const cash=Math.max(0,Number(cashInput?.value||standard));
    const card=Math.max(0,Number(cardInput?.value||standard));
    if(preview) preview.innerHTML=
      '<span>Precio estándar</span><strong>'+money(standard)+'</strong>'+
      '<span>Cash / Zelle</span><strong>'+money(cash)+'</strong>'+
      '<span>Tarjeta / Stripe</span><strong>'+money(card)+'</strong>';
  };
  if(toggle && editor) toggle.onclick=()=>{editor.hidden=!editor.hidden;toggle.textContent=editor.hidden?'Editar precios':'Ocultar';refreshPricingEditor();};
  [standardInput,cashInput,cardInput].forEach(el=>el?.addEventListener('input',refreshPricingEditor));

  if(saveBtn) saveBtn.onclick=()=>{
    const standard=Math.max(0,Number(standardInput?.value||0));
    const cash=Math.max(0,Number(cashInput?.value||0));
    const zelle=cash;
    const card=Math.max(0,Number(cardInput?.value||0));
    const collected=caseCollected(k.id);
    if(!Number.isFinite(standard)||standard<=0){if(priceStatus)priceStatus.textContent='Ingresa un precio estándar mayor que $0.00.';return;}
    if([cash,card].some(v=>!Number.isFinite(v)||v<=0)){if(priceStatus)priceStatus.textContent='Todos los precios deben ser mayores que $0.00.';return;}
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
function isImmigrationCase(k){
  const s=String(k?.service||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return /inmigr|uscis|nvc|consular|visa|asilo|daca|ciudadania|naturaliz|residenc|green card|permiso de trabajo|ead|foia|sij|vawa|perdon|waiver|i-130|i-485|i-765|i-589|i-360|i-601|i-601a|n-400|i-90|i-821d|u visa|t visa/.test(s);
}
function caseContractFor(k){
  const key=String(k.id);
  if(!data.caseContracts[key]){
    data.caseContracts[key]={
      status:'No creado',
      date:'',
      total:Number(k.serviceTotal||0),
      initialPayment:Number(k.initialPayment||0),
      scope:'',
      terms:'',
      signedDate:''
    };
  }
  return data.caseContracts[key];
}
async function contractPdfForFoxit(k,c){
  if(typeof html2pdf!=='function') throw new Error('El generador de PDF no está disponible. Recarga el CRM e intenta nuevamente.');
  const frame=$('#caseContractPreview');
  const doc=frame?.contentDocument;
  const source=doc?.querySelector('.doc');
  const signPage=source?.querySelector('.sign-page');
  if(!source||!signPage) throw new Error('No se pudo leer la vista del contrato.');

  const agrSignatureDataUrl=data.esignSettings?.agrSignatureDataUrl||'';
  if(!agrSignatureDataUrl) throw new Error('Configura una vez la firma predeterminada de AGR antes de enviar contratos a Foxit.');

  const client=clientById(k.clientId);
  const agreementDate=c.date||todayISO();
  const prev={
    margin:source.style.margin,
    boxShadow:source.style.boxShadow,
    maxWidth:source.style.maxWidth,
    width:source.style.width,
    padding:source.style.padding,
    signDisplay:signPage.style.display
  };

  source.style.margin='0';
  source.style.boxShadow='none';
  source.style.maxWidth='none';
  source.style.width='7.5in';
  source.style.padding='0.35in 0.45in';
  signPage.style.display='none';

  const options={
    margin:[18,18,18,18],
    filename:(k.invoiceNumber||('AGR-'+k.id))+'-Service-Agreement.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:1.6,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0},
    jsPDF:{unit:'pt',format:'letter',orientation:'portrait'},
    pagebreak:{mode:['css','legacy'],avoid:['.grid','.box']}
  };

  try{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const worker=html2pdf().set(options).from(source).toPdf();
    const pdf=await worker.get('pdf');

    pdf.addPage('letter','portrait');
    const pageCount=pdf.internal.getNumberOfPages();

    const left=54;
    const contentW=504;
    const gap=32;
    const colW=(contentW-gap)/2;
    const rightX=left+colW+gap;

    pdf.setTextColor(23,34,59);
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(18);
    pdf.text('Aceptación y firmas',left,72);

    pdf.setFont('helvetica','normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(100,116,139);
    pdf.text('Confirmación final del Acuerdo General de Servicios de Preparación Documental Migratoria',left,92);

    pdf.setFillColor(255,255,255);
    pdf.setDrawColor(216,221,230);
    pdf.roundedRect(left,118,contentW,58,6,6,'FD');
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(23,34,59);
    const note='Al firmar electrónicamente, el cliente y AGR Solutions LLC confirman su aceptación de este acuerdo y reconocen que la firma electrónica será utilizada como evidencia de su consentimiento. Cada firmante podrá conservar una copia del documento completado.';
    pdf.text(pdf.splitTextToSize(note,contentW-24),left+12,136,{lineHeightFactor:1.35});

    pdf.setFont('helvetica','bold');
    pdf.setFontSize(9);
    pdf.setTextColor(11,35,72);
    pdf.text('CLIENTE',left,220);
    pdf.text('AGR SOLUTIONS LLC',rightX,220);

    pdf.setDrawColor(203,213,225);
    pdf.rect(left,236,colW,62);
    pdf.rect(rightX,236,colW,62);

    pdf.addImage(agrSignatureDataUrl,'PNG',rightX+16,244,150,46,'AGR_DEFAULT_SIGNATURE','FAST');

    pdf.setDrawColor(17,24,39);
    pdf.line(left,310,left+colW,310);
    pdf.line(rightX,310,rightX+colW,310);

    pdf.setFont('helvetica','bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(23,34,59);
    pdf.text('Firma del cliente',left,326);
    pdf.text('Firma autorizada de AGR',rightX,326);

    pdf.setFont('helvetica','normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(100,116,139);
    pdf.text('Nombre: '+(client?.name||'Cliente'),left,344);
    pdf.text('Firma electrónica mediante Foxit eSign',left,359);
    pdf.text('Fecha de firma: se completa al firmar',left,374);

    pdf.text('Representante: '+(data.esignSettings?.agrSignerName||'Ariana G Reinoso'),rightX,344);
    pdf.text('Firma predeterminada de AGR Solutions LLC',rightX,359);
    pdf.text('Fecha del acuerdo: '+agreementDate,rightX,374);

    const dataUri=pdf.output('datauristring');
    return {pdfBase64:String(dataUri).split(',')[1]||'',pageCount,signaturePage:pageCount};
  }finally{
    signPage.style.display=prev.signDisplay;
    source.style.margin=prev.margin;
    source.style.boxShadow=prev.boxShadow;
    source.style.maxWidth=prev.maxWidth;
    source.style.width=prev.width;
    source.style.padding=prev.padding;
  }
}
function foxitStatusLabel(status=''){
  const s=String(status||'').toUpperCase();
  if(/EXECUTED|COMPLETED/.test(s)) return 'Firmado';
  if(/PARTIALLY SIGNED/.test(s)) return 'Parcialmente firmado';
  if(/^SIGNED$/.test(s)) return 'Firmado';
  if(/CANCEL|DECLIN/.test(s)) return 'Cancelado';
  if(/SHARED|SENT|OUT_FOR_SIGNATURE/.test(s)) return 'Pendiente de firma';
  return status||'Pendiente';
}
async function sendContractToFoxit(k,c){
  const client=clientById(k.clientId);
  if(!client?.email) throw new Error('Este cliente no tiene email registrado. Añade un email antes de enviar a firma.');
  const agrSignatureDataUrl=data.esignSettings?.agrSignatureDataUrl||'';
  if(!agrSignatureDataUrl) throw new Error('Configura una vez la firma predeterminada de AGR antes de enviar contratos a Foxit.');
  const {pdfBase64,pageCount,signaturePage}=await contractPdfForFoxit(k,c);
  const response=await fetch(FOXIT_SEND_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      pdfBase64,
      pageCount,
      signaturePage,
      caseId:k.id,
      clientName:client.name||'Cliente',
      clientEmail:client.email,
      service:k.service||'Servicio migratorio',
      invoiceNumber:k.invoiceNumber||''
    })
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||'No se pudo enviar el contrato a Foxit.');
  return result;
}
async function refreshFoxitContractStatus(k,c){
  if(!c.foxitFolderId) throw new Error('Este contrato todavía no ha sido enviado a Foxit.');
  const response=await fetch(FOXIT_STATUS_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({folderId:c.foxitFolderId})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||'No se pudo consultar Foxit.');
  return result;
}

async function autoRefreshFoxitContract(k,c){
  if(!c?.foxitFolderId || c.status==='Firmado' || c._foxitRefreshing) return;
  c._foxitRefreshing=true;
  try{
    const result=await refreshFoxitContractStatus(k,c);
    const mapped=foxitStatusLabel(result.status||'');
    c.foxitStatus=result.status||c.foxitStatus||'';
    if(mapped==='Firmado'){
      c.status='Firmado';
      c.signedDate=c.signedDate||todayISO();
      c.completedAt=new Date().toISOString();
      save();
      logCaseEvent(k.id,'Contrato completado en Foxit eSign','contract');
      renderCaseContract(k);
      setTimeout(()=>showSignedFoxitPdf(k,c),250);
      return;
    }
    if(mapped==='Parcialmente firmado'){
      c.status='Pendiente de firma';
      save();
      const box=$('#contractFoxitStatus');
      if(box) box.innerHTML='<strong>Foxit eSign:</strong> Parcialmente firmado · esperando la firma restante';
    }
  }catch(err){
    console.warn('No se pudo actualizar Foxit automáticamente:',err);
  }finally{
    delete c._foxitRefreshing;
  }
}

function contractFormRecord(k,c){
  return {
    status:c.status||'No enviado',
    date:c.date||'',
    total:Number(c.total||caseCashPrice(k)||caseStandardPrice(k)||0),
    initialPayment:Number($('#contractInitial')?.value||c.initialPayment||0),
    scope:$('#contractScope')?.value?.trim()||c.scope||'',
    terms:$('#contractTerms')?.value?.trim()||c.terms||'',
    signedDate:c.signedDate||''
  };
}
async function showSignedFoxitPdf(k,c){
  const frame=$('#caseContractPreview');
  if(!frame||!c?.foxitFolderId) return false;
  try{
    const url=FOXIT_SIGNED_PDF_URL+'?folderId='+encodeURIComponent(c.foxitFolderId)+'&t='+Date.now();
    frame.removeAttribute('srcdoc');
    frame.src=url;
    const head=document.querySelector('.contract-master-preview-wrap .workspace-head h3');
    if(head) head.textContent='Contrato final firmado';
    return true;
  }catch(err){
    console.warn('No se pudo cargar el PDF firmado de Foxit:',err);
    return false;
  }
}
function refreshEmbeddedContractPreview(k,c){
  const frame=$('#caseContractPreview');
  if(!frame) return;
  if(c?.status==='Firmado' && c?.foxitFolderId){
    showSignedFoxitPdf(k,c).then(ok=>{
      if(ok) return;
      let html=caseContractDraftHTML(k,contractFormRecord(k,c));
      html=html.replace(/<script>[\s\S]*?<\\\/script>/i,'');
      frame.removeAttribute('src');
      frame.srcdoc=html;
    });
    return;
  }
  let html=caseContractDraftHTML(k,contractFormRecord(k,c));
  html=html.replace(/<script>[\s\S]*?<\\\/script>/i,'');
  frame.removeAttribute('src');
  frame.srcdoc=html;
}
function renderCaseContract(k){
  const tab=$('#caseContractTab');
  const pane=$('#caseContractPane');
  if(!tab||!pane) return;
  const eligible=isImmigrationCase(k);
  tab.hidden=!eligible;
  if(!eligible){
    pane.innerHTML='';
    return;
  }
  const c=caseContractFor(k);
  pane.innerHTML=`
    <div class="contract-card contract-editor-compact">
      <div class="contract-head">
        <div>
          <p class="eyebrow">ACUERDO GENERAL DE SERVICIOS MIGRATORIOS</p>
          <h3>Contrato del caso</h3>
          <small>${esc(clientName(k.clientId))} · ${esc(k.service||'')}</small>
        </div>
        <span class="contract-status">${esc(c.status||'No creado')}</span>
      </div>

      <div class="contract-quick-grid">
        <label>Estado
          <div class="system-field" id="contractStatusDisplay">${esc(c.status||'No enviado')}</div>
        </label>
        <label>Fecha del contrato
          <div class="system-field" id="contractDateDisplay">${esc(c.date||'Se asignará al enviar')}</div>
        </label>
        <label>Pago inicial<input id="contractInitial" type="number" min="0" step="0.01" value="${Number(c.initialPayment||0)}"></label>
        <label>Fecha de firma
          <div class="system-field" id="contractSignedDateDisplay">${esc(c.signedDate||'Pendiente')}</div>
        </label>
      </div>

      <details class="contract-custom-details">
        <summary>Personalización opcional del caso</summary>
        <div class="contract-grid contract-extra-grid">
          <label class="full">Alcance adicional (opcional)<textarea id="contractScope" rows="3" placeholder="Solo si deseas añadir algo específico a este caso.">${esc(c.scope||'')}</textarea></label>
          <label class="full">Notas adicionales (opcional)<textarea id="contractTerms" rows="3" placeholder="Observaciones particulares para este cliente o trámite.">${esc(c.terms||'')}</textarea></label>
        </div>
      </details>

      <details class="contract-custom-details contract-esign-settings">
        <summary>Firma predeterminada de AGR</summary>
        <div class="contract-quick-grid contract-esign-grid">
          <label>Nombre del firmante AGR
            <input id="agrSignerName" type="text" value="${esc(data.esignSettings?.agrSignerName||'Ariana G Reinoso')}" placeholder="Ariana G Reinoso">
          </label>
          <label>Firma guardada
            <input id="agrSignatureFile" type="file" accept="image/png,image/jpeg,image/webp">
          </label>
        </div>
        <div id="agrSignaturePreview" class="contract-signature-preview">
          ${data.esignSettings?.agrSignatureDataUrl
            ? '<img src="'+data.esignSettings.agrSignatureDataUrl+'" alt="Firma predeterminada de AGR"><button type="button" class="secondary" id="removeAgrSignature">Cambiar / eliminar firma</button>'
            : '<small class="contract-note">Aún no hay una firma guardada. Súbela una sola vez y el CRM la insertará automáticamente en cada contrato.</small>'}
        </div>
        <small class="contract-note">Foxit enviará únicamente al cliente. La firma autorizada de AGR quedará incorporada previamente en el PDF, por lo que no recibirás cada contrato para volver a firmarlo.</small>
      </details>

      <div class="contract-actions">
        <button type="button" class="primary" id="saveCaseContract">Guardar contrato</button>
        <button type="button" class="secondary" id="refreshCaseContractPreview">Actualizar vista</button>
        <button type="button" class="secondary" id="printCaseContract">Probar PDF · no usa Foxit</button>
        <button type="button" class="primary" id="sendCaseContractFoxit">Enviar a Foxit eSign</button>

      </div>
      <div class="contract-foxit-status" id="contractFoxitStatus">
        ${c.foxitFolderId
          ? '<strong>Foxit eSign:</strong> '+esc(foxitStatusLabel(c.foxitStatus||'Pendiente de firma'))+' · Folder '+esc(c.foxitFolderId)
          : '<strong>Foxit eSign:</strong> Aún no enviado'}
      </div>
    </div>

    <div class="contract-master-preview-wrap">
      <div class="workspace-head">
        <div><span class="workspace-kicker">DOCUMENTO COMPLETO</span><h3>Vista del contrato maestro</h3></div>
      </div>
      <iframe id="caseContractPreview" class="case-contract-preview" title="Vista previa del contrato maestro"></iframe>
    </div>
  `;

  const updatePreview=()=>refreshEmbeddedContractPreview(k,c);
  ['contractInitial','contractScope','contractTerms'].forEach(id=>{
    $('#'+id)?.addEventListener('input',updatePreview);
    $('#'+id)?.addEventListener('change',updatePreview);
  });

  function persistAgrSignerSettings(){
    const name=$('#agrSignerName')?.value?.trim()||'Ariana G Reinoso';
    data.esignSettings={
      ...(data.esignSettings||{}),
      agrSignerName:name
    };
    save();
  }
  $('#agrSignerName')?.addEventListener('change',()=>{
    persistAgrSignerSettings();
    updatePreview();
  });
  $('#agrSignatureFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){
      alert('Usa una imagen PNG, JPG o WEBP para la firma.');
      event.target.value='';
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=720;
        canvas.height=220;
        const ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);

        const scale=Math.min((canvas.width-40)/img.naturalWidth,(canvas.height-30)/img.naturalHeight,1);
        const w=Math.max(1,Math.round(img.naturalWidth*scale));
        const h=Math.max(1,Math.round(img.naturalHeight*scale));
        const x=Math.round((canvas.width-w)/2);
        const y=Math.round((canvas.height-h)/2);
        ctx.drawImage(img,x,y,w,h);

        data.esignSettings={
          ...(data.esignSettings||{}),
          agrSignerName:$('#agrSignerName')?.value?.trim()||data.esignSettings?.agrSignerName||'Ariana G Reinoso',
          agrSignatureDataUrl:canvas.toDataURL('image/png')
        };
        save();
        renderCaseContract(k);
      };
      img.onerror=()=>alert('No se pudo procesar la imagen de la firma.');
      img.src=String(reader.result||'');
    };
    reader.readAsDataURL(file);
  });
  $('#removeAgrSignature')?.addEventListener('click',()=>{
    if(!data.esignSettings) data.esignSettings={};
    data.esignSettings.agrSignatureDataUrl='';
    save();
    renderCaseContract(k);
  });

  $('#saveCaseContract')?.addEventListener('click',()=>{
    const rec=caseContractFor(k);
    Object.assign(rec,contractFormRecord(k,c));
    persistAgrSignerSettings();
    save();
    logCaseEvent(k.id,'Contrato migratorio actualizado · '+rec.status,'contract');
    renderCaseContract(k);
  });

  $('#refreshCaseContractPreview')?.addEventListener('click',updatePreview);

  $('#printCaseContract')?.addEventListener('click',async()=>{
    const btn=$('#printCaseContract');
    const original=btn?.textContent||'Probar PDF · no usa Foxit';
    if(btn){btn.disabled=true;btn.textContent='Generando PDF de prueba...';}
    try{
      const rec=caseContractFor(k);
      Object.assign(rec,contractFormRecord(k,c));
      if(!rec.date) rec.date=todayISO();
      persistAgrSignerSettings();
      const {pdfBase64}=await contractPdfForFoxit(k,rec);
      const bytes=Uint8Array.from(atob(pdfBase64),ch=>ch.charCodeAt(0));
      const blob=new Blob([bytes],{type:'application/pdf'});
      const url=URL.createObjectURL(blob);
      window.open(url,'_blank','noopener');
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(err){
      alert('No se pudo generar el PDF de prueba: '+err.message);
    }finally{
      if(btn){btn.disabled=false;btn.textContent=original;}
    }
  });

  $('#sendCaseContractFoxit')?.addEventListener('click',async()=>{
    const btn=$('#sendCaseContractFoxit');
    const status=$('#contractFoxitStatus');
    const rec=caseContractFor(k);

    if(rec.foxitFolderId && rec.status!=='Firmado'){
      alert('Este contrato ya fue enviado a Foxit. No se creará otro sobre mientras el envío actual siga pendiente.');
      return;
    }

    const confirmed=window.confirm('ENVIAR A FOXIT\n\nEsto creará un sobre real y consumirá 1 sobre de tu plan.\n\nPara revisar diseño usa “Probar PDF · no usa Foxit”.\n\n¿Deseas enviarlo al cliente ahora?');
    if(!confirmed) return;

    Object.assign(rec,contractFormRecord(k,c));
    if(!rec.date) rec.date=todayISO();
    save();
    btn.disabled=true;
    const original=btn.textContent;
    btn.textContent='Preparando y enviando...';
    if(status) status.textContent='Generando PDF y enviando a Foxit...';
    try{
      persistAgrSignerSettings();
      const result=await sendContractToFoxit(k,rec);
      if(!result?.folderId) throw new Error('Foxit no devolvió un Folder ID; el contrato no se marcará como enviado.');
      rec.foxitFolderId=String(result.folderId);
      rec.foxitStatus=result.status||'SENT';
      rec.foxitSentAt=new Date().toISOString();
      rec.status='Pendiente de firma';
      rec.signedDate='';
      save();
      logCaseEvent(k.id,'Contrato enviado a Foxit eSign · Folder '+result.folderId,'contract');
      renderCaseContract(k);
    }catch(err){
      if(status) status.textContent='Foxit: '+err.message;
      alert('No se pudo enviar a Foxit: '+err.message);
    }finally{
      if(btn){btn.disabled=false;btn.textContent=original;}
    }
  });

  updatePreview();
  if(c.foxitFolderId && c.status!=='Firmado'){
    setTimeout(()=>autoRefreshFoxitContract(k,c),700);
  }
}

function defaultImmigrationScope(k){
  const service=String(k?.service||'servicio migratorio').trim();
  return 'AGR Solutions LLC prestará servicios administrativos de preparación documental relacionados con '+service+'. El servicio incluye recopilación y organización de la información proporcionada por el cliente, preparación mecanográfica de formularios o documentos conforme a las respuestas e instrucciones del cliente, checklist de documentos de soporte, organización del paquete y asistencia administrativa con copias, traducciones o envíos cuando estos servicios hayan sido expresamente contratados. El cliente revisará y aprobará el contenido final antes de cualquier firma o presentación. Cualquier servicio adicional no descrito en este alcance deberá acordarse por separado.';
}

function caseContractDraftHTML(k,c){
  const client=clientById(k.clientId);
  const cashZellePrice=Number(caseCashPrice(k)||caseStandardPrice(k)||c.total||0);
  const cardStripePrice=Number(caseCardPrice(k)||cashZellePrice);
  const scope=(c.scope||'').trim() || defaultImmigrationScope(k);
  const extraTerms=(c.terms||'').trim();

  return `<!doctype html><html><head><meta charset="utf-8"><title>Contrato - ${esc(client?.name||'Cliente')}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#17223b;margin:0;background:#f5f7fa;font-size:10.5pt}
    .doc{max-width:7.5in;margin:14px auto;background:#fff;padding:.38in .48in;box-shadow:0 4px 16px rgba(0,0,0,.06)}
    h1{font-size:18pt;line-height:1.15;margin:3px 0 5px}
    h2{font-size:12.5pt;line-height:1.2;margin:17px 0 6px;color:#0b2348;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    p{font-size:10.5pt;line-height:1.42;margin:6px 0}.muted{color:#64748b;font-size:9.5pt}.small{font-size:9pt;color:#64748b}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
    .box{border:1px solid #dfe5ee;border-radius:7px;padding:8px 10px;min-height:54px;break-inside:avoid;page-break-inside:avoid}
    .box span{display:block;font-size:8.5pt;color:#64748b;margin-bottom:3px}.box strong{font-size:10.5pt}
    .section{font-size:10.5pt;line-height:1.42;border-top:0;padding-top:2px;break-inside:auto}
    .section ol{padding-left:18px;margin:6px 0}.section li{margin:4px 0}
    .status{display:inline-block;padding:4px 8px;border:1px solid #c9a227;border-radius:999px;font-size:8.5pt;font-weight:700;color:#8a6b00}
    .notice{padding:9px 11px;border:1px solid #d8dde6;border-radius:8px;background:#f8fafc;margin:8px 0;font-size:9.5pt;line-height:1.4}
    .sign-page{page-break-before:always;break-before:page;min-height:0;padding:.25in .08in 0;break-inside:avoid;page-break-inside:avoid}
    .sign-title{text-align:center;margin-bottom:.22in}.sign-title h2{border:0;margin:0 0 5px;font-size:15pt}.sign-title p{margin:0;color:#64748b}
    .sign-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:.18in 0 .18in}
    .sign-summary .box{min-height:58px;background:#f8fafc}
    .acceptance{border:1px solid #d8dde6;border-radius:9px;padding:11px 13px;background:#fff;margin:.18in 0 .28in;font-size:9.6pt;line-height:1.42}
    .sign{display:grid;grid-template-columns:1fr 1fr;gap:42px;margin-top:.34in;align-items:start}
    .signature-card{min-height:170px;padding:0 5px}.signature-slot{height:58px;margin:8px 0 6px;display:flex;align-items:flex-end}.client-signature-slot{border-bottom:1px solid #cbd5e1}.agr-signature-slot{border-bottom:1px solid #cbd5e1}
    .line{border-top:1.4px solid #111;padding-top:7px;font-size:10pt;font-weight:700;min-width:0}
    .sign small{display:block;color:#64748b;margin-top:6px;font-weight:400;line-height:1.3}
    .sign-role{font-size:8.5pt!important;text-transform:uppercase;letter-spacing:.05em;color:#0b2348!important;font-weight:700!important;margin-bottom:7px!important}
    .agr-signature-img{display:block;width:150px!important;height:46px!important;max-width:150px!important;max-height:46px!important;object-fit:contain!important;object-position:left bottom!important;margin:0}
    .agr-signature-placeholder{height:68px;margin-bottom:8px}
    @media print{body{background:#fff;font-size:10pt}.doc{box-shadow:none;margin:0;max-width:none;width:auto;padding:.28in .38in}h1{font-size:17pt}h2{font-size:12pt}.grid,.box,.notice{break-inside:avoid;page-break-inside:avoid}.no-print{display:none}}
  </style></head>
  <body><div class="doc">
    <h1>Acuerdo General de Servicios de Preparación Documental Migratoria</h1>
    <div class="muted">AGR Solutions LLC · 294 Tyler Street, East Haven, CT 06512 · 203-824-0351 · agrsolutionsllc.com</div>

    <div class="grid">
      <div class="box"><span>Cliente</span><strong>${esc(client?.name||'Cliente')}</strong></div>
      <div class="box"><span>Servicio / trámite</span><strong>${esc(k.service||'')}</strong></div>
      <div class="box"><span>Fecha</span><strong>${esc(c.date||'—')}</strong></div>
      <div class="box"><span>Referencia</span><strong>${esc(k.invoiceNumber||'—')}</strong></div>
    </div>

    <h2>1. Naturaleza del servicio</h2>
    <div class="section">
      <p>El cliente contrata a AGR Solutions LLC para servicios administrativos y de preparación documental relacionados con el trámite identificado en este acuerdo. AGR Solutions LLC no actúa como abogado, firma de abogados ni representante acreditado ante el Departamento de Justicia, y este acuerdo no crea una relación abogado-cliente.</p>
      <p>AGR Solutions LLC no proporciona asesoría legal, no determina elegibilidad migratoria, no recomienda estrategias legales y no representa al cliente ante USCIS, el Departamento de Estado, EOIR, tribunales u otras agencias. Cuando una cuestión requiera interpretación o asesoría legal, el cliente deberá consultar con un abogado de inmigración o representante acreditado autorizado.</p>
    </div>

    <h2>2. Alcance del servicio contratado</h2>
    <div class="section">
      <p>${esc(scope)}</p>
    </div>

    <h2>3. Responsabilidades del cliente</h2>
    <div class="section">
      <ol>
        <li>Proporcionar información verdadera, completa y actualizada, así como documentos auténticos y legibles.</li>
        <li>Revisar cuidadosamente todos los formularios, declaraciones y documentos antes de firmarlos o autorizar su presentación.</li>
        <li>Informar inmediatamente cualquier cambio de domicilio, teléfono, correo electrónico, estado civil, historial migratorio, antecedentes, viajes u otra circunstancia material.</li>
        <li>Responder oportunamente a las solicitudes de AGR Solutions LLC y entregar los documentos necesarios dentro de los plazos indicados.</li>
        <li>Conservar acceso a sus propias cuentas gubernamentales, credenciales, notificaciones y documentos originales.</li>
      </ol>
    </div>

    <h2>4. Honorarios y opciones de pago</h2>
    <div class="grid">
      <div class="box"><span>Precio Cash / Zelle</span><strong>${money(cashZellePrice)}</strong></div>
      <div class="box"><span>Precio Tarjeta / Stripe</span><strong>${money(cardStripePrice)}</strong></div>
      <div class="box"><span>Pago inicial requerido</span><strong>${money(c.initialPayment)}</strong></div>
    </div>
    <div class="notice"><strong>Condiciones de precio.</strong> Los importes anteriores son precios previamente establecidos para los métodos indicados. No se añadirá al momento del cobro una tarifa separada denominada cargo de procesamiento, conveniencia o transacción.</div>

    <h2>5. Costos gubernamentales y de terceros</h2>
    <div class="section">
      <p>Los honorarios de AGR Solutions LLC no incluyen automáticamente tarifas de presentación de USCIS, Department of State/NVC, tribunales, biometría, exámenes médicos, traducciones, apostillas, mensajería, copias certificadas, obtención de récords u otros costos de terceros, salvo que el acuerdo, recibo o factura indique expresamente que están incluidos.</p>
    </div>

    <h2>6. Pagos, trabajo realizado y cancelación</h2>
    <div class="section">
      <p>Los pagos realizados se aplicarán al trabajo administrativo efectivamente contratado y realizado. Si el cliente decide detener el servicio, AGR Solutions LLC podrá preparar un resumen del trabajo completado y de los pagos aplicados. Cualquier devolución, crédito o saldo pendiente se determinará conforme al trabajo efectivamente realizado, los costos ya incurridos y cualquier condición específica escrita en este acuerdo o factura.</p>
    </div>

    <h2>7. No garantía de resultado ni de tiempo</h2>
    <div class="section">
      <p>AGR Solutions LLC no controla las decisiones, los tiempos de procesamiento, las solicitudes adicionales, entrevistas, demoras, rechazos o aprobaciones de ninguna agencia gubernamental. Por esta razón, ningún pago realizado a AGR Solutions LLC garantiza una aprobación, beneficio migratorio, fecha de decisión o resultado específico.</p>
      <p>Sin embargo, AGR Solutions LLC se compromete a realizar los servicios administrativos y de preparación documental contratados con responsabilidad, diligencia, organización y atención a los detalles, utilizando de buena fe los medios razonablemente disponibles dentro del alcance del servicio para presentar un trabajo completo, ordenado y profesional con base en la información y documentación proporcionadas por el cliente.</p>
    </div>

    <h2>8. Comunicaciones y notificaciones</h2>
    <div class="section">
      <p>El cliente autoriza comunicaciones administrativas por teléfono, mensaje de texto, WhatsApp y correo electrónico utilizando la información de contacto proporcionada. El cliente es responsable de informar cualquier cambio de contacto y de revisar oportunamente las notificaciones oficiales recibidas de las agencias gubernamentales.</p>
    </div>

    <h2>9. Documentos, revisión y autorización del cliente</h2>
    <div class="section">
      <p>Antes de firmar o presentar cualquier documento, el cliente tendrá la oportunidad y responsabilidad de revisar su contenido. La firma o autorización del cliente confirma que la información fue revisada y que, según su conocimiento, es verdadera y correcta. AGR Solutions LLC no firmará declaraciones, solicitudes o peticiones gubernamentales en nombre del cliente cuando la firma corresponda personalmente al solicitante o peticionario.</p>
    </div>

    <h2>10. Firma electrónica y copias</h2>
    <div class="section">
      <p>El cliente acepta que este acuerdo pueda ser presentado, aceptado y firmado mediante medios electrónicos. Una firma electrónica adoptada voluntariamente por las partes podrá utilizarse para evidenciar su aceptación del acuerdo. Las partes podrán conservar copias electrónicas del documento firmado.</p>
    </div>

    <h2>11. Acuerdo completo</h2>
    <div class="section">
      <p>Este documento, junto con cualquier alcance, factura, recibo o anexo expresamente incorporado al caso, refleja el acuerdo de servicios entre el cliente y AGR Solutions LLC. Cualquier cambio material deberá quedar documentado por escrito.</p>
      ${extraTerms?'<div class="notice"><strong>Notas adicionales del caso:</strong><br>'+esc(extraTerms)+'</div>':''}
    </div>

    <h2>12. Reconocimiento del cliente</h2>
    <div class="section">
      <p>Al firmar, el cliente reconoce que ha leído este acuerdo, tuvo oportunidad de hacer preguntas sobre los servicios administrativos contratados, entiende el alcance y las limitaciones descritas y acepta los honorarios y condiciones indicados.</p>
    </div>

    <div class="sign-page">
      <div class="sign-title">
        <h2>Aceptación y firmas</h2>
        <p>Confirmación final del Acuerdo General de Servicios de Preparación Documental Migratoria</p>
      </div>

      <div class="acceptance">
        Al firmar electrónicamente, el cliente y AGR Solutions LLC confirman su aceptación de este acuerdo y reconocen que la firma electrónica será utilizada como evidencia de su consentimiento. Cada firmante recibirá y podrá conservar una copia del documento completado.
      </div>

      <div class="sign">
        <div class="signature-card">
          <small class="sign-role">Cliente</small>
          <div class="signature-slot client-signature-slot"></div>
          <div class="line">Firma del cliente
            <small>Nombre: ${esc(client?.name||'________________')}</small>
            <small>Firma electrónica mediante Foxit eSign</small>
            <small>Fecha de firma: ${c.status==='Firmado'?esc(c.signedDate||'Registrada por Foxit'):'Se completa al firmar'}</small>
          </div>
        </div>
        <div class="signature-card">
          <small class="sign-role">AGR Solutions LLC</small>
          <div class="signature-slot agr-signature-slot">
            ${data.esignSettings?.agrSignatureDataUrl
              ? '<img class="agr-signature-img" width="150" height="46" src="'+data.esignSettings.agrSignatureDataUrl+'" alt="Firma autorizada de AGR">'
              : ''}
          </div>
          <div class="line">Firma autorizada de AGR
            <small>Representante: ${esc(data.esignSettings?.agrSignerName||'Ariana G Reinoso')}</small>
            <small>Firma predeterminada de AGR Solutions LLC</small>
            <small>Fecha del acuerdo: ${esc(c.date||'Se asignará al enviar')}</small>
          </div>
        </div>
      </div>
    </div>
  </div></body></html>`;
}

function openCaseContractDraft(k,c){
  const w=window.open('','_blank');
  if(!w){alert('Permite ventanas emergentes para abrir el contrato.');return;}
  try{w.opener=null;}catch(_){}
  w.document.open();
  w.document.write(caseContractDraftHTML(k,c));
  w.document.close();
}

function renderCaseWorkspace(k){
  const tabs=$('#caseWorkspaceTabs'); if(!tabs) return;
  tabs.hidden=false;
  $$('.case-tab').forEach(b=>b.onclick=()=>{setCaseTab(b.dataset.caseTab); if(b.dataset.caseTab==='documents')renderCaseDocuments(k); if(b.dataset.caseTab==='payments')renderCasePayments(k); if(b.dataset.caseTab==='contract')renderCaseContract(k); if(b.dataset.caseTab==='history')renderCaseHistory(k); if(b.dataset.caseTab==='notes')renderCaseNotes(k); if(b.dataset.caseTab==='communications'){refreshClientNotification();renderCommunicationHistory(k);}});
  renderCaseSetupCard(k); renderCaseSummarySnapshot(k); renderCaseDocuments(k); renderCasePayments(k); renderCaseContract(k); renderCaseHistory(k); renderCaseNotes(k); renderCommunicationHistory(k); setCaseTab('summary');
  const wa=$('.notify-whatsapp'), mail=$('.notify-email');
  if(wa) wa.onclick=()=>{data.communications.unshift({id:Date.now(),caseId:k.id,channel:'WhatsApp',action:'Borrador abierto',at:new Date().toISOString()});save();logCaseEvent(k.id,'Borrador de WhatsApp abierto','communication');renderCommunicationHistory(k);};
  if(mail) mail.onclick=()=>{data.communications.unshift({id:Date.now(),caseId:k.id,channel:'Correo',action:'Borrador abierto',at:new Date().toISOString()});save();logCaseEvent(k.id,'Borrador de correo abierto','communication');renderCommunicationHistory(k);};
}
function deleteCaseFromCRM(caseId){
  const id=Number(caseId);
  const k=caseById(id);
  if(!k) return false;
  const client=clientName(k.clientId);
  const ok=window.confirm(
    '¿Eliminar este caso?\n\n'+client+' — '+(k.service||'Caso')+
    '\n\nSe eliminarán del CRM sus pagos, requisitos, notas, historial, comunicaciones, contrato y tareas vinculadas. Esta acción no elimina documentos o transacciones que ya existan fuera del CRM (por ejemplo, Foxit o Stripe).'
  );
  if(!ok) return false;

  data.cases=data.cases.filter(x=>Number(x.id)!==id);
  data.payments=data.payments.filter(x=>Number(x.caseId)!==id);
  data.notes=data.notes.filter(x=>Number(x.caseId)!==id);
  data.history=data.history.filter(x=>Number(x.caseId)!==id);
  data.communications=data.communications.filter(x=>Number(x.caseId)!==id);
  data.tasks=data.tasks.filter(x=>Number(x.caseId)!==id);
  if(data.documents && typeof data.documents==='object') delete data.documents[String(id)];
  if(data.caseContracts && typeof data.caseContracts==='object') delete data.caseContracts[String(id)];
  save();
  render();
  return true;
}

function openModal(kind,values={}){
  mode=kind;
  editingCaseId=kind==='case-edit'?values.id:null;
  editingPaymentId=null;
  editingServiceId=kind==='service-edit'?values.id:null;
  const actualKind=kind==='case-edit'?'caseEdit':(kind==='service-edit'?'service':kind);
  const titles={client:'Nuevo cliente',case:'Nuevo caso / trámite',caseEdit:'Seguimiento del caso',service:'Nuevo servicio',payment:'Agregar pago al caso',appointment:'Nueva cita',task:'Nueva tarea',company:'Nueva empresa'};
  modalTitle.textContent=kind==='case-edit'?'Editar caso / trámite':(kind==='service-edit'?'Editar servicio':titles[actualKind]);
  fields.innerHTML=templates[actualKind]().map(field=>fieldHTML(field,values)).join('');
  const workspaceTabs=$('#caseWorkspaceTabs');
  if(workspaceTabs) workspaceTabs.hidden=kind!=='case-edit';
  const modalActions=form.querySelector('.modal-actions');
  modalActions?.querySelector('#deleteCaseButton')?.remove();
  if(kind==='case-edit' && modalActions){
    const del=document.createElement('button');
    del.type='button';
    del.id='deleteCaseButton';
    del.className='danger';
    del.textContent='Eliminar caso';
    del.onclick=()=>{
      if(deleteCaseFromCRM(values.id)){
        dialog.close();
        editingCaseId=null;
      }
    };
    modalActions.insertBefore(del,modalActions.firstElementChild);
  }
  if(kind!=='case-edit') {
    setCaseTab('summary');
  }
  if(actualKind==='case'){
    const totalPriceInput=fields.querySelector('[name="serviceTotal"]');
    const cardPriceInput=fields.querySelector('[name="cardPrice"]');
    if(cardPriceInput && totalPriceInput){
      totalPriceInput.insertAdjacentHTML('afterend','<div class="price-field-summary" id="cashPriceSummary"><span>Cash / Zelle</span><strong>$0.00</strong></div>');
      cardPriceInput.insertAdjacentHTML('afterend','<div class="price-field-summary" id="cardPriceSummary"><span>Tarjeta / Stripe</span><strong>$0.00</strong></div>');
      const refreshPricingPreview=()=>{
        const standard=Math.max(0,Number(totalPriceInput?.value||0));
        const card=Math.max(0,Number(cardPriceInput?.value||standard));
        const cashBox=fields.querySelector('#cashPriceSummary');
        const cardBox=fields.querySelector('#cardPriceSummary');
        if(cashBox) cashBox.innerHTML='<span>Cash / Zelle</span><strong>'+money(standard)+'</strong>';
        if(cardBox) cardBox.innerHTML='<span>Tarjeta / Stripe</span><strong>'+money(card)+'</strong>';
      };
      [totalPriceInput,cardPriceInput].forEach(el=>el?.addEventListener('input',refreshPricingPreview));
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

  if(kind==='client'){
    const folderInput=fields.querySelector('[name="folderNumber"]');
    const nameInput=fields.querySelector('[name="name"]');
    if(folderInput){
      folderInput.readOnly=true;
      folderInput.placeholder='Se genera según la letra del nombre';
    }
    const refreshFolderNumber=()=>{
      if(!folderInput||!nameInput) return;
      const name=nameInput.value.trim();
      folderInput.value=name?nextFolderNumberForName(name):'';
    };
    nameInput?.addEventListener('input',refreshFolderNumber);
    refreshFolderNumber();
  }
  if(kind==='company'){
    const folderInput=fields.querySelector('[name="folderNumber"]');
    const nameInput=fields.querySelector('[name="name"]');
    if(folderInput){
      folderInput.readOnly=true;
      folderInput.placeholder='Se genera según la letra del nombre';
    }
    const refreshCompanyFolder=()=>{
      if(!folderInput||!nameInput) return;
      const name=nameInput.value.trim();
      folderInput.value=name?nextCompanyFolderNumberForName(name):'';
    };
    nameInput?.addEventListener('input',refreshCompanyFolder);
    refreshCompanyFolder();
  }
  dialog.showModal();
  if(kind==='case-edit') renderCaseWorkspace(values);
  if(actualKind==='payment'){
    const caseSelect=form.querySelector('[name="caseId"]');
    const amountInput=form.querySelector('[name="amount"]');
    const methodSelect=form.querySelector('[name="method"]');
    if(methodSelect){
      const methodLabel=methodSelect.closest('label');
      methodLabel?.insertAdjacentHTML('afterend','<div class="payment-discount-helper payment-helper-row" id="paymentDiscountHelper" hidden></div>');
      const refreshPaymentDiscountHelper=()=>{
        const k=caseById(Number(caseSelect?.value||0));
        const box=form.querySelector('#paymentDiscountHelper');
        if(!box || !k){ if(box){box.innerHTML='';box.hidden=true;} return; }
        const isCash=methodSelect.value==='Cash';
        const isZelle=methodSelect.value==='Zelle';
        const discount=isCash?caseCashDiscount(k):(isZelle?caseZelleDiscount(k):0);
        const payoff=isCash?caseCashPayoff(k):(isZelle?caseZellePayoff(k):caseBalanceForMethod(k,methodSelect.value));
        if((isCash||isZelle) && discount>0){
          box.hidden=false;
          box.innerHTML='<span>Liquidación '+methodSelect.value+' con precio especial:</span><strong>'+money(payoff)+'</strong><button type="button" class="secondary" id="useCashPayoff">Usar este monto</button>';
          const btn=box.querySelector('#useCashPayoff');
          if(btn) btn.onclick=()=>{ if(amountInput) amountInput.value=payoff.toFixed(2); };
        }else if(discount>0){
          box.hidden=false;
          box.innerHTML='<small>Este caso tiene precios especiales para Cash/Zelle.</small>';
        }else{
          box.innerHTML='';
          box.hidden=true;
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
    ['clientId','service','status','deadline','receiptNumber','aNumber','serviceTotal','cardPrice','initialPayment','stripePaymentLink'].forEach(name=>{
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


function accountInvoiceNumber(clientId){
  const year=new Date().getFullYear();
  const existing=data.clientAccountInvoices.filter(x=>Number(x.clientId)===Number(clientId)&&String(x.number||'').startsWith('AGR-ACCT-'+year+'-'));
  return 'AGR-ACCT-'+year+'-'+String(existing.length+1).padStart(4,'0');
}
function buildAccountInvoiceHTML(client,charges,payments,invoiceNo){
  const grouped=groupAccountCharges(charges);
  const chargesTotal=charges.reduce((s,x)=>s+accountChargeTotal(x),0);
  const paymentsTotal=payments.reduce((s,x)=>s+Number(x.amount||0),0);
  const balance=Math.max(chargesTotal-paymentsTotal,0);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${esc(invoiceNo)}</title><style>
  body{font-family:Arial,Helvetica,sans-serif;color:#10264a;margin:0}.sheet{max-width:850px;margin:auto;padding:48px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #d9b45b;padding-bottom:18px}.brand h1{margin:0}.muted{color:#6b768a}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}th{font-size:12px;text-transform:uppercase;color:#6b768a}.totals{max-width:360px;margin-left:auto;margin-top:24px}.totals div{display:flex;justify-content:space-between;padding:8px 0}.grand{border-top:2px solid #10264a;font-weight:700;font-size:18px}.footer{margin-top:38px;border-top:1px solid #e5e7eb;padding-top:14px;color:#6b768a;font-size:12px}</style></head><body><div class="sheet">
  <div class="top"><div class="brand"><h1>AGR Solutions LLC</h1><div class="muted">294 Tyler Street, East Haven, CT 06512<br>203-824-0351 · agrsolutionsllc.com</div></div><div><h2>FACTURA</h2><strong>${esc(invoiceNo)}</strong><div>${new Date().toLocaleDateString('es-US')}</div></div></div>
  <h3 style="margin-top:28px">${esc(client?.name||'Cliente')}</h3>
  <div class="muted">${client?.email?esc(client.email):''}${client?.phone?' · '+esc(client.phone):''}</div>
  <table><thead><tr><th>Concepto</th><th>Periodo</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead><tbody>
  ${grouped.map(g=>`<tr><td>${esc(g.concept)}</td><td>${esc(g.periods.join(', '))}</td><td>${g.quantity}</td><td>${money(g.unitPrice)}</td><td><strong>${money(g.total)}</strong></td></tr>`).join('')}
  </tbody></table>
  <div class="totals"><div><span>Cargos</span><strong>${money(chargesTotal)}</strong></div><div><span>Pagos aplicados</span><strong>${money(paymentsTotal)}</strong></div><div class="grand"><span>Saldo pendiente</span><strong>${money(balance)}</strong></div></div>
  <div class="footer">Gracias por confiar en AGR Solutions LLC.</div>
  </div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script></body></html>`;
}
function openAccountInvoice(client,charges,payments,invoiceNo){
  const w=window.open('','_blank'); if(!w){alert('Permite ventanas emergentes para abrir la factura.');return;}
  try{w.opener=null}catch(_){}
  w.document.open(); w.document.write(buildAccountInvoiceHTML(client,charges,payments,invoiceNo)); w.document.close();
}
function openClientAccount(clientId){
  const client=clientById(clientId); if(!client) return;
  const dlg=$('#clientAccountDialog'), body=$('#clientAccountBody'), title=$('#clientAccountTitle');
  if(!dlg||!body) return;
  title.textContent=client.name+' · Cuenta';
  const charges=accountChargesForClient(clientId).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const payments=accountPaymentsForClient(clientId).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const pending=charges.filter(x=>!x.invoiceId);
  body.innerHTML=`
    <div class="account-summary-grid">
      <div><span>Cargos acumulados</span><strong>${money(accountChargesTotal(clientId))}</strong></div>
      <div><span>Pagos recibidos</span><strong>${money(accountPaymentsTotal(clientId))}</strong></div>
      <div><span>Saldo pendiente</span><strong>${money(accountBalance(clientId))}</strong></div>
      <div><span>Sin facturar</span><strong>${money(pending.reduce((s,x)=>s+accountChargeTotal(x),0))}</strong></div>
    </div>
    <div class="account-actions-bar">
      <button type="button" class="primary" id="addAccountCharge">+ Agregar cargo</button>
      <button type="button" class="secondary" id="addAccountPayment">+ Registrar pago</button>
      <button type="button" class="secondary" id="generateAccountInvoice" ${pending.length?'':'disabled'}>Generar factura global</button>
    </div>
    <p class="account-global-help">Usa esta cuenta para acumular varios servicios del mismo cliente. Nada se factura hasta que presiones <strong>Generar factura global</strong>.</p>
    <section class="account-entry-box" id="accountEntryBox" hidden></section>
    <div class="account-ledger-grid">
      <section><h3>Cargos / servicios</h3><div class="workspace-table"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Periodo</th><th>Cant.</th><th>Unitario</th><th>Total</th><th>Estado</th></tr></thead><tbody>
      ${charges.length?charges.map(x=>`<tr><td>${esc(x.date||'—')}</td><td>${esc(x.concept||'—')}</td><td>${esc(normalizePeriodLabel(x.period)||'—')}</td><td>${Number(x.quantity||1)}</td><td>${money(x.unitPrice)}</td><td><strong>${money(accountChargeTotal(x))}</strong></td><td>${x.invoiceId?'Facturado':'Pendiente'}</td></tr>`).join(''):'<tr><td colspan="7">No hay cargos registrados.</td></tr>'}
      </tbody></table></div></section>
      <section><h3>Pagos recibidos</h3><div class="workspace-table"><table><thead><tr><th>Fecha</th><th>Método</th><th>Monto</th><th>Nota</th></tr></thead><tbody>
      ${payments.length?payments.map(x=>`<tr><td>${esc(x.date||'—')}</td><td>${esc(x.method||'—')}</td><td><strong>${money(x.amount)}</strong></td><td>${esc(x.note||'—')}</td></tr>`).join(''):'<tr><td colspan="4">No hay pagos registrados.</td></tr>'}
      </tbody></table></div></section>
    </div>
    ${data.clientAccountInvoices.filter(x=>Number(x.clientId)===Number(clientId)).length?'<section class="account-invoices"><h3>Facturas generadas</h3>'+data.clientAccountInvoices.filter(x=>Number(x.clientId)===Number(clientId)).map(i=>'<div class="account-invoice-row"><strong>'+esc(i.number)+'</strong><span>'+esc(i.date)+'</span><span>'+money(i.total)+'</span></div>').join('')+'</section>':''}
  `;
  const entry=$('#accountEntryBox');
  $('#addAccountCharge').onclick=()=>{
    entry.hidden=false;
    entry.innerHTML=`<h3>Agregar servicio a la factura global</h3><div class="account-entry-grid">
      <label>Fecha<input id="acctChargeDate" type="date" value="${todayISO()}"></label>
      <label class="full">Servicio
        <select id="acctServiceSelect">
          <option value="">Selecciona un servicio</option>
          ${data.services.filter(s=>s.active!==false).map(s=>`<option value="${esc(s.name)}" data-price="${Number(s.price||0)}">${esc(s.name)}${Number(s.price||0)>0?' · '+money(s.price):''}</option>`).join('')}
          <option value="__custom">Otro / personalizado</option>
        </select>
      </label>
      <label class="full" id="acctCustomConceptWrap" hidden>Concepto personalizado<input id="acctConcept" type="text" placeholder="Ej. Sales & Use Tax"></label>
      <label>Mes / periodo<input id="acctPeriod" type="text" placeholder="Ej. Enero"></label>
      <label>Cantidad<input id="acctQty" type="number" min="1" step="1" value="1"></label>
      <label>Precio unitario<input id="acctUnit" type="number" min="0" step="0.01" placeholder="20.00"></label>
      <label class="full">Nota<input id="acctNote" type="text" placeholder="Opcional"></label>
    </div><div class="account-entry-actions"><button class="primary" type="button" id="saveAcctCharge">Guardar y agregar otro</button><button class="ghost" type="button" id="finishAcctEntry">Terminar</button></div>`;
    const serviceSelect=$('#acctServiceSelect');
    const customWrap=$('#acctCustomConceptWrap');
    const conceptInput=$('#acctConcept');
    const unitInput=$('#acctUnit');
    serviceSelect.onchange=()=>{
      const opt=serviceSelect.options[serviceSelect.selectedIndex];
      const custom=serviceSelect.value==='__custom';
      customWrap.hidden=!custom;
      if(!custom && serviceSelect.value){
        if(conceptInput) conceptInput.value=serviceSelect.value;
        const suggested=Number(opt?.dataset?.price||0);
        if(suggested>0) unitInput.value=suggested.toFixed(2);
      }else if(custom && conceptInput){
        conceptInput.value='';
        conceptInput.focus();
      }
    };
    $('#finishAcctEntry').onclick=()=>{entry.hidden=true;entry.innerHTML='';};
    $('#saveAcctCharge').onclick=()=>{
      const selected=$('#acctServiceSelect').value;
      const concept=(selected==='__custom'?$('#acctConcept').value.trim():selected);
      const unitPrice=Number($('#acctUnit').value||0);
      const quantity=Math.max(1,Number($('#acctQty').value||1));
      if(!concept||unitPrice<=0){alert('Selecciona un servicio e ingresa el precio unitario.');return;}
      data.clientAccountCharges.push({id:Date.now(),clientId,date:$('#acctChargeDate').value||todayISO(),concept,period:$('#acctPeriod').value.trim(),quantity,unitPrice,note:$('#acctNote').value.trim(),invoiceId:null});
      save();
      renderClients($('#clientSearch')?.value||'');
      // Keep this screen open so several services can be added to one global invoice.
      $('#acctPeriod').value='';
      $('#acctQty').value='1';
      $('#acctNote').value='';
      $('#acctServiceSelect').value='';
      $('#acctUnit').value='';
      $('#acctCustomConceptWrap').hidden=true;
      $('#acctConcept').value='';
      const pendingCount=accountChargesForClient(clientId).filter(x=>!x.invoiceId).length;
      const flash=document.createElement('div');
      flash.className='account-save-flash';
      flash.textContent='✓ Cargo guardado. Pendientes para la factura global: '+pendingCount;
      entry.prepend(flash);
      setTimeout(()=>flash.remove(),2200);
    };
  };
  $('#addAccountPayment').onclick=()=>{
    entry.hidden=false;
    entry.innerHTML=`<h3>Registrar pago</h3><div class="account-entry-grid">
      <label>Fecha<input id="acctPayDate" type="date" value="${todayISO()}"></label>
      <label>Método<select id="acctPayMethod"><option>Cash</option><option>Zelle</option><option>Credit Card</option><option>Debit Card</option><option>Check</option><option>ACH / Bank Transfer</option><option>Other</option></select></label>
      <label>Monto<input id="acctPayAmount" type="number" min="0.01" step="0.01"></label>
      <label class="full">Nota<input id="acctPayNote" type="text" placeholder="Referencia / nota"></label>
    </div><div class="account-entry-actions"><button class="primary" type="button" id="saveAcctPayment">Guardar pago</button><button class="ghost" type="button" id="cancelAcctEntry">Cancelar</button></div>`;
    $('#cancelAcctEntry').onclick=()=>{entry.hidden=true;entry.innerHTML='';};
    $('#saveAcctPayment').onclick=()=>{
      const amount=Number($('#acctPayAmount').value||0); if(amount<=0){alert('Ingresa un monto válido.');return;}
      data.clientAccountPayments.push({id:Date.now(),clientId,date:$('#acctPayDate').value||todayISO(),method:$('#acctPayMethod').value,amount,note:$('#acctPayNote').value.trim()});
      save(); openClientAccount(clientId); renderClients($('#clientSearch')?.value||'');
    };
  };
  $('#generateAccountInvoice').onclick=()=>{
    const pendingNow=accountChargesForClient(clientId).filter(x=>!x.invoiceId);
    if(!pendingNow.length) return;
    const invoiceNo=accountInvoiceNumber(clientId);
    const total=pendingNow.reduce((s,x)=>s+accountChargeTotal(x),0);
    const invoiceId=Date.now();
    pendingNow.forEach(x=>x.invoiceId=invoiceId);
    data.clientAccountInvoices.push({id:invoiceId,clientId,number:invoiceNo,date:todayISO(),chargeIds:pendingNow.map(x=>x.id),total});
    save();
    openAccountInvoice(client,pendingNow,accountPaymentsForClient(clientId),invoiceNo);
    openClientAccount(clientId);
  };
  dlg.showModal();
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
    if(openBtn.dataset.open==='client-company') openModal('company');
    else openModal(openBtn.dataset.open);
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
  let createdImmigrationCase=null;

  if(mode==='client'){
    const isCompany=f.isCompany==='true';
    data.clients.push({
      id,
      folderNumber:isCompany?'':nextFolderNumberForName(f.name),
      name:f.name,
      phone:f.phone,
      email:f.email,
      isCompany
    });
  }
  if(mode==='company') data.clients.push({id,folderNumber:nextCompanyFolderNumberForName(f.name),name:f.name,phone:f.phone,email:f.email,isCompany:true});

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
      cashPrice:Number(f.serviceTotal||0),
      zellePrice:Number(f.serviceTotal||0),
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
    if(isImmigrationCase(newCase)) createdImmigrationCase=newCase;
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
      const amount=Number(f.amount||0);
      const method=f.method||'';
      const balance=caseBalanceForMethod(k,method);
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
  if(createdImmigrationCase){
    openModal('case-edit',createdImmigrationCase);
    setCaseTab('contract');
    renderCaseContract(createdImmigrationCase);
  }
});

save();
render();
setTimeout(()=>maybeRunAutomaticBackup(),1500);
setInterval(()=>maybeRunAutomaticBackup(),60*60*1000);

const cashbookClientSelect=$('#cashbookClient');
// La lista se carga al renderizar Caja. No reconstruir el select al hacer clic,
// porque eso cierra el desplegable nativo antes de que Chrome pueda mostrarlo.
const addCashbookItem=$('#addCashbookItem');
if(addCashbookItem){
  addCashbookItem.onclick=()=>{
    const wrap=$('#cashbookItems');
    if(!wrap) return;
    wrap.insertAdjacentHTML('beforeend',cashbookItemRowHTML());
    bindCashbookItems();
    refreshCashbookItems();
  };
}
const cashbookForm=$('#cashbookForm');
if(cashbookForm){
  cashbookForm.addEventListener('submit',e=>{
    e.preventDefault();
    const items=getCashbookItems();
    const amount=items.reduce((s,x)=>s+x.quantity*x.unitPrice,0);
    if(!items.length || amount<=0){
      alert('Agrega al menos un trámite con cantidad y valor.');
      return;
    }
    data.cashbook.push({
      id:Date.now(),
      date:$('#cashbookDate')?.value||todayISO(),
      clientId:$('#cashbookClient')?.value?Number($('#cashbookClient').value):null,
      concept:items.length===1?items[0].service:(items.length+' trámites / servicios'),
      items,
      category:$('#cashbookCategory')?.value||'Otros servicios',
      method:$('#cashbookMethod')?.value||'Cash',
      amount,
      note:$('#cashbookNote')?.value?.trim()||''
    });
    save();
    cashbookForm.reset();
    $('#cashbookDate').value=todayISO();
    const wrap=$('#cashbookItems');
    if(wrap) wrap.innerHTML=cashbookItemRowHTML();
    renderCashbook();
  });
}
document.querySelectorAll('[data-cash-tab]').forEach(btn=>btn.addEventListener('click',()=>switchCashTab(btn.dataset.cashTab)));

const addExpenseItem=$('#addExpenseItem');
if(addExpenseItem){
  addExpenseItem.onclick=()=>{
    const wrap=$('#expenseItems');
    if(!wrap) return;
    wrap.insertAdjacentHTML('beforeend',expenseItemRowHTML());
    bindExpenseItems();
    refreshExpenseItems();
  };
}
const expenseForm=$('#expenseForm');
if(expenseForm){
  expenseForm.addEventListener('submit',e=>{
    e.preventDefault();
    const items=getExpenseItems();
    const amount=items.reduce((s,x)=>s+x.quantity*x.unitPrice,0);
    if(!items.length || amount<=0){
      alert('Agrega al menos un gasto con cantidad y valor.');
      return;
    }
    data.expenses.push({
      id:Date.now(),
      date:$('#expenseDate')?.value||todayISO(),
      payee:$('#expensePayee')?.value?.trim()||'',
      concept:items.length===1?items[0].service:(items.length+' conceptos'),
      items,
      category:$('#expenseCategory')?.value||'Otros gastos',
      method:$('#expenseMethod')?.value||'Cash',
      amount,
      note:$('#expenseNote')?.value?.trim()||''
    });
    save();
    expenseForm.reset();
    $('#expenseDate').value=todayISO();
    const wrap=$('#expenseItems');
    if(wrap) wrap.innerHTML=expenseItemRowHTML();
    renderExpenses();
  });
}

const downloadFullCRMBtn=$('#downloadFullCRM');
if(downloadFullCRMBtn){
  downloadFullCRMBtn.addEventListener('click',async()=>{
    const status=$('#fullCRMDownloadStatus');
    downloadFullCRMBtn.disabled=true;
    const original=downloadFullCRMBtn.textContent;
    downloadFullCRMBtn.textContent='Preparando CRM...';
    if(status) status.textContent='';
    try{
      await downloadStandaloneCRM();
      if(status) status.textContent='✓ CRM completo descargado como archivo HTML.';
    }catch(err){
      if(status) status.textContent='No se pudo crear la copia completa: '+err.message;
    }finally{
      downloadFullCRMBtn.disabled=false;
      downloadFullCRMBtn.textContent=original;
    }
  });
}

const autoBackupEnabled=$('#autoBackupEnabled');
const autoBackupFrequency=$('#autoBackupFrequency');
const chooseAutoBackupFolder=$('#chooseAutoBackupFolder');
const runAutoBackupNow=$('#runAutoBackupNow');

autoBackupEnabled?.addEventListener('change',()=>{
  setAutoBackupSettings({enabled:autoBackupEnabled.checked});
  renderAutoBackupSettings();
});
autoBackupFrequency?.addEventListener('change',()=>{
  setAutoBackupSettings({frequencyDays:Number(autoBackupFrequency.value||7)});
  renderAutoBackupSettings();
});
chooseAutoBackupFolder?.addEventListener('click',async()=>{
  const status=$('#autoBackupStatus');
  if(!window.showDirectoryPicker){
    if(status) status.textContent='Este navegador no permite elegir una carpeta directamente. Usa Chrome o Edge actualizado.';
    return;
  }
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    if(!(await ensureDirectoryPermission(handle,true))) throw new Error('No se concedió permiso para escribir en la carpeta.');
    await saveAutoBackupHandle(handle);
    setAutoBackupSettings({folderName:handle.name});
    if(status) status.textContent='✓ Carpeta configurada correctamente.';
    await renderAutoBackupSettings();
  }catch(err){
    if(err?.name!=='AbortError' && status) status.textContent='No se pudo configurar la carpeta: '+err.message;
  }
});
runAutoBackupNow?.addEventListener('click',async()=>{
  const status=$('#autoBackupStatus');
  try{
    const handle=await getAutoBackupHandle();
    if(!handle){
      if(status) status.textContent='Primero elige una carpeta de backup.';
      return;
    }
    if(!(await ensureDirectoryPermission(handle,true))){
      if(status) status.textContent='Necesitas autorizar nuevamente la carpeta.';
      return;
    }
    const name=await writeBackupToDirectory(handle);
    if(status) status.textContent='✓ Copia guardada: '+name;
    await renderAutoBackupSettings();
  }catch(err){
    if(status) status.textContent='No se pudo guardar la copia: '+err.message;
  }
});

const downloadBackupBtn=$('#downloadBackup');
if(downloadBackupBtn){
  downloadBackupBtn.addEventListener('click',()=>{
    const status=$('#backupDownloadStatus');
    try{
      const payload=downloadCRMBackup();
      if(status) status.textContent='✓ Backup creado '+new Date(payload.createdAt).toLocaleString('es-US')+'.';
    }catch(err){
      if(status) status.textContent='No se pudo crear el backup: '+err.message;
    }
  });
}

const restoreInput=$('#restoreBackupFile');
const chooseRestoreBtn=$('#chooseRestoreBackup');
const confirmRestoreBtn=$('#confirmRestoreBackup');
let pendingRestoreData=null;
if(chooseRestoreBtn && restoreInput){
  chooseRestoreBtn.addEventListener('click',()=>restoreInput.click());
  restoreInput.addEventListener('change',async()=>{
    const status=$('#backupRestoreStatus');
    const preview=$('#restoreBackupPreview');
    pendingRestoreData=null;
    if(confirmRestoreBtn) confirmRestoreBtn.hidden=true;
    if(preview){preview.hidden=true;preview.innerHTML='';}
    const file=restoreInput.files?.[0];
    if(!file) return;
    try{
      const text=await file.text();
      const payload=JSON.parse(text);
      const restored=validateCRMBackupPayload(payload);
      pendingRestoreData=restored;
      const clients=restored.clients?.length||0;
      const companies=restored.clients?.filter(c=>c.isCompany).length||0;
      const cases=restored.cases?.length||0;
      const payments=restored.payments?.length||0;
      if(preview){
        preview.innerHTML='<strong>'+esc(file.name)+'</strong><span>'+clients+' clientes/empresas · '+cases+' casos · '+payments+' pagos</span>';
        preview.hidden=false;
      }
      if(confirmRestoreBtn) confirmRestoreBtn.hidden=false;
      if(status) status.textContent='Archivo válido. Revisa el resumen antes de restaurar.';
    }catch(err){
      if(status) status.textContent='No se puede usar este archivo: '+err.message;
    }
  });
}
if(confirmRestoreBtn){
  confirmRestoreBtn.addEventListener('click',()=>{
    const status=$('#backupRestoreStatus');
    if(!pendingRestoreData){
      if(status) status.textContent='Primero selecciona un backup válido.';
      return;
    }
    const ok=window.confirm('Esta acción reemplazará los datos actuales del CRM por los del backup seleccionado. Antes se descargará una copia del estado actual. ¿Deseas continuar?');
    if(!ok) return;
    try{
      downloadCRMBackup('AGR-CRM-PRE-RESTAURACION');
      localStorage.setItem(storeKey,JSON.stringify(pendingRestoreData));
      if(status) status.textContent='✓ Backup restaurado. Recargando CRM...';
      setTimeout(()=>location.reload(),350);
    }catch(err){
      if(status) status.textContent='No se pudo restaurar: '+err.message;
    }
  });
}

const globalSearch=$('#globalSearch');
if(globalSearch) globalSearch.addEventListener('input',e=>renderGlobalSearch(e.target.value));
document.addEventListener('click',e=>{
  const wrap=$('.global-search-wrap');
  if(wrap && !wrap.contains(e.target)){
    const box=$('#globalSearchResults'); if(box) box.hidden=true;
  }
});
const clientAccountDialog=$('#clientAccountDialog');
const closeClientAccount=$('#closeClientAccount');
if(closeClientAccount) closeClientAccount.onclick=()=>clientAccountDialog?.close();
