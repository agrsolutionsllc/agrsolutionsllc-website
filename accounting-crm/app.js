const storeKey = "agr-accounting-crm-v1";
const seed = {
  clients: [
    {id:1,business:"D&K Construction LLC",owner:"Cliente Demo",phone:"203-555-0101",filing:"Monthly",permit:"Active",active:true},
    {id:2,business:"Demo Home Improvement LLC",owner:"Cliente Demo 2",phone:"203-555-0102",filing:"Monthly",permit:"Active",active:true}
  ],
  jobs: [
    {id:101,clientId:1,date:"2026-10-01",serviceType:"painting",description:"Interior painting",propertyType:"owner",amount:2400,taxCollected:0,paymentMethod:"Check"},
    {id:102,clientId:1,date:"2026-10-02",serviceType:"carpentry",description:"Commercial carpentry repair",propertyType:"commercial",amount:3200,taxCollected:203.20,paymentMethod:"Zelle"}
  ],
  expenses: [
    {id:201,clientId:1,date:"2026-10-02",vendor:"Home Depot",category:"Materials",amount:487.30,ctTax:"yes"}
  ],
  returns: [
    {id:301,clientId:1,period:"2026-09",due:"2026-10-31",taxDue:0,status:"pending",confirmation:""}
  ]
};

let data = JSON.parse(localStorage.getItem(storeKey) || "null") || structuredClone(seed);
["clients","jobs","expenses","returns"].forEach(function(k){ if(!Array.isArray(data[k])) data[k]=[]; });

function save(){ localStorage.setItem(storeKey, JSON.stringify(data)); }
function $(s){ return document.querySelector(s); }
function $$(s){ return Array.from(document.querySelectorAll(s)); }
function money(n){ return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0); }
function currentMonth(){ return new Date().toISOString().slice(0,7); }
function monthOf(d){ return String(d||"").slice(0,7); }
function client(id){ return data.clients.find(function(c){ return c.id===Number(id); }); }
function clientName(id){ var c=client(id); return c?c.business:"Empresa"; }

function propertyLabel(v){
  return {owner:"Owner-occupied",rental:"Rental / income-producing",commercial:"Commercial",new:"New construction",exempt:"Exempt entity",unknown:"Unknown"}[v] || v;
}
function serviceLabel(v){
  return {painting:"Painting",roofing:"Roofing",siding:"Siding",paving:"Paving",wallpapering:"Wallpapering",carpentry:"Carpentry",plumbing:"Plumbing",electrical:"Electrical",flooring:"Flooring",remodeling:"Remodeling",landscaping:"Landscaping",other:"Other"}[v] || v;
}

function classify(j){
  var taxableAll=["painting","roofing","siding","paving","wallpapering","landscaping"];
  if(j.propertyType==="unknown" || j.serviceType==="other") return {code:"review",label:"Revisar"};
  if(j.propertyType==="exempt") return {code:"review",label:"Revisar exención"};
  if(j.propertyType==="new") return {code:"review",label:"Revisar construcción nueva"};
  if(j.propertyType==="commercial" || j.propertyType==="rental") return {code:"taxable",label:"Probable taxable"};
  if(j.propertyType==="owner" && taxableAll.indexOf(j.serviceType)>=0) return {code:"taxable",label:"Probable taxable"};
  if(j.propertyType==="owner") return {code:"nontaxable",label:"Probable non-taxable"};
  return {code:"review",label:"Revisar"};
}

function setView(view){
  $$(".view").forEach(function(v){ v.classList.toggle("active",v.id==="view-"+view); });
  $$(".nav").forEach(function(b){ b.classList.toggle("active",b.dataset.view===view); });
  var titles={dashboard:"Dashboard contable",clients:"Empresas",jobs:"Trabajos","sales-tax":"Sales & Use Tax",expenses:"Gastos",returns:"Declaraciones",portal:"Portal cliente"};
  $("#pageTitle").textContent=titles[view] || "AGR Accounting";
}
$$(".nav").forEach(function(b){ b.addEventListener("click",function(){ setView(b.dataset.view); }); });

