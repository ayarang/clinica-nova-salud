/* Clínica Nova Salud · Asistente Nova v7.7
   Chat de orientación con reglas + consultas RPC autorizadas al propio usuario.
   No es IA generativa, no crea citas ni consulta historias clínicas.
   No usa claves privadas, no guarda mensajes, no envía información fuera de Supabase.
*/
(function(){
'use strict';
if(document.getElementById('novaAssistantButton')) return;

const pageRole = () => {
  try { return (typeof state !== 'undefined' && state?.role) || 'visitante'; }
  catch (_) { return 'visitante'; }
};
const currentUser = () => {
  try { return (typeof state !== 'undefined' && state?.user) || null; }
  catch (_) { return null; }
};
const api = () => window.NovaAPI?.enabled ? window.NovaAPI : null;
const readableRole = {
  visitante:'Visitante',patient:'Paciente',almacen:'Almacén',gerencia:'Gerencia',
  recepcion:'Recepción',medico:'Médico',enfermeria:'Enfermería',
  caja:'Caja',sistemas:'Sistemas',laboratorio:'Laboratorio'
};
function normalize(v) {
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}
function localToday() {
  // Hora de Lima para fechas de atención.
  const f = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'});
  return f.format(new Date());
}
const css=document.createElement('style');css.id='novaAssistantCSS';
css.textContent=[
'.nova-assistant-trigger{position:fixed;z-index:2600;left:16px;bottom:20px;',
'display:flex;align-items:center;gap:10px;border:1px solid #b5d9ec;',
'border-radius:999px;background:linear-gradient(135deg,#145b82,#188ca0);color:white;',
'box-shadow:0 13px 32px #19455c3d;padding:11px 17px;cursor:pointer;',
'font:800 14px system-ui;transition:transform .16s,box-shadow .16s}',
'.nova-assistant-trigger:hover{transform:translateY(-2px);box-shadow:0 16px 38px #19455c50}',
'.nova-assistant-trigger svg{width:23px;height:23px}',
'.nova-assistant-trigger small{display:block;font:600 10px system-ui;opacity:.85}',
'.nova-assistant-panel{position:fixed;z-index:2700;left:16px;bottom:82px;',
'width:min(408px,calc(100vw - 30px));height:min(605px,calc(100dvh - 105px));',
'display:flex;flex-direction:column;overflow:hidden;background:white;',
'border:1px solid #c9e1eb;border-radius:21px;box-shadow:0 18px 70px #1139494a;',
'color:#1c3d51;font:14px system-ui}',
'.nova-assistant-panel[hidden]{display:none!important}',
'.nova-assistant-header{background:linear-gradient(125deg,#124e75,#158e91);color:white;',
'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px}',
'.nova-assistant-title{display:flex;align-items:center;gap:10px}',
'.nova-assistant-avatar{height:39px;width:39px;border-radius:12px;background:#ffffff23;',
'display:flex;justify-content:center;align-items:center;font-size:23px}',
'.nova-assistant-title b{display:block;font-size:15px}',
'.nova-assistant-title small{font-size:11px;opacity:.9}',
'.nova-assistant-close{border:1px solid #ffffff55;background:#ffffff20;color:white;',
'border-radius:10px;width:34px;height:34px;font-size:22px;cursor:pointer}',
'.nova-assistant-banner{background:#eff8fb;border-bottom:1px solid #dcebf1;',
'padding:9px 15px;font-size:11px;line-height:1.5;color:#527486}',
'.nova-assistant-messages{flex:1;min-height:0;overflow-y:auto;scroll-behavior:smooth;',
'padding:15px 14px 12px;background:linear-gradient(180deg,#f5fbfd,#fff)}',
'.nova-assistant-message{max-width:91%;margin:0 0 12px;display:flex;flex-direction:column;gap:4px}',
'.nova-assistant-message.bot{margin-right:auto}',
'.nova-assistant-message.user{margin-left:auto;align-items:flex-end}',
'.nova-assistant-bubble{background:white;color:#285064;border:1px solid #deebf1;',
'border-radius:14px 14px 14px 4px;padding:11px 12px;',
'font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}',
'.nova-assistant-message.user .nova-assistant-bubble{background:#d6f1fa;',
'border-color:#bde1f0;border-radius:14px 14px 4px 14px;color:#184964}',
'.nova-assistant-meta{font-size:10px;color:#879ca6;margin-left:3px}',
'.nova-assistant-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}',
'.nova-assistant-chip{border-radius:999px;border:1px solid #bde2e8;',
'background:#f5fcfd;color:#13758a;font:700 11px system-ui;',
'padding:7px 10px;cursor:pointer;max-width:100%;text-align:left}',
'.nova-assistant-chip:hover{background:#dcf5f8}',
'.nova-assistant-form{display:flex;align-items:flex-end;gap:8px;padding:11px;',
'border-top:1px solid #e4eef2;background:white}',
'.nova-assistant-input{flex:1;min-width:0;max-height:95px;resize:none;',
'border:1px solid #c9e0e8;border-radius:12px;padding:10px 11px;outline:none;',
'color:#234d63;font:13px system-ui;line-height:1.35}',
'.nova-assistant-input:focus{border-color:#388daa;box-shadow:0 0 0 3px #d9f1f8}',
'.nova-assistant-send{background:#167d91;border:0;color:white;border-radius:11px;',
'height:39px;min-width:42px;font-size:19px;cursor:pointer}',
'.nova-assistant-send:disabled{opacity:.5;cursor:default}',
'.nova-assistant-footer{font-size:10px;color:#78909d;padding:0 14px 11px;',
'background:white;line-height:1.3}',
'@media(max-width:600px){.nova-assistant-trigger{bottom:13px;left:12px;padding:10px 13px}',
'.nova-assistant-panel{left:10px;bottom:68px;width:calc(100vw - 20px);',
'height:min(590px,calc(100dvh - 91px));border-radius:17px}}',
'@media(prefers-reduced-motion:reduce){.nova-assistant-messages{scroll-behavior:auto}',
'.nova-assistant-trigger{transition:none}}'
].join('');
document.head.append(css);

const trigger=document.createElement('button');
trigger.id='novaAssistantButton';trigger.className='nova-assistant-trigger';
trigger.type='button';trigger.setAttribute('aria-controls','novaAssistantPanel');
trigger.setAttribute('aria-expanded','false');
trigger.setAttribute('aria-label','Abrir Asistente Nova, chat de orientación');
trigger.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M9 3h6M8 13h.01M16 13h.01M8 17h8"/></svg><span>Asistente Nova<small>Chat de ayuda</small></span>';
document.body.append(trigger);

const panel=document.createElement('section');
panel.id='novaAssistantPanel';panel.className='nova-assistant-panel';panel.hidden=true;
panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Asistente Nova');
panel.innerHTML=[
'<header class="nova-assistant-header"><div class="nova-assistant-title">',
'<span class="nova-assistant-avatar" aria-hidden="true">🤖</span>',
'<div><b>Asistente Nova</b><small id="novaAssistantRole">Orientación virtual</small></div></div>',
'<button type="button" class="nova-assistant-close" aria-label="Cerrar el asistente">×</button></header>',
'<div class="nova-assistant-banner">Asistente guiado (no IA clínica). ',
'No compartas contraseñas ni datos médicos privados en el chat.</div>',
'<div id="novaAssistantMessages" class="nova-assistant-messages" role="log" aria-live="polite" aria-relevant="additions"></div>',
'<form class="nova-assistant-form" id="novaAssistantForm">',
'<textarea id="novaAssistantInput" class="nova-assistant-input" rows="1" maxlength="300" ',
'aria-label="Escribe tu consulta" placeholder="Escribe tu pregunta…" required></textarea>',
'<button type="submit" class="nova-assistant-send" aria-label="Enviar mensaje">➤</button></form>',
'<div class="nova-assistant-footer">Respuestas orientativas. ',
'Los datos consultados se obtienen únicamente con tu sesión y permisos.</div>'
].join('');
document.body.append(panel);
const messages=panel.querySelector('#novaAssistantMessages');
const input=panel.querySelector('#novaAssistantInput');
const form=panel.querySelector('#novaAssistantForm');
const titleRole=panel.querySelector('#novaAssistantRole');
let lastRole=null;
let opId=0;

function bubble(kind,txt,chips=[]) {
  const wrap=document.createElement('div');
  wrap.className='nova-assistant-message '+kind;
  const box=document.createElement('div');
  box.className='nova-assistant-bubble';
  box.textContent=String(txt||'');
  wrap.append(box);
  if(chips.length){
    const actions=document.createElement('div');
    actions.className='nova-assistant-quick';
    chips.forEach(item=>{
      const b=document.createElement('button');
      b.type='button';b.className='nova-assistant-chip';b.textContent=item.label;
      b.addEventListener('click',()=>{
        if(item.action){route(item.action);return;}
        ask(item.question||item.label);
      });
      actions.append(b);
    });
    wrap.append(actions);
  }
  messages.append(wrap);
  messages.scrollTop=messages.scrollHeight;
  return wrap;
}
function chipsFor(role){
  if(role==='patient')return [
    {label:'📅 Mis próximas citas',question:'¿Cuáles son mis citas?'},
    {label:'🔄 Cambiar o cancelar',question:'¿Cómo reprogramo una cita?'},
    {label:'🕒 Horarios',question:'¿Cuáles son los horarios?'},
    {label:'Abrir Mis citas',action:'citas'}];
  if(role==='almacen'||role==='gerencia')return [
    {label:'📦 Stock crítico',question:'¿Hay productos con stock crítico?'},
    {label:'⏳ Vencimientos',question:'¿Cómo revisar vencimientos?'},
    {label:'Abrir Inventario',action:'inventario'},
    {label:'Ayuda general',question:'¿Qué puedes hacer?'}];
  if(role==='recepcion')return [
    {label:'📅 Citas',action:'citas-staff'},
    {label:'👤 Pacientes',action:'pacientes'},
    {label:'🕒 Horarios',question:'horarios'}];
  if(role==='medico')return [
    {label:'🗓 Mi agenda',action:'citas-staff'},
    {label:'📋 Historial',action:'historial'},
    {label:'🕒 Horarios',question:'horarios'}];
  if(role==='enfermeria')return [
    {label:'🗓 Atención',action:'citas-staff'},
    {label:'❓ Ayuda',question:'¿Qué puedes hacer?'}];
  if(role==='caja')return [
    {label:'💳 Facturación',action:'facturacion'},
    {label:'❓ Ayuda',question:'¿Qué puedes hacer?'}];
  if(role==='sistemas')return [
    {label:'🛠 Soporte',action:'soporte'},
    {label:'❓ Ayuda',question:'¿Qué puedes hacer?'}];
  return [
    {label:'📅 Reservar cita',action:'login'},
    {label:'🕒 Horarios',question:'¿Cuáles son los horarios?'},
    {label:'📍 Sedes',question:'¿Dónde están las sedes?'},
    {label:'👤 Ingresar al portal',action:'login'}];
}
function greeting(role){
  if(role==='patient')return '¡Hola! 👋 Soy Asistente Nova. Puedo consultar tus próximas citas con tu sesión, explicarte cómo cancelarlas o reprogramarlas y orientarte sobre horarios y sedes.';
  if(role==='almacen')return '¡Hola, equipo de Almacén! 📦 Puedo consultar los productos de stock crítico con tus permisos y ayudarte a localizar las funciones de inventario.';
  if(role==='gerencia')return '¡Hola! Puedo ayudarte a revisar inventario y orientarte hacia módulos de gestión autorizados.';
  if(role==='medico')return '¡Hola! 🩺 Soy una guía de navegación. Puedo ayudarte con tu agenda y funciones administrativas, pero no emito diagnósticos ni decisiones clínicas.';
  if(role==='caja')return '¡Hola, equipo de Caja! Puedo ayudarte a ubicar facturación, comprobantes y operaciones administrativas del portal.';
  if(role==='recepcion')return '¡Hola, equipo de Recepción! Te ayudo a localizar citas, pacientes y horarios dentro de Nova Salud.';
  if(role==='enfermeria')return '¡Hola, equipo de Enfermería! Puedo guiarte hacia los módulos que permite tu perfil.';
  if(role==='sistemas')return '¡Hola, equipo de Sistemas! Puedo ayudarte a encontrar las opciones de soporte y gestión autorizadas.';
  if(role==='laboratorio')return '¡Hola, equipo de Laboratorio! Te ayudo a ubicar las funciones de tu rol.';
  return '¡Hola! 👋 Soy Asistente Nova, el chat de orientación de Clínica Nova Salud. ¿Deseas conocer los horarios, las sedes o cómo reservar una cita?';
}
function resetIfRoleChanged(){
  const role=pageRole();
  if(role===lastRole)return role;
  lastRole=role;
  opId++;
  messages.replaceChildren();
  titleRole.textContent=(readableRole[role]||'Usuario')+' · Ayuda guiada';
  bubble('bot',greeting(role),chipsFor(role));
  return role;
}
function open(){
  panel.hidden=false;trigger.setAttribute('aria-expanded','true');
  trigger.setAttribute('aria-label','Cerrar Asistente Nova');
  resetIfRoleChanged();
  input.focus();
}
function close(){
  panel.hidden=true;trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label','Abrir Asistente Nova, chat de orientación');
  opId++;
  // La conversación nunca se conserva en localStorage ni en un servidor.
  messages.replaceChildren();
  lastRole=null;input.value='';
  trigger.focus();
}
function route(action){
  const role=pageRole();
  close();
  if(action==='login'){
    if(typeof openPatientModal==='function')openPatientModal('login');
    else document.querySelector('[data-action="patient-portal"]')?.click();
    return;
  }
  if(typeof go!=='function')return;
  if(action==='citas'&&role==='patient')return go('patient-appointments');
  if(action==='inventario'&&['almacen','gerencia'].includes(role))return go('inventory');
  if(action==='citas-staff'&&['recepcion','medico','enfermeria','gerencia'].includes(role))return go('appointments');
  if(action==='pacientes'&&['recepcion','gerencia'].includes(role))return go('patients');
  if(action==='historial'&&['medico','gerencia'].includes(role))return go('history');
  if(action==='facturacion'&&['caja','gerencia'].includes(role))return go('billing');
  if(action==='soporte'&&['sistemas','gerencia'].includes(role))return go('support');
  open();
  bubble('bot','Esta sección no está habilitada para tu perfil.');
}

async function patientCitas(role,token){
  if(role!=='patient')return {message:'Solo una sesión de paciente puede consultar sus propias citas. Ingresa a tu portal.',chips:chipsFor(role)};
  if(!api()||typeof api().patientAppointments!=='function')
    return {message:'No tengo acceso a las citas en este momento. Puedes consultarlas en «Mis citas».',chips:[{label:'Abrir Mis citas',action:'citas'}]};
  try{
    const rows=await api().patientAppointments();
    if(token!==opId||pageRole()!=='patient'||panel.hidden)return null;
    const upcoming=rows.filter(a=>String(a.status||'').toUpperCase()!=='CANCELADA' && String(a.status||'').toUpperCase()!=='REALIZADA' && String(a.fecha||'')>=localToday())
      .sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||''))||String(a.hora||'').localeCompare(String(b.hora||'')));
    if(!upcoming.length)return {message:'No encuentro citas futuras activas en tu cuenta. Puedes crear una cita desde el portal.',chips:[{label:'Abrir Mis citas',action:'citas'}]};
    const info=upcoming.slice(0,3).map(a=>'• '+String(a.fecha||'')+' a las '+String(a.hora||'')+' — '+String(a.specialty||'Consulta médica')+', '+String(a.branch||'sede por confirmar')).join('\n');
    return {message:'Tienes '+upcoming.length+' cita(s) futura(s) registrada(s):\n'+info+'\n\nPara gestionar una cita, abre «Mis citas».',chips:[{label:'Ir a Mis citas',action:'citas'}]};
  }catch(_e){
    return {message:'No pude consultar tus citas ahora mismo. Comprueba la conexión de Supabase y vuelve a intentar desde «Mis citas».',chips:[{label:'Abrir Mis citas',action:'citas'}]};
  }
}
async function stock(role,token){
  if(!['almacen','gerencia'].includes(role))
    return {message:'Los datos de inventario son internos y solo pueden consultarse con un perfil autorizado.'};
  if(!api()||typeof api().inventoryStock!=='function')
    return {message:'El inventario no está disponible ahora. Puedes abrir su módulo si tienes permiso.',chips:[{label:'Abrir Inventario',action:'inventario'}]};
  const u=currentUser();
  const branch=role==='almacen'?String(u?.branch||''):'';
  if(role==='almacen'&&!branch)
    return {message:'No identifico tu sede. Consulta Inventario desde tu cuenta para revisar el stock autorizado.'};
  try{
    const rows=await api().inventoryStock({branch,limit:500});
    if(token!==opId||pageRole()!==role||panel.hidden)return null;
    const atRisk=rows.filter(x=>['CRITICO','AGOTADO'].includes(String(x.stock_status||'').toUpperCase()));
    const preview=atRisk.slice(0,4).map(x=>'• '+String(x.product||'Producto')+' ('+String(x.stock_status||'Revisar')+')').join('\n');
    return {message:'Inventario autorizado'+(branch?' de '+branch:'')+': detecté '+atRisk.length+' posición(es) con estado crítico o agotado entre las '+rows.length+' consultadas.'+
      (preview?'\n'+preview:'')+'\n\nConsulta el módulo para ver todos los registros y sus existencias.',chips:[{label:'Abrir Inventario',action:'inventario'}]};
  }catch(_e){
    return {message:'No fue posible obtener el inventario en este momento. Tu perfil podría no tener permiso o Supabase podría estar desconectado.',chips:[{label:'Abrir Inventario',action:'inventario'}]};
  }
}
function staticAnswer(question,role){
  const q=normalize(question);
  if(/emergencia|urgencia|dolor fuerte|no puedo respirar|me desmayo/.test(q))
    return {message:'Si tienes una emergencia médica real, comunícate de inmediato con el servicio de emergencias local o acude a un centro asistencial. Nova Salud es una demostración académica y este chat no brinda atención médica.'};
  if(/diagnostico|tratamiento|medicina para|dosis|receta medica|sintoma/.test(q))
    return {message:'No doy diagnósticos, tratamientos ni recomendaciones médicas personalizadas. Consulta con un profesional de salud. Puedo ayudarte a ubicar las opciones administrativas de la clínica.'};
  if(/horario|cuando atienden|abren|cierran|atencion/.test(q))
    return {message:'Horarios referenciales de la demo:\n• Consulta externa: lunes a sábado, 07:00–21:00.\n• Laboratorio: lunes a sábado, 06:30–20:00.\n• Farmacia: todos los días, 07:00–22:00.\n• Emergencias: se muestra atención referencial 24 h.\n\nSon horarios ficticios del proyecto académico, no de una clínica real.'};
  if(/sede|ubicacion|direccion|distrito|donde estan/.test(q))
    return {message:'Nova Salud presenta cinco sedes ficticias en Lima: Chorrillos, Lurín, Miraflores, San Isidro y San Juan de Lurigancho. En la web pública puedes ir a «Sedes» para consultar los detalles de la demo.'};
  if(/whatsapp|mensaje|recordatorio|notificaci/.test(q))
    return {message:'La demo muestra WhatsApp y opciones de autorización en el portal del paciente. Todavía NO envía recordatorios automáticos a celulares: eso requiere la integración oficial de WhatsApp Business y activar la migración SQL 48.',chips:role==='patient'?[{label:'Abrir Mis citas',action:'citas'}]:[]};
  if(/reprogram|cancel|cambiar cita|mover cita/.test(q))
    return {message:role==='patient'?
      'En el portal entra a «Mis citas», selecciona una cita futura y usa «Reprogramar» o «Cancelar». Es necesario haber ejecutado SQL 48 en Supabase para guardar cambios reales. Si hay pagos, consulta a recepción antes de cancelar.':
      'En Nova Salud el paciente puede consultar y gestionar sus citas desde «Mis citas», después de activar SQL 48 en Supabase.',
      chips:role==='patient'?[{label:'Abrir Mis citas',action:'citas'}]:[{label:'Entrar como paciente',action:'login'}]};
  if(/reserv|solicit|agendar|sacar cita|crear cita/.test(q))
    return {message:role==='patient'?
      'Para solicitar una atención, entra a «Mis citas» y pulsa «Solicitar cita»; escoge sede, médico, fecha y hora.':
      'Para solicitar una cita, crea una cuenta en el Portal del paciente y selecciona el botón de reserva.',
      chips:role==='patient'?[{label:'Abrir Mis citas',action:'citas'}]:[{label:'Entrar al portal',action:'login'}]};
  if(/inventario|stock|almacen|vencim|producto|movimiento/.test(q)){
    if(!['almacen','gerencia'].includes(role))
      return {message:'Para revisar inventarios hace falta una cuenta del personal de Almacén o Gerencia. Desde una cuenta de paciente no se muestran esos datos.'};
    return {message:'En el módulo Inventario puedes revisar existencias, stock crítico y agotado, vencimientos, y movimientos. Pregúntame «¿Hay productos con stock crítico?» si deseas consultar el resumen autorizado.',chips:[{label:'Consultar stock crítico',question:'¿Hay productos con stock crítico?'},{label:'Abrir Inventario',action:'inventario'}]};
  }
  if(/factur|boleta|pago|caja|comprobante/.test(q)){
    if(role==='caja'||role==='gerencia')return {message:'Para consultar o emitir comprobantes dentro de tus permisos, usa el módulo «Facturación y caja». Este asistente no procesa pagos ni solicita datos de tarjetas.',chips:[{label:'Abrir facturación',action:'facturacion'}]};
    if(role==='patient')return {message:'Puedes consultar tus pagos en «Mis pagos» del Portal del paciente. Para devoluciones, comunícate con recepción.'};
    return {message:'La facturación se gestiona dentro del acceso autorizado de Caja y Gerencia.'};
  }
  if(/historial|consulta clinica|expediente medico/.test(q))
    return {message:'El historial clínico solo está disponible mediante los módulos y permisos del sistema. Este chat nunca lee ni presenta diagnósticos, recetas o historias clínicas.'};
  if(/inicio|entrar|sesion|registro|registr|cuenta|usuario|contrase/.test(q)){
    if(role==='visitante')return {message:'En la portada pulsa «Portal del paciente». Desde allí puedes crear una cuenta o iniciar sesión con tus credenciales. Nunca compartas tu contraseña por el chat.',chips:[{label:'Abrir Portal del paciente',action:'login'}]};
    return {message:'Tu sesión está iniciada como '+(readableRole[role]||role)+'. Puedes abrir los módulos disponibles en el menú lateral. Nunca compartas tu contraseña en el chat.'};
  }
  if(/ayuda|que puedes|funciona|hola|buenas|menu|opcion/.test(q))
    return {message:greeting(role),chips:chipsFor(role)};
  return {message:'Puedo ayudarte con horarios, sedes, citas, WhatsApp y con las funciones disponibles para tu rol. No tengo una respuesta específica para esa pregunta; elige una de las opciones o reformúlala.',chips:chipsFor(role)};
}
async function answer(query,role,token){
  const q=normalize(query);
  if(/(?:mis citas|citas que tengo|proxima cita|cuantas citas|ver citas|consultar mis citas)/.test(q) && role==='patient')
    return patientCitas(role,token);
  if(/(?:stock critico|stock agotado|sin stock|faltantes|existencia critica|productos criticos)/.test(q) && ['almacen','gerencia'].includes(role))
    return stock(role,token);
  return staticAnswer(query,role);
}
async function ask(query){
  const content=String(query||'').trim().slice(0,300);
  if(!content||panel.hidden)return;
  const role=resetIfRoleChanged();
  bubble('user',content);
  input.value='';
  const token=++opId;
  const pending=bubble('bot','Consultando…');
  try{
    const response=await answer(content,role,token);
    if(token!==opId||panel.hidden||pageRole()!==role||!response)return;
    pending.remove();
    bubble('bot',response.message,response.chips||[]);
  }catch(_e){
    if(token!==opId||panel.hidden)return;
    pending.remove();
    bubble('bot','No pude procesar esta consulta. Prueba otra opción o utiliza los módulos de Nova Salud.');
  }
}
trigger.addEventListener('click',()=>panel.hidden?open():close());
panel.querySelector('.nova-assistant-close').addEventListener('click',close);
form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
input.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input.value);}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!panel.hidden){e.preventDefault();close();}
});
window.NovaAssistant={open,close};
})();