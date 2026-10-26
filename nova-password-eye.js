/* Clínica Nova Salud v8.0.2 · Mostrar/ocultar contraseñas.
 * Mejora visual segura: no lee, registra ni envía contraseñas.
 * Compatible con formularios de acceso/registro generados dinámicamente.
 */
(function(){
  'use strict';
  if(document.getElementById('novaPasswordEyeStyles'))return;
  const css=document.createElement('style');
  css.id='novaPasswordEyeStyles';
  css.textContent=[
    '.nova-password-field{position:relative;display:block;width:100%;min-width:0}',
    '.nova-password-field>input{display:block;width:100%;max-width:100%;padding-right:53px!important}',
    '.nova-password-toggle{position:absolute;top:50%;right:5px;transform:translateY(-50%);',
    'width:42px;height:38px;min-height:38px;display:inline-flex;align-items:center;',
    'justify-content:center;border:0;background:transparent;color:#557689;',
    'border-radius:9px;cursor:pointer;z-index:1;padding:0}',
    '.nova-password-toggle:hover{background:#eaf5fa;color:#176b90}',
    '.nova-password-toggle:focus-visible{outline:2px solid #248ab1;outline-offset:1px}',
    '.nova-password-toggle svg{width:21px;height:21px;pointer-events:none}',
    '@media(max-width:620px){.nova-password-toggle{width:46px;height:42px}}'
  ].join('');
  document.head.append(css);
  const eyeOpen='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.4 12s3.5-6.3 9.6-6.3S21.6 12 21.6 12s-3.5 6.3-9.6 6.3S2.4 12 2.4 12Z"/><circle cx="12" cy="12" r="3.1"/></svg>';
  const eyeClosed='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18M10.7 5.8c.4-.1.8-.1 1.3-.1 6.1 0 9.6 6.3 9.6 6.3a15.5 15.5 0 0 1-3.1 3.8M6.5 6.6A16.1 16.1 0 0 0 2.4 12s3.5 6.3 9.6 6.3c1.5 0 2.9-.4 4.2-1.1"/><path d="M10 10a3.1 3.1 0 0 0 4 4"/></svg>';
  let seq=0;
  function enhance(input){
    if(input.dataset.novaPasswordEye==='1'||input.closest('.nova-password-field'))return;
    if(!input.parentNode)return;
    input.dataset.novaPasswordEye='1';
    const id=input.id||(input.id='nova-password-'+(++seq));
    const wrap=document.createElement('span');wrap.className='nova-password-field';
    const btn=document.createElement('button');
    btn.type='button';btn.className='nova-password-toggle';
    btn.setAttribute('aria-label','Mostrar contraseña');
    btn.setAttribute('title','Mostrar contraseña');
    btn.setAttribute('aria-pressed','false');
    btn.setAttribute('aria-controls',id);
    btn.innerHTML=eyeOpen;
    input.parentNode.insertBefore(wrap,input);
    wrap.append(input,btn);
    // El botón es únicamente visual: no toca el valor ni el envío del formulario.
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const showing=input.type==='text';
      input.type=showing?'password':'text';
      btn.setAttribute('aria-label',showing?'Mostrar contraseña':'Ocultar contraseña');
      btn.setAttribute('title',showing?'Mostrar contraseña':'Ocultar contraseña');
      btn.setAttribute('aria-pressed',String(!showing));
      btn.innerHTML=showing?eyeOpen:eyeClosed;
      input.focus({preventScroll:true});
    });
  }
  function scan(root=document){
    if(root.nodeType===1&&root.matches?.('input[type="password"]'))enhance(root);
    root.querySelectorAll?.('input[type="password"]:not([data-nova-password-eye])').forEach(enhance);
  }
  scan();
  // Los modales de registro, login y recuperación se dibujan con innerHTML.
  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===1)scan(node);
    }));
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();