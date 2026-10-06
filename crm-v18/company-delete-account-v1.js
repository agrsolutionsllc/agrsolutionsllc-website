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
