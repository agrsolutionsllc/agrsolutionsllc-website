// AGR CRM · Kanban scalable columns
(function(){
  const style=document.createElement('style');
  style.textContent=`
    #caseBoard .column{
      height:480px;
      min-height:480px;
      max-height:480px;
      overflow-y:auto;
      overflow-x:hidden;
      position:relative;
      scrollbar-gutter:stable;
      padding-top:0;
    }
    #caseBoard .column-head{
      position:sticky;
      top:0;
      z-index:5;
      background:#eef1f6;
      padding:13px 0 10px;
      margin-bottom:10px;
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:8px;
      align-items:center;
    }
    #caseBoard .column-head strong{min-width:0}
    #caseBoard .column-head span{justify-self:end}
    #caseBoard .column-expand-btn{
      grid-column:1/-1;
      justify-self:start;
      border:0;
      background:transparent;
      color:#0d2b57;
      font-size:.76rem;
      font-weight:800;
      padding:0;
      margin-top:-2px;
      cursor:pointer;
    }
    #caseBoard .column-expanded{
      height:auto;
      min-height:480px;
      max-height:none;
      overflow:visible;
    }
    #caseBoard .column::-webkit-scrollbar{width:9px}
    #caseBoard .column::-webkit-scrollbar-thumb{background:#cfd6e2;border-radius:999px;border:2px solid #eef1f6}
    #caseBoard .column::-webkit-scrollbar-track{background:transparent}
    @media(max-width:700px){
      #caseBoard .column{height:430px;min-height:430px;max-height:430px}
      #caseBoard .column-expanded{height:auto;min-height:430px;max-height:none}
    }
  `;
  document.head.appendChild(style);

  function enhanceColumns(){
    document.querySelectorAll('#caseBoard .column').forEach(column=>{
      const head=column.querySelector('.column-head');
      if(!head) return;
      const countEl=head.querySelector('span');
      const count=Number(countEl?.textContent||0);
      let btn=head.querySelector('.column-expand-btn');
      if(count<=5){
        if(btn) btn.remove();
        column.classList.remove('column-expanded');
        return;
      }
      if(!btn){
        btn=document.createElement('button');
        btn.type='button';
        btn.className='column-expand-btn';
        btn.addEventListener('click',function(e){
          e.stopPropagation();
          const expanded=column.classList.toggle('column-expanded');
          btn.textContent=expanded?'Volver a vista compacta':'Ver todos';
          if(!expanded) column.scrollTop=0;
        });
        head.appendChild(btn);
      }
      if(!btn.textContent) btn.textContent=column.classList.contains('column-expanded')?'Volver a vista compacta':'Ver todos';
    });
  }

  enhanceColumns();
  const board=document.getElementById('caseBoard');
  if(board) new MutationObserver(enhanceColumns).observe(board,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="cases"],[data-jump="cases"]')) setTimeout(enhanceColumns,0);
  });
})();
