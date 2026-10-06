// AGR CRM · Allow deleting companies that only have global-account movements
(function(){
  document.addEventListener('click',function(e){
    const btn=e.target.closest('[data-delete-client-id]');
    if(!btn) return;
    const id=Number(btn.dataset.deleteClientId);
    const client=typeof clientById==='function'?clientById(id):null;
    if(!client || !client.isCompany) return;

    const hasCases=Array.isArray(data?.cases) && data.cases.some(x=>Number(x.clientId)===id);
    const hasCash=(Array.isArray(data?.cashbook)&&data.cashbook.some(x=>Number(x.clientId)===id)) || (Array.isArray(data?.expenses)&&data.expenses.some(x=>Number(x.clientId)===id));
    const hasAccount=(Array.isArray(data?.clientAccountCharges)&&data.clientAccountCharges.some(x=>Number(x.clientId)===id)) ||
      (Array.isArray(data?.clientAccountPayments)&&data.clientAccountPayments.some(x=>Number(x.clientId)===id)) ||
      (Array.isArray(data?.clientAccountInvoices)&&data.clientAccountInvoices.some(x=>Number(x.clientId)===id));

    if(!hasAccount || hasCases || hasCash) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const balance=typeof accountBalance==='function'?Number(accountBalance(id)||0):0;
    const msg='Esta empresa tiene movimientos en su Cuenta global'+(balance>0?' y un saldo pendiente de '+(typeof money==='function'?money(balance):'$'+balance.toFixed(2)):'')+'.\n\nSi continúas, se eliminarán la empresa y todos sus cargos, pagos y facturas globales asociados.\n\n¿Eliminar de todos modos?';
    if(!window.confirm(msg)) return;

    data.clientAccountCharges=data.clientAccountCharges.filter(x=>Number(x.clientId)!==id);
    data.clientAccountPayments=data.clientAccountPayments.filter(x=>Number(x.clientId)!==id);
    data.clientAccountInvoices=data.clientAccountInvoices.filter(x=>Number(x.clientId)!==id);
    data.clients=data.clients.filter(x=>Number(x.id)!==id);
    if(typeof save==='function') save();
    if(typeof render==='function') render();
  },true);
})();