function clientOptions(includeAll){
  var html=includeAll?'<option value="">Todas</option>':'<option value="">Selecciona</option>';
  data.clients.forEach(function(c){ html+='<option value="'+c.id+'">'+c.business+'</option>'; });
  return html;
}
function fillSelects(){
  $("#jobClientFilter").innerHTML=clientOptions(true);
  $("#taxClientFilter").innerHTML=clientOptions(true);
  $("#portalClient").innerHTML=clientOptions(false);
}

function selectedJobs(clientFilter,monthFilter){
  return data.jobs.filter(function(j){
    return (!clientFilter || j.clientId===Number(clientFilter)) && (!monthFilter || monthOf(j.date)===monthFilter);
  });
}

function renderDashboard(){
  var cm=currentMonth();
  var jobs=data.jobs.filter(function(j){ return monthOf(j.date)===cm; });
  $("#statClients").textContent=data.clients.filter(function(c){return c.active;}).length;
  $("#statGross").textContent=money(jobs.reduce(function(s,j){return s+Number(j.amount||0);},0));
  $("#statTaxable").textContent=money(jobs.filter(function(j){return classify(j).code==="taxable";}).reduce(function(s,j){return s+Number(j.amount||0);},0));
  $("#statReturns").textContent=data.returns.filter(function(r){return r.status!=="filed";}).length;
  $("#recentJobs").innerHTML=jobs.slice(-6).reverse().map(function(j){
    var c=classify(j);
    return '<tr><td><strong>'+clientName(j.clientId)+'</strong></td><td>'+serviceLabel(j.serviceType)+'</td><td>'+money(j.amount)+'</td><td><span class="badge '+c.code+'">'+c.label+'</span></td></tr>';
  }).join("") || '<tr><td colspan="4">Sin actividad este mes.</td></tr>';

  var review=jobs.filter(function(j){return classify(j).code==="review";}).length;
  var missing=jobs.filter(function(j){return classify(j).code==="taxable" && !Number(j.taxCollected||0);}).length;
  $("#alerts").innerHTML=
    '<div class="alert"><strong>'+(review?review+" trabajo(s) requieren revisión":"Sin casos amarillos")+'</strong><span>'+(review?"Clasificación ambigua o excepción posible.":"No hay trabajos ambiguos este mes.")+'</span></div>'+
    '<div class="alert"><strong>'+(missing?missing+" probable(s) taxable sin tax registrado":"Sin alertas obvias de tax")+'</strong><span>'+(missing?"Confirmar invoice y cobro antes de presentar.":"Validar todo antes del OS-114.")+'</span></div>';
}

function renderClients(q){
  q=(q||"").toLowerCase();
  $("#clientsTable").innerHTML=data.clients.filter(function(c){
    return [c.business,c.owner,c.phone].join(" ").toLowerCase().indexOf(q)>=0;
  }).map(function(c){
    return '<tr><td><strong>'+c.business+'</strong></td><td>'+c.owner+'</td><td>'+c.filing+'</td><td>'+c.permit+'</td><td><span class="badge '+(c.active?"ready":"pending")+'">'+(c.active?"Activo":"Inactivo")+'</span></td></tr>';
  }).join("");
}

function renderJobs(){
  var rows=selectedJobs($("#jobClientFilter").value,$("#jobMonthFilter").value);
  $("#jobsTable").innerHTML=rows.map(function(j){
    var c=classify(j);
    return '<tr><td>'+j.date+'</td><td><strong>'+clientName(j.clientId)+'</strong></td><td>'+serviceLabel(j.serviceType)+'</td><td>'+propertyLabel(j.propertyType)+'</td><td>'+money(j.amount)+'</td><td>'+money(j.taxCollected)+'</td><td><span class="badge '+c.code+'">'+c.label+'</span></td></tr>';
  }).join("") || '<tr><td colspan="7">Sin trabajos para este filtro.</td></tr>';
}

