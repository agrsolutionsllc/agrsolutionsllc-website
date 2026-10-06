// AGR CRM · Manual delete controls for Caja income/expense history
(function(){
  const trash='<span aria-hidden="true">🗑</span>';

  function incomeRows(){
    return [...(data.cashbook||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
  }
  function expenseRows(){
    return [...(data.expenses||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));
  }
  function addDeleteButtons(){
    const incomeTable=document.getElementById('cashbookTable');
    if(incomeTable){
      const records=incomeRows();
      [...incomeTable.querySelectorAll('tr')].forEach((tr,i)=>{
        if(!records[i] || tr.querySelector('[data-delete-cashbook]')) return;
        const td=document.createElement('td');
        td.innerHTML='<button type="button" class="cashbook-history-delete" data-delete-cashbook="'+Number(records[i].id)+'" title="Eliminar ingreso" aria-label="Eliminar ingreso">'+trash+'</button>';
        tr.appendChild(td);
      });
    }
    const expenseTable=document.getElementById('expenseTable');
    if(expenseTable){
      const records=expenseRows();
      [...expenseTable.querySelectorAll('tr')].forEach((tr,i)=>{
        if(!records[i] || tr.querySelector('[data-delete-expense]')) return;
        const td=document.createElement('td');
        td.innerHTML='<button type="button" class="cashbook-history-delete" data-delete-expense="'+Number(records[i].id)+'" title="Eliminar egreso" aria-label="Eliminar egreso">'+trash+'</button>';
        tr.appendChild(td);
      });
    }
  }

  if(typeof renderCashbook==='function'){
    const originalRenderCashbook=renderCashbook;
    renderCashbook=function(){
      originalRenderCashbook();
      addDeleteButtons();
    };
  }
  if(typeof renderExpenses==='function'){
    const originalRenderExpenses=renderExpenses;
    renderExpenses=function(){
      originalRenderExpenses();
      addDeleteButtons();
    };
  }

  document.addEventListener('click',function(e){
    const incomeBtn=e.target.closest('[data-delete-cashbook]');
    if(incomeBtn){
      const id=Number(incomeBtn.dataset.deleteCashbook);
      const row=(data.cashbook||[]).find(x=>Number(x.id)===id);
      if(!row) return;
      if(!window.confirm('¿Eliminar este ingreso de '+(typeof money==='function'?money(row.amount||0):'$'+Number(row.amount||0).toFixed(2))+'?\n\nEsta acción no se puede deshacer.')) return;
      data.cashbook=data.cashbook.filter(x=>Number(x.id)!==id);
      if(typeof save==='function') save();
      if(typeof renderCashbook==='function') renderCashbook();
      if(typeof render==='function') render();
      return;
    }
    const expenseBtn=e.target.closest('[data-delete-expense]');
    if(expenseBtn){
      const id=Number(expenseBtn.dataset.deleteExpense);
      const row=(data.expenses||[]).find(x=>Number(x.id)===id);
      if(!row) return;
      if(!window.confirm('¿Eliminar este egreso de '+(typeof money==='function'?money(row.amount||0):'$'+Number(row.amount||0).toFixed(2))+'?\n\nEsta acción no se puede deshacer.')) return;
      data.expenses=data.expenses.filter(x=>Number(x.id)!==id);
      if(typeof save==='function') save();
      if(typeof renderExpenses==='function') renderExpenses();
      if(typeof render==='function') render();
    }
  });

  addDeleteButtons();
})();
