// AGR CRM · Safe company deletion helper
(function(){
  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-delete-client-id]');
    if(!btn) return;
    const id=Number(btn.dataset.deleteClientId);
    const client=typeof clientById==='function'?clientById(id):null;
    if(!client || !client.isCompany) return;

    const hasCases=Array.isArray(data?.cases) && data.cases.some(x=>Number(x.clientId)===id);
    if(hasCases) return;

    const linkedAccount=(Array.isArray(data?.clientAccountCharges)&&data.clientAccountCharges.some(x=>Number(x.clientId)===id)) ||
      (Array.isArray(data?.clientAccountPayments)&&data.clientAccountPayments.some(x=>Number(x.clientId)===id)) ||
      (Array.isArray(data?.clientAccountInvoices)&&data.clientAccountInvoices.some(x=>Number(x.clientId)===id));
    const linkedCash=(Array.isArray(data?.cashbook)&&data.cashbook.some(x=>Number(x.clientId)===id)) ||
      (Array.isArray(data?.expenses)&&data.expenses.some(x=>Number(x.clientId)===id));

    if(!linkedAccount && !linkedCash) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const balance=typeof accountBalance==='function'?Number(accountBalance(id)||0):0;
    const amount=typeof money==='function'?money(balance):'$'+balance.toFixed(2);
    const msg='Esta empresa no tiene casos.\n\n'+
      (balance>0?'Saldo pendiente registrado: '+amount+'.\n\n':'')+
      'Los movimientos históricos se conservarán, pero dejarán de estar vinculados a esta empresa.\n\n¿Continuar con la eliminación?';
    if(!window.confirm(msg)) return;

    (data.clientAccountCharges||[]).forEach(x=>{if(Number(x.clientId)===id) x.clientId=null;});
    (data.clientAccountPayments||[]).forEach(x=>{if(Number(x.clientId)===id) x.clientId=null;});
    (data.clientAccountInvoices||[]).forEach(x=>{if(Number(x.clientId)===id) x.clientId=null;});
    (data.cashbook||[]).forEach(x=>{if(Number(x.clientId)===id) x.clientId=null;});
    (data.expenses||[]).forEach(x=>{if(Number(x.clientId)===id) x.clientId=null;});

    if(typeof save==='function') save();
    if(typeof deleteClientRecord==='function') deleteClientRecord(id);
  },true);
})();

// Keep completed tasks in data/history, but hide them from the active task list.
(function(){
  try{
    renderTasks=function(){
      const box=$('#tasksList');
      if(!box) return;
      const rows=[...data.tasks]
        .filter(t=>!t.done)
        .sort((a,b)=>{
          const sa=taskState(a), sb=taskState(b);
          const order={overdue:0,today:1,normal:2,future:3,done:4};
          return (order[sa]-order[sb]) || (priorityRank(a.priority)-priorityRank(b.priority)) || String(a.date||'').localeCompare(String(b.date||''));
        });
      box.innerHTML=rows.length?rows.map(t=>{
        const k=t.caseId?caseById(t.caseId):null;
        return `<article class="task-card ${taskState(t)}">
          <button type="button" class="task-check" data-task-toggle="${t.id}" aria-label="Completar tarea"></button>
          <div class="task-body">
            <strong>${esc(t.title)}</strong>
            <span>${t.date?esc(t.date):'Sin fecha'} · ${esc(t.priority||'Media')}${k?' · '+esc(clientName(k.clientId))+' — '+esc(k.service):''}</span>
            ${t.note?`<small>${esc(t.note)}</small>`:''}
          </div>
        </article>`;
      }).join(''):'<p class="empty-state">No hay tareas pendientes.</p>';
      box.querySelectorAll('[data-task-toggle]').forEach(btn=>btn.onclick=()=>{
        const t=data.tasks.find(x=>x.id===Number(btn.dataset.taskToggle));
        if(!t) return;
        t.done=true;
        t.completedAt=new Date().toISOString();
        save();
        render();
      });
    };
    if(typeof render==='function') render();
  }catch(err){console.error('No se pudo actualizar la vista de tareas',err);}
})();

// Load manual delete controls for Caja histories.
(function(){
  if(document.querySelector('script[data-agr-cashbook-delete]')) return;
  const s=document.createElement('script');
  s.src='./cashbook-delete-v1.js?v=1';
  s.async=false;
  s.dataset.agrCashbookDelete='1';
  document.head.appendChild(s);
})();
