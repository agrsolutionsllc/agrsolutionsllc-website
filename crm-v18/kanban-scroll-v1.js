// AGR CRM · Kanban scalable columns
(function(){
  const style=document.createElement('style');
  style.textContent=`
    #caseBoard.kanban{
      align-items:start!important;
      grid-auto-rows:360px!important;
    }
    #caseBoard .column{
      height:360px!important;
      min-height:360px!important;
      max-height:360px!important;
      overflow:hidden!important;
      display:flex!important;
      flex-direction:column!important;
      position:relative!important;
      padding:0 13px 13px!important;
    }
    #caseBoard .column-head{
      flex:0 0 auto!important;
      position:relative!important;
      top:auto!important;
      z-index:5!important;
      background:#eef1f6!important;
      padding:13px 0 10px!important;
      margin:0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      gap:8px!important;
    }
    #caseBoard .column-body{
      flex:1 1 auto!important;
      min-height:0!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      overscroll-behavior:contain;
      scrollbar-gutter:stable;
      padding:0 3px 2px 0;
    }
    #caseBoard .column-body::-webkit-scrollbar{width:9px}
    #caseBoard .column-body::-webkit-scrollbar-thumb{
      background:#cfd6e2;
      border-radius:999px;
      border:2px solid #eef1f6;
    }
    #caseBoard .column-body::-webkit-scrollbar-track{background:transparent}
    #caseBoard .column-expand-btn{display:none!important}
    @media(max-width:700px){
      #caseBoard.kanban{grid-auto-rows:330px!important}
      #caseBoard .column{
        height:330px!important;
        min-height:330px!important;
        max-height:330px!important;
      }
    }
  `;
  document.head.appendChild(style);

  let enhancing=false;
  function enhanceColumns(){
    if(enhancing) return;
    enhancing=true;
    try{
      document.querySelectorAll('#caseBoard .column').forEach(column=>{
        column.classList.remove('column-expanded');
        column.querySelectorAll('.column-expand-btn').forEach(btn=>btn.remove());
        const head=column.querySelector(':scope > .column-head');
        if(!head) return;

        let body=column.querySelector(':scope > .column-body');
        if(!body){
          body=document.createElement('div');
          body.className='column-body';
          const movable=[...column.children].filter(el=>el!==head && !el.classList.contains('column-body'));
          movable.forEach(el=>body.appendChild(el));
          column.appendChild(body);
        }else{
          const stray=[...column.children].filter(el=>el!==head && el!==body);
          stray.forEach(el=>body.appendChild(el));
        }
      });
    }finally{
      enhancing=false;
    }
  }

  enhanceColumns();
  const board=document.getElementById('caseBoard');
  if(board){
    let timer=null;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(enhanceColumns,0);
    }).observe(board,{childList:true,subtree:false});
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="cases"],[data-jump="cases"]')) setTimeout(enhanceColumns,0);
  });
})();

// Load case bundles / included forms manager.
(function(){
  if(document.querySelector('script[data-agr-case-bundles]')) return;
  const s=document.createElement('script');
  s.src='./case-bundles-v1.js?v=1';
  s.async=false;
  s.dataset.agrCaseBundles='1';
  document.head.appendChild(s);
})();

// Add package selector directly to the New Case form.
(function(){
  if(document.querySelector('script[data-agr-new-case-bundles]')) return;
  const s=document.createElement('script');
  s.src='./case-new-form-bundles-v1.js?v=1';
  s.async=false;
  s.dataset.agrNewCaseBundles='1';
  document.head.appendChild(s);
})();