function renderTax(){
  var rows=selectedJobs($("#taxClientFilter").value,$("#taxMonthFilter").value);
  var taxable=rows.filter(function(j){return classify(j).code==="taxable";});
  var review=rows.filter(function(j){return classify(j).code==="review";});
  var noTax=taxable.filter(function(j){return !Number(j.taxCollected||0);}).length;
  $("#taxGross").textContent=money(rows.reduce(function(s,j){return s+Number(j.amount||0);},0));
  $("#taxTaxable").textContent=money(taxable.reduce(function(s,j){return s+Number(j.amount||0);},0));
  $("#taxCollected").textContent=money(rows.reduce(function(s,j){return s+Number(j.taxCollected||0);},0));
  $("#taxReviewCount").textContent=review.length;
  $("#taxTable").innerHTML=rows.map(function(j){
    var c=classify(j);
    return '<tr><td>'+j.date+'</td><td>'+serviceLabel(j.serviceType)+'</td><td>'+propertyLabel(j.propertyType)+'</td><td>'+money(j.amount)+'</td><td><span class="badge '+c.code+'">'+c.label+'</span></td></tr>';
  }).join("") || '<tr><td colspan="5">Sin actividad.</td></tr>';
  $("#taxChecklist").innerHTML=
    '<div class="check"><strong>'+(rows.length?"✓":"○")+' Trabajos del mes</strong><span>'+rows.length+' registrados.</span></div>'+
    '<div class="check"><strong>'+(review.length?"⚠":"✓")+' Casos amarillos</strong><span>'+review.length+' requieren revisión AGR.</span></div>'+
    '<div class="check"><strong>'+(noTax?"⚠":"✓")+' Tax cobrado</strong><span>'+noTax+' probable(s) taxable sin tax registrado.</span></div>'+
    '<div class="check"><strong>○ Gastos / Use Tax</strong><span>Revisar compras sin CT Sales Tax antes de presentar.</span></div>';
}

function renderExpenses(){
  $("#expensesTable").innerHTML=data.expenses.map(function(e){
    return '<tr><td>'+e.date+'</td><td><strong>'+clientName(e.clientId)+'</strong></td><td>'+e.vendor+'</td><td>'+e.category+'</td><td>'+money(e.amount)+'</td><td>'+(e.ctTax==="yes"?"Sí":"No / revisar")+'</td></tr>';
  }).join("") || '<tr><td colspan="6">Sin gastos.</td></tr>';
}

function renderReturns(){
  $("#returnsTable").innerHTML=data.returns.map(function(r){
    return '<tr><td><strong>'+clientName(r.clientId)+'</strong></td><td>'+r.period+'</td><td>'+r.due+'</td><td>'+money(r.taxDue)+'</td><td><span class="badge '+(r.status==="filed"?"ready":"pending")+'">'+(r.status==="filed"?"Filed":"Pending")+'</span></td><td>'+(r.confirmation||"—")+'</td></tr>';
  }).join("") || '<tr><td colspan="6">Sin declaraciones.</td></tr>';
}

function render(){
  fillSelects();
  if(!$("#jobMonthFilter").value) $("#jobMonthFilter").value=currentMonth();
  if(!$("#taxMonthFilter").value) $("#taxMonthFilter").value=currentMonth();
  renderDashboard(); renderClients(""); renderJobs(); renderTax(); renderExpenses(); renderReturns();
}

$("#clientSearch").addEventListener("input",function(e){ renderClients(e.target.value); });
$("#jobClientFilter").addEventListener("change",renderJobs);
$("#jobMonthFilter").addEventListener("change",renderJobs);
$("#taxClientFilter").addEventListener("change",renderTax);
$("#taxMonthFilter").addEventListener("change",renderTax);

var modal=$("#modal"), modalForm=$("#modalForm"), modalFields=$("#modalFields"), modalTitle=$("#modalTitle"), mode="";

