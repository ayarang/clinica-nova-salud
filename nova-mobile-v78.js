/* Nova Salud v8.2 · Navegación móvil accesible y zona flotante sin solapamientos.
   No altera permisos, login, ni llamadas a Supabase. */
(function(){
  'use strict';
  if(document.getElementById('novaMobileMenu')) return;
  const app=document.getElementById('appView');
  const aside=app?.querySelector('.sidebar');
  const header=app?.querySelector('.top');
  if(!app||!aside||!header)return;
  const css=document.createElement('style');
  css.id='novaMobileV78CSS';
  css.textContent=`
    :root{--nova-glass:rgba(255,255,255,.95)}
    .nova-mobile-menu,.nova-mobile-close{display:none!important}
    .nova-mobile-backdrop{display:none}
    #appView .main{min-width:0;width:100%}
    #appView .content>*{max-width:100%}
    #appView .content .tablewrap{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}
    #appView .content img{max-width:100%;height:auto}
    #appView .content .panel,#appView .content .card{min-width:0}
    .nova-mobile-menu,.nova-mobile-close{border:1px solid #cddfe7;background:#eff7fa;color:#225575;
      border-radius:11px;width:43px;height:43px;align-items:center;justify-content:center;
      font-size:22px;flex:0 0 43px;cursor:pointer}
    .nova-mobile-close{margin-left:auto;margin-bottom:8px;border-color:#41738d;color:white;background:#315f79}
    .nova-mobile-menu:focus-visible,.nova-mobile-close:focus-visible{outline:3px solid #3b9fc0;outline-offset:2px}
    @media(max-width:900px){
      html,body{max-width:100%;overflow-x:clip}
      #appView.app{display:block!important;width:100%!important;max-width:100%;min-height:100dvh}
      #appView.app.hidden{display:none!important}
      #appView .main{width:100%!important;min-width:0!important;max-width:100vw!important;margin:0!important}
      #appView .sidebar{position:fixed!important;top:0!important;bottom:0!important;left:0!important;
        width:min(296px,84vw)!important;height:100dvh!important;z-index:3301!important;
        transform:translateX(-105%);transition:transform .24s ease;box-shadow:20px 0 60px #07314542;
        padding:17px 13px;overflow-y:auto;display:flex!important;flex-direction:column!important}
      #appView.nova-mobile-open .sidebar{transform:translateX(0)}
      #appView .sidebar .brand span:last-child,#appView .navbtn span:last-child,
      #appView .sidebar .profile{display:block!important}
      #appView .sidebar .brand{display:flex!important}
      #appView .navbtn{width:100%;min-height:45px;gap:13px}
      #appView .sidenav{overflow:visible!important;display:flex;flex-direction:column;gap:5px;min-height:0;flex:1}
      #appView .sidefoot{margin-top:auto!important;padding:14px 4px calc(10px + env(safe-area-inset-bottom));
        display:flex!important;flex-direction:column;gap:10px;position:relative;z-index:2;
        background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.07))}
      #appView .sidefoot .profile{padding-top:8px;border-top:1px solid rgba(255,255,255,.16)}
      #appView .sidefoot [data-action="logout"]{width:100%;min-height:44px;padding:10px 12px;
        border-radius:10px;text-align:left}
      #appView .top{position:sticky;z-index:19;top:0;padding:11px 14px;min-height:70px;
        display:flex;justify-content:space-between;gap:10px}
      #appView .top>div:first-child{min-width:0;flex:1}
      #appView .top #pageTitle{font-size:clamp(1rem,4vw,1.22rem);max-width:100%;overflow-wrap:anywhere}
      #appView .top #pageKicker{font-size:10px;line-height:1.2}
      #appView .topright{gap:7px;flex-wrap:nowrap}
      #appView #sessionScope{display:none}
      #appView .content{width:100%!important;max-width:100%!important;min-width:0!important;
        padding:15px 12px 110px!important;overflow:visible}
      #appView .content .kpis,#appView .content .v75-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
      #appView .content .modulegrid,#appView .content .dashgrid{grid-template-columns:minmax(0,1fr)}
      #appView .content .toolbar{align-items:stretch}
      #appView .content .toolbar .left,#appView .content .toolbar .right{width:100%;max-width:100%}
      #appView .content .formgrid,#appView .content .formgrid.three{grid-template-columns:minmax(0,1fr)}
      #appView .content .tablewrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
      #appView .content .table{min-width:500px}
      .nova-mobile-menu,.nova-mobile-close{display:inline-flex!important}
      .nova-mobile-backdrop{position:fixed;inset:0;background:rgba(11,36,57,.53);z-index:3300}
      #appView.nova-mobile-open .nova-mobile-backdrop{display:block}
      body.nova-mobile-locked{overflow:hidden}
      /* Mientras el menú móvil está abierto, ningún botón flotante tapa perfil o cerrar sesión. */
      body.nova-mobile-locked .nova-assistant-trigger,
      body.nova-mobile-locked .nova-assistant-panel,
      body.nova-mobile-locked .nova-wa-trigger,
      body.nova-mobile-locked #novaDbStatus{display:none!important}
      /* Zona inferior móvil: asistente compacto a la izquierda, estado DB a la derecha,
         WhatsApp más arriba para evitar colisiones. */
      .nova-assistant-trigger{left:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;
        width:50px!important;height:50px!important;min-width:50px!important;padding:0!important;
        border-radius:50%!important;justify-content:center!important}
      .nova-assistant-trigger>span{display:none!important}
      #novaDbStatus{right:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;
        max-width:48vw!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        font-size:10px!important;padding:8px 10px!important}
      .nova-wa-trigger{right:14px!important;bottom:calc(112px + env(safe-area-inset-bottom))!important}
      .nova-mobile-menu{order:-1}
    }
    @media(max-width:540px){
      #appView .content{padding:13px 11px 105px!important}
      #appView .content .kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}
      #appView .content .kpi{padding:11px;border-radius:12px}
      #appView .content .kpi strong{font-size:clamp(1.05rem,4vw,1.5rem)}
      #appView .content .v75-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      #appView .content .v75-kpi{min-width:0;overflow-wrap:anywhere}
      #appView .top .topright>[data-action="logout"]{display:none}
      .modal{width:min(100%,calc(100vw - 16px))!important;max-height:90dvh;padding:19px!important}
    }
    @media(prefers-reduced-motion:reduce){#appView .sidebar{transition:none}}
  `;
  document.head.append(css);
  const openBtn=document.createElement('button');
  openBtn.type='button';openBtn.className='nova-mobile-menu';openBtn.id='novaMobileMenu';
  openBtn.setAttribute('aria-label','Abrir menú de navegación');
  openBtn.setAttribute('aria-expanded','false');openBtn.setAttribute('aria-controls','sideNav');
  openBtn.innerHTML='☰';
  header.insertBefore(openBtn,header.firstChild);
  const closeBtn=document.createElement('button');
  closeBtn.type='button';closeBtn.className='nova-mobile-close';
  closeBtn.setAttribute('aria-label','Cerrar menú');closeBtn.textContent='×';
  aside.insertBefore(closeBtn,aside.firstChild);
  const backdrop=document.createElement('div');backdrop.className='nova-mobile-backdrop';
  backdrop.setAttribute('aria-hidden','true');app.insertBefore(backdrop,aside);
  function closeMenu(){
    app.classList.remove('nova-mobile-open');
    openBtn.setAttribute('aria-expanded','false');
    document.body.classList.remove('nova-mobile-locked');
  }
  function openMenu(){
    if(!app.classList.contains('hidden') && matchMedia('(max-width:900px)').matches){
      app.classList.add('nova-mobile-open');openBtn.setAttribute('aria-expanded','true');
      document.body.classList.add('nova-mobile-locked');closeBtn.focus();
    }
  }
  openBtn.addEventListener('click',()=>app.classList.contains('nova-mobile-open')?closeMenu():openMenu());
  closeBtn.addEventListener('click',()=>{closeMenu();openBtn.focus()});
  backdrop.addEventListener('click',closeMenu);
  aside.addEventListener('click',e=>{
    if(e.target.closest('[data-page],[data-action="logout"]'))closeMenu();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&app.classList.contains('nova-mobile-open')){closeMenu();openBtn.focus();}
  });
  window.addEventListener('resize',()=>{
    if(!matchMedia('(max-width:900px)').matches)closeMenu();
  },{passive:true});
  // Gestos horizontales: abrir desde el borde, cerrar al deslizar dentro del panel.
  let start=null;
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||app.classList.contains('hidden')||
      !matchMedia('(max-width:900px)').matches)return;
    const x=e.touches[0].clientX,y=e.touches[0].clientY;
    const opened=app.classList.contains('nova-mobile-open');
    if((!opened && x<28)||(opened && x<Math.min(296,innerWidth*.84)))start={x,y,opened};
    else start=null;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!start||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-start.x;
    const dy=e.changedTouches[0].clientY-start.y;
    if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.6){
      if(start.opened&&dx<0)closeMenu();
      else if(!start.opened&&dx>0)openMenu();
    }
    start=null;
  },{passive:true});
  window.NovaMobileV78={open:openMenu,close:closeMenu};
})();