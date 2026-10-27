/* Nova Salud — vista previa de WhatsApp. No envía mensajes reales. */
(function(){
'use strict';
if(document.getElementById('nova-wa-trigger'))return;
const style=document.createElement('style');
style.textContent=[
'.nova-wa-trigger{position:fixed;right:18px;bottom:90px;z-index:2250;background:#e5fff0;color:#116443;',
'border:1px solid #b8edcf;border-radius:999px;padding:12px 17px;font:800 14px system-ui;',
'box-shadow:0 10px 30px rgba(10,90,54,.17);cursor:pointer}',
'.nova-wa-trigger[hidden]{display:none!important}',
'.nova-wa-trigger:hover{background:#cdf8df}',
'.nova-wa-trigger small{display:block;font-size:10px;font-weight:600}',
'.nova-wa-dialog{border:0;border-radius:22px;padding:0;width:min(450px,calc(100vw - 30px));',
'max-height:88vh;overflow:auto;color:#173b57;font-family:system-ui;box-shadow:0 24px 80px #123b4640}',
'.nova-wa-dialog::backdrop{background:rgba(12,39,54,.52)}',
'.nova-wa-head{background:linear-gradient(130deg,#08764b,#16996b);color:white;padding:20px;',
'display:flex;justify-content:space-between;gap:14px}',
'.nova-wa-head h2{font-size:19px;line-height:1.3;margin:0}.nova-wa-head p{font-size:12px;margin:5px 0 0;opacity:.94}',
'.nova-wa-close{height:33px;width:33px;border-radius:10px;border:1px solid #ffffff66;background:#ffffff22;',
'color:white;font-size:22px;cursor:pointer;flex:none}',
'.nova-wa-body{padding:20px}.nova-wa-info{background:#fff7e7;color:#815917;border:1px solid #ecdba8;',
'padding:12px;border-radius:11px;font-size:12px;line-height:1.5}',
'.nova-wa-chat{margin:15px 0;background:#eff7f0;border-radius:13px;padding:14px}',
'.nova-wa-bubble{background:white;padding:14px;border-radius:12px 12px 12px 2px;',
'box-shadow:0 2px 9px #00000010;font-size:13px;line-height:1.6}',
'.nova-wa-chat small{font-size:11px;color:#668673;display:block;margin-top:8px}',
'.nova-wa-step{margin:10px 0;font-size:13px;color:#4a687a;line-height:1.5}',
'.nova-wa-buttons{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}',
'.nova-wa-buttons button{min-height:44px;padding:10px;border-radius:11px;cursor:pointer;font:700 12px system-ui}',
'.nova-wa-primary{background:#12805a;color:white;border:1px solid #12805a}',
'.nova-wa-secondary{background:white;color:#24654e;border:1px solid #bddaca}',
'.nova-wa-note{font-size:11px;color:#697f8d;line-height:1.5;margin:13px 0 0}',
'@media(max-width:570px){.nova-wa-trigger{bottom:76px;right:12px;padding:10px 14px}',
'.nova-wa-buttons{grid-template-columns:1fr}}'
].join('');
document.head.append(style);
const trigger=document.createElement('button');
trigger.id='nova-wa-trigger';trigger.className='nova-wa-trigger';trigger.type='button';
trigger.setAttribute('aria-haspopup','dialog');
// Oculto desde el primer instante: solo se muestra en el portal autenticado.
trigger.hidden=true;
trigger.innerHTML='💬 WhatsApp<small>Demostración</small>';
document.body.append(trigger);
const dlg=document.createElement('dialog');
dlg.className='nova-wa-dialog';dlg.setAttribute('aria-labelledby','nova-wa-title');
dlg.innerHTML=[
'<div class="nova-wa-head"><div><h2 id="nova-wa-title">WhatsApp · Clínica Nova Salud</h2>',
'<p>Notificaciones operativas para pacientes</p></div>',
'<button class="nova-wa-close" type="button" data-wa="close" aria-label="Cerrar">×</button></div>',
'<div class="nova-wa-body"><div class="nova-wa-info"><b>Modo demostración:</b> los mensajes todavía no se envían.',
' La conexión oficial de WhatsApp Business está pendiente.</div>',
'<div class="nova-wa-chat"><div class="nova-wa-bubble">',
'¡Hola! 👋 Te damos la bienvenida a Clínica Nova Salud.',
'<p>Desde tu portal puedes gestionar tus citas. Podrás recibir recordatorios por WhatsApp cuando',
' autorices los avisos y habilitemos el servicio.</p></div>',
'<small>Mensaje ilustrativo · No enviado</small></div>',
'<div class="nova-wa-step">① Regístrate o inicia sesión en el portal.</div>',
'<div class="nova-wa-step">② Entra a <b>Mis citas → Preferencias de WhatsApp</b>.</div>',
'<div class="nova-wa-step">③ Guarda el número y autoriza los mensajes. Para guardarlo en Supabase',
' falta ejecutar la migración SQL 48.</div>',
'<div class="nova-wa-buttons">',
'<button class="nova-wa-primary" type="button" data-wa="preferences">Configurar mis avisos</button>',
'<button class="nova-wa-secondary" type="button" data-wa="register">Crear cuenta de paciente</button>',
'</div><p class="nova-wa-note">No es un canal real de consultas médicas. No compartas datos clínicos en esta demo.</p></div>'
].join('');
document.body.append(dlg);
// WhatsApp es una función del portal del paciente, no del personal ni de la portada.
const patientAppView=document.getElementById('appView');
function isPatientSession(){
  return Boolean(patientAppView)
    && !patientAppView.classList.contains('hidden')
    && typeof state!=='undefined'
    && state.role==='patient'
    && Boolean(state.user);
}
function syncWhatsAppVisibility(){
  const allowed=isPatientSession();
  trigger.hidden=!allowed;
  if(!allowed && dlg.open)dlg.close();
}
function open(){
  // Evita abrir el diálogo desde JS cuando el rol no es paciente.
  if(!isPatientSession())return;
  if(!dlg.open)dlg.showModal();
}
function close(){if(dlg.open)dlg.close();}
trigger.addEventListener('click',open);
dlg.addEventListener('click',function(e){
 if(e.target===dlg){close();return;}
 const b=e.target.closest('[data-wa]');if(!b)return;
 const action=b.dataset.wa;close();
 if(action==='close')return;
 if(action==='register'){
   if(typeof openPatientModal==='function'){openPatientModal('register');return;}
   document.querySelector('[data-action="patient-portal"]')?.click();
   return;
 }
 if(action==='preferences'){
   if(typeof state!=='undefined' && state.role==='patient'){
      if(typeof go==='function')go('patient-appointments');
      const link=document.querySelector('[data-v76-whatsapp]');
      if(link)link.click();
   } else if(typeof openPatientModal==='function'){
      openPatientModal('login');
   } else document.querySelector('[data-action="patient-portal"]')?.click();
 }
});
// Las transiciones de entrada/salida ya cambian la clase del portal en Nova.
syncWhatsAppVisibility();
if(patientAppView){
  new MutationObserver(syncWhatsAppVisibility).observe(patientAppView,{
    attributes:true,attributeFilter:['class']
  });
}
// Ocultar de inmediato al solicitar cierre de sesión.
document.addEventListener('click',function(e){
  if(e.target.closest('[data-action="logout"]')){
    trigger.hidden=true;
    close();
  }
},true);
window.NovaWhatsAppPreview={open:open,close:close,sync:syncWhatsAppVisibility};
})();