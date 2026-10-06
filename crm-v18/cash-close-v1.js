// AGR CRM · Daily cash closing + history
(function(){
  if(typeof data==='undefined' || !data) return;
  if(!Array.isArray(data.cashClosings)) data.cashClosings=[];

  function moneySafe(v){
    return typeof money==='function'?money(Number(v||0)):'$'+Number(v||0).toFixed(2);
  }
  function today(){
    return typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  }
  function totalsForDate(date){
    const income=(data.cashbook||[]).filter(x=>String(x.date||'')===date).reduce((s,x)=>s+Number(x.amount||0),0);
    const expense=(data.expenses||[]).filter(x=>String(x.date||'')===date).reduce((s,x)=>s+Number(x.amount||0),0);
    return {income,expense,net:income-expense};
  }
  function ensureUI(){
    const view=document.getElementById('view-cashbook');
    if(!view || document.getElementById('cashClosingPanel')) return;
    const panel=document.createElement('div');
    panel.id='cashClosingPanel';
    panel.className='panel';
    panel.innerHTML=`
      <div class="panel-head">
        <div><p class="eyebrow">CIERRE DIARIO</p><h2>Cierre de caja</h2><p class="section-subtext">Guarda una foto del día sin borrar ni bloquear movimientos.</p></div>
        <button type="button" class="primary" id="closeCashToday">Cerrar caja del día</button>
      </div>
      <div id="cashClosingToday" class="cashbook-summary"></div>
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Ingresos</th><th>Egresos</th><th>Neto</th><th>Efectivo contado</th><th>Diferencia</th><th>Cerrado</th></tr></thead><tbody id="cashClosingHistory"></tbody></table></div>`;
    view.appendChild(panel);
    document.getElementById('closeCashToday')?.addEventListener('click',closeToday);
    renderClosing();
  }
  function renderClosing(){
    const box=document.getElementById('cashClosingToday');
    const hist=document.getElementById('cashClosingHistory');
    if(!box||!hist) return;
    const t=totalsForDate(today());
    box.innerHTML=`<div><span>Ingresos hoy</span><strong>${moneySafe(t.income)}</strong></div><div><span>Egresos hoy</span><strong>${moneySafe(t.expense)}</strong></div><div><span>Neto del día</span><strong>${moneySafe(t.net)}</strong></div>`;
    const rows=[...(data.cashClosings||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
    hist.innerHTML=rows.length?rows.map(x=>`<tr><td>${x.date||'—'}</td><td>${moneySafe(x.income)}</td><td>${moneySafe(x.expense)}</td><td><strong>${moneySafe(x.net)}</strong></td><td>${x.countedCash===null||x.countedCash===undefined?'—':moneySafe(x.countedCash)}</td><td>${x.countedCash===null||x.countedCash===undefined?'—':moneySafe(Number(x.countedCash)-Number(x.net||0))}</td><td>${x.closedAt?new Date(x.closedAt).toLocaleString('es-US',{dateStyle:'short',timeStyle:'short'}):'—'}</td></tr>`).join(''):'<tr><td colspan="7">Aún no hay cierres de caja.</td></tr>';
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