function openModal(kind){
  mode=kind;
  var titles={client:"Nueva empresa",job:"Registrar trabajo",expense:"Registrar gasto",return:"Registrar declaración"};
  modalTitle.textContent=titles[kind];

  if(kind==="client"){
    modalFields.innerHTML='<label class="full">Nombre legal de la empresa<input name="business" required></label><label>Owner / contacto<input name="owner" required></label><label>Teléfono<input name="phone"></label><label>Filing frequency<select name="filing"><option>Monthly</option><option>Quarterly</option></select></label><label>Sales & Use Tax Permit<select name="permit"><option>Active</option><option>Pending</option><option>Unknown</option></select></label>';
  }
  if(kind==="job"){
    modalFields.innerHTML='<label>Empresa<select name="clientId" required>'+clientOptions(false)+'</select></label><label>Fecha<input name="date" type="date" required></label><label>Tipo de propiedad<select name="propertyType" required><option value="">Selecciona</option><option value="owner">Casa donde vive el dueño</option><option value="rental">Rental / income-producing</option><option value="commercial">Commercial</option><option value="new">New construction</option><option value="exempt">Exempt entity</option><option value="unknown">No sé</option></select></label><label>Tipo de trabajo<select name="serviceType" required><option value="">Selecciona</option><option value="painting">Painting</option><option value="roofing">Roofing</option><option value="siding">Siding</option><option value="paving">Paving</option><option value="wallpapering">Wallpapering</option><option value="carpentry">Carpentry</option><option value="plumbing">Plumbing</option><option value="electrical">Electrical</option><option value="flooring">Flooring</option><option value="remodeling">Remodeling</option><option value="landscaping">Landscaping</option><option value="other">Other</option></select></label><label class="full">Descripción<input name="description"></label><label>Total cobrado<input name="amount" type="number" min="0" step=".01" required></label><label>Sales Tax cobrado<input name="taxCollected" type="number" min="0" step=".01" value="0"></label><label>Método de pago<select name="paymentMethod"><option>Cash</option><option>Zelle</option><option>Check</option><option>Card</option><option>Other</option></select></label>';
  }
  if(kind==="expense"){
    modalFields.innerHTML='<label>Empresa<select name="clientId" required>'+clientOptions(false)+'</select></label><label>Fecha<input name="date" type="date" required></label><label>Proveedor<input name="vendor" required></label><label>Categoría<input name="category" value="Materials"></label><label>Total<input name="amount" type="number" min="0" step=".01" required></label><label>¿Pagó CT Sales Tax?<select name="ctTax"><option value="yes">Sí</option><option value="no">No</option><option value="unknown">No sé</option></select></label>';
  }
  if(kind==="return"){
    modalFields.innerHTML='<label>Empresa<select name="clientId" required>'+clientOptions(false)+'</select></label><label>Período<input name="period" type="month" required></label><label>Due date<input name="due" type="date"></label><label>Tax due<input name="taxDue" type="number" min="0" step=".01" value="0"></label><label>Estado<select name="status"><option value="pending">Pending</option><option value="filed">Filed</option></select></label><label>Confirmation #<input name="confirmation"></label>';
  }
  modal.showModal();
}
$$("[data-open]").forEach(function(b){ b.addEventListener("click",function(){openModal(b.dataset.open);}); });
$("#quickJob").addEventListener("click",function(){openModal("job");});

modalForm.addEventListener("submit",function(e){
  if(e.submitter && e.submitter.value==="cancel") return;
  e.preventDefault();
  var f=Object.fromEntries(new FormData(modalForm));
  var id=Date.now();
  if(mode==="client") data.clients.push({id:id,business:f.business,owner:f.owner,phone:f.phone,filing:f.filing,permit:f.permit,active:true});
  if(mode==="job") data.jobs.push({id:id,clientId:Number(f.clientId),date:f.date,propertyType:f.propertyType,serviceType:f.serviceType,description:f.description,amount:Number(f.amount||0),taxCollected:Number(f.taxCollected||0),paymentMethod:f.paymentMethod});
  if(mode==="expense") data.expenses.push({id:id,clientId:Number(f.clientId),date:f.date,vendor:f.vendor,category:f.category,amount:Number(f.amount||0),ctTax:f.ctTax});
  if(mode==="return") data.returns.push({id:id,clientId:Number(f.clientId),period:f.period,due:f.due,taxDue:Number(f.taxDue||0),status:f.status,confirmation:f.confirmation});
  save(); modal.close(); modalForm.reset(); render();
});

$("#portalForm").addEventListener("submit",function(e){
  e.preventDefault();
  var f=Object.fromEntries(new FormData(e.target));
  data.jobs.push({id:Date.now(),clientId:Number(f.clientId),date:f.date,propertyType:f.propertyType,serviceType:f.serviceType,description:"Portal client entry",amount:Number(f.amount||0),taxCollected:Number(f.taxCollected||0),paymentMethod:f.paymentMethod});
  save(); render(); e.target.reset();
  $("#portalSuccess").classList.remove("hidden");
  setTimeout(function(){ $("#portalSuccess").classList.add("hidden"); },3500);
});

render();