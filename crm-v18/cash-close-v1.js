// AGR CRM · Daily cash closing + collapsible filtered history
(function(){
  if(typeof data==='undefined' || !data) return;
  if(!Array.isArray(data.cashClosings)) data.cashClosings=[];

  function moneySafe(v){
    return typeof money==='function'?money(Number(v||0)):'$'+Number(v||0).toFixed(2);
  }
  function today(){
    return typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  }
  function monthBounds(baseDate=new Date()){
    const y=baseDate.getFullYear();
    const m=baseDate.getMonth();
    const start=new Date(y,m,1);
    const end=new Date(y,m+1,0);
    const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {start:fmt(start),end:fmt(end)};
  }
  function totalsForDate(date){
    const income=(data.cashbook||[]).filter(x=>String(x.date||'')===date).reduce((s,x)=>s+Number(x.amount||0),0);
    const expense=(data.expenses||[]).filter(x=>String(x.date||'')===date).reduce((s,x)=>s+Number(x.amount||0),0);
    return {income,expense,net:income-expense};
  }
  function ensureUI(){
    const view=document.getElementById('view-cashbook');
    if(!view || document.getElementById('cashClosingPanel')) return;
    const bounds=monthBounds();
    const panel=document.createElement('div');
    panel.id='cashClosingPanel';
    panel.className='panel';
    panel.innerHTML=`
      <div class="panel-head">
        <div><p class="eyebrow">CIERRE DIARIO</p><h2>Cierre de caja</h2><p class="section-subtext">Guarda una foto del día sin borrar ni bloquear movimientos.</p></div>
        <button type="button" class="primary" id="closeCashToday">Cerrar caja del día</button>
      </div>
      <div id="cashClosingToday" class="cashbook-summary"></div>
      <details id="cashClosingHistoryDetails" style="margin-top:20px;">
        <summary style="cursor:pointer;font-weight:700;font-size:1.05rem;">Historial de cierres</summary>
        <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:end;">
          <label>Desde<input type="date" id="cashClosingFrom" value="${bounds.start}"></label>
          <label>Hasta<input type="date" id="cashClosingTo" value="${bounds.end}"></label>
          <button type="button" class="secondary" id="filterCashClosings">Ver cierres</button>
        </div>
        <div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Fecha</th><th>Ingresos</th><th>Egresos</th><th>Neto</th><th>Efectivo contado</th><th>Diferencia</th><th>Cerrado</th></tr></thead><tbody id="cashClosingHistory"></tbody></table></div>
      </details>`;
    view.appendChild(panel);
    document.getElementById('closeCashToday')?.addEventListener('click',closeToday);
    document.getElementById('filterCashClosings')?.addEventListener('click',renderClosing);
    renderClosing();
  }
  function renderClosing(){
    const box=document.getElementById('cashClosingToday');
    const hist=document.getElementById('cashClosingHistory');
    if(!box||!hist) return;
    const t=totalsForDate(today());
    box.innerHTML=`<div><span>Ingresos hoy</span><strong>${moneySafe(t.income)}</strong></div><div><span>Egresos hoy</span><strong>${moneySafe(t.expense)}</strong></div><div><span>Neto del día</span><strong>${moneySafe(t.net)}</strong></div>`;
    const from=document.getElementById('cashClosingFrom')?.value||'';
    const to=document.getElementById('cashClosingTo')?.value||'';
    const rows=[...(data.cashClosings||[])]
      .filter(x=>(!from||String(x.date||'')>=from)&&(!to||String(x.date||'')<=to))
      .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
    hist.innerHTML=rows.length?rows.map(x=>`<tr><td>${x.date||'—'}</td><td>${moneySafe(x.income)}</td><td>${moneySafe(x.expense)}</td><td><strong>${moneySafe(x.net)}</strong></td><td>${x.countedCash===null||x.countedCash===undefined?'—':moneySafe(x.countedCash)}</td><td>${x.countedCash===null||x.countedCash===undefined?'—':moneySafe(Number(x.countedCash)-Number(x.net||0))}</td><td>${x.closedAt?new Date(x.closedAt).toLocaleString('es-US',{dateStyle:'short',timeStyle:'short'}):'—'}</td></tr>`).join(''):'<tr><td colspan="7">No hay cierres en ese rango de fechas.</td></tr>';
  }
  function closeToday(){
    const date=today();
    const t=totalsForDate(date);
    const existing=(data.cashClosings||[]).find(x=>x.date===date);
    const countedRaw=window.prompt('Efectivo contado al cierre (opcional).\n\nDéjalo vacío si solo quieres guardar el resumen del día.','');
    if(countedRaw===null) return;
    const counted=countedRaw.trim()===''?null:Number(countedRaw);
    if(counted!==null && !Number.isFinite(counted)){
      window.alert('Ingresa un monto válido o deja el campo vacío.');
      return;
    }
    const summary='Ingresos: '+moneySafe(t.income)+'\nEgresos: '+moneySafe(t.expense)+'\nNeto: '+moneySafe(t.net)+(counted===null?'':'\nEfectivo contado: '+moneySafe(counted)+'\nDiferencia: '+moneySafe(counted-t.net));
    const question=existing?'Ya existe un cierre para hoy. ¿Quieres actualizarlo con los movimientos actuales?\n\n'+summary:'¿Cerrar caja de hoy?\n\n'+summary;
    if(!window.confirm(question)) return;
    const record={id:existing?.id||Date.now(),date,income:t.income,expense:t.expense,net:t.net,countedCash:counted,closedAt:new Date().toISOString()};
    if(existing){ Object.assign(existing,record); }
    else data.cashClosings.push(record);
    if(typeof save==='function') save();
    renderClosing();
    if(typeof renderBackup==='function') renderBackup();
  }

  const originalRenderCashbook=typeof renderCashbook==='function'?renderCashbook:null;
  if(originalRenderCashbook){
    renderCashbook=function(){
      originalRenderCashbook();
      ensureUI();
      renderClosing();
    };
  }
  ensureUI();
})();
