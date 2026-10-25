/* Nova Salud v7.8 · Centro de avisos y agenda visual de solo lectura.
   Reutiliza RPC existentes; no crea tablas ni envía mensajes externos. */
(function(){
'use strict';
if(document.getElementById('novaNoticeButton'))return;
const app=document.getElementById('appView'),top=app?.querySelector('.topright');
if(!app||!top)return;
const api=()=>window.NovaAPI?.enabled?window.NovaAPI:null;
const role=()=>{try{return typeof state!=='undefined'?state.role:null}catch(_){return null}};
const user=()=>{try{return typeof state!=='undefined'?state.user:null}catch(_){return null}};
const allowedCalendar=new Set(['patient','recepcion','medico','gerencia','enfermeria']);
const allowedStock=new Set(['almacen','gerencia']);
const allowedStaffCalendar=new Set(['recepcion','medico','gerencia','enfermeria']);
const normalizeDate=s=>String(s||'').slice(0,10);
const nowLima=()=>{const p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(x=>{if(x.type!=='literal')p[x.type]=x.value});return p.year+'-'+p.month+'-'+p.day};
const today=nowLima();
const isoMonth=(y,m)=>String(y)+'-'+String(m).padStart(2,'0');
const maxDate=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const labels=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtTime=t=>String(t||'').slice(0,5);
let view=null,calendarY=Number(today.slice(0,4)),calendarM=Number(today.slice(5,7));
let calendarRows=[],calendarDate=today,latestAlerts=[],lastSignature='',lastRole=null;
let fetchId=0,busy=false;
const css=document.createElement('style');
css.id='novaV78ToolsCSS';
css.textContent=[
'.nova-v78-headerbtn{position:relative;display:inline-flex;align-items:center;justify-content:center;',
'height:39px;min-width:39px;border:1px solid #d0e4ed;background:#f4fafc;color:#255f7c;',
'border-radius:11px;cursor:pointer;font-size:20px;flex:none}',
'.nova-v78-headerbtn:hover{background:#e6f3f9}',
'.nova-v78-badge{position:absolute;right:-4px;top:-5px;border:2px solid white;',
'background:#be4350;color:white;border-radius:99px;min-width:19px;height:19px;',
'display:none;align-items:center;justify-content:center;font:800 10px system-ui}',
'.nova-v78-badge.active{display:flex}',
'.nova-v78-shade{position:fixed;inset:0;background:#082d416b;z-index:260;display:none}',
'.nova-v78-shade.visible{display:block}',
'.nova-v78-drawer{position:fixed;top:0;right:0;bottom:0;width:min(470px,100vw);',
'background:#f8fbfd;z-index:261;box-shadow:-16px 0 55px #0e384650;display:none;',
'flex-direction:column;color:#1e475e;font-family:Inter,system-ui,Arial,sans-serif}',
'.nova-v78-drawer.visible{display:flex}',
'.nova-v78-drawer-head{padding:18px 20px;background:linear-gradient(135deg,#194e70,#207e98);',
'display:flex;align-items:center;justify-content:space-between;gap:14px;color:white}',
'.nova-v78-drawer-head h2{font-size:1.18rem;margin:0}',
'.nova-v78-drawer-head small{font-size:.73rem;color:#d9f0f7}',
'.nova-v78-x{width:36px;height:36px;border:1px solid #ffffff80;background:#ffffff1b;',
'border-radius:10px;color:white;font-size:23px;cursor:pointer;flex:none}',
'.nova-v78-scroll{flex:1;overflow-y:auto;padding:17px}',
'.nova-v78-tools{display:flex;gap:9px;margin:0 0 14px;flex-wrap:wrap}',
'.nova-v78-tools button{border-radius:10px;border:1px solid #cae0e8;background:white;',
'color:#2a607b;padding:9px 12px;font:750 .78rem system-ui;cursor:pointer}',
'.nova-v78-tools button:disabled{opacity:.55;cursor:default}',
'.nova-v78-alert{display:flex;gap:12px;align-items:flex-start;border:1px solid #dce9ee;',
'background:white;border-radius:14px;padding:13px;margin:0 0 10px}',
'.nova-v78-alert.warn{border-left:4px solid #e3a434}',
'.nova-v78-alert.info{border-left:4px solid #2f94b8}',
'.nova-v78-alert.ok{border-left:4px solid #37a47c}',
'.nova-v78-alert-icon{font-size:21px;line-height:1.2}',
'.nova-v78-alert-copy{min-width:0;flex:1}',
'.nova-v78-alert-copy strong{font-size:.86rem;display:block;overflow-wrap:anywhere}',
'.nova-v78-alert-copy p{font-size:.78rem;color:#5d7684;line-height:1.55;margin:5px 0 0;overflow-wrap:anywhere}',
'.nova-v78-alert-copy small{font-size:.7rem;color:#7b919e}',
'.nova-v78-empty{border:1px dashed #bfd8e4;border-radius:14px;padding:27px 17px;',
'text-align:center;color:#567689;background:white;line-height:1.5;font-size:.85rem}',
'.nova-v78-note{font-size:.75rem;line-height:1.5;color:#668292;',
'padding:11px 13px;border-radius:11px;background:#edf7fb;margin-bottom:14px}',
'.nova-v78-cal-top{display:flex;gap:9px;align-items:center;justify-content:space-between;margin:7px 0 15px}',
'.nova-v78-cal-top strong{font-size:1.1rem;text-transform:capitalize}',
'.nova-v78-cal-top button{background:white;border:1px solid #cbe0e7;border-radius:10px;',
'height:36px;width:36px;cursor:pointer;font-size:21px;color:#2b5f79}',
'.nova-v78-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}',
'.nova-v78-dayname{text-align:center;color:#7b93a1;font-size:.68rem;padding:7px 0}',
'.nova-v78-day{min-height:59px;border:1px solid #dfebf0;border-radius:11px;',
'background:#fff;color:#345c70;text-align:left;padding:8px 5px;cursor:pointer;',
'display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:.8rem}',
'.nova-v78-day:hover,.nova-v78-day:focus-visible{border-color:#2791ad;background:#eef9fc}',
'.nova-v78-day[aria-pressed="true"]{border-color:#1d8eae;box-shadow:inset 0 0 0 1px #1d8eae;',
'background:#e8f8fc;color:#175a79}',
'.nova-v78-day.today{background:#f0faf5}',
'.nova-v78-dot{background:#e5f1f8;border-radius:8px;color:#276381;',
'font-weight:800;font-size:.66rem;padding:3px 6px}',
'.nova-v78-spacer{min-height:59px}',
'.nova-v78-agenda{margin-top:18px}',
'.nova-v78-agenda h3{font-size:.93rem;margin:0 0 10px}',
'.nova-v78-event{background:white;border:1px solid #dce9ef;border-radius:12px;',
'padding:11px 12px;margin:0 0 8px}',
'.nova-v78-event strong{font-size:.83rem}',
'.nova-v78-event p{margin:6px 0 0;font-size:.76rem;color:#597585;line-height:1.4}',
'@media(max-width:580px){.nova-v78-drawer{width:100vw}',
'.nova-v78-scroll{padding:14px}.nova-v78-drawer-head{padding:14px 15px}',
'.nova-v78-day{min-height:53px;padding:6px 4px}',
'.nova-v78-spacer{min-height:53px}.nova-v78-cal-grid{gap:4px}',
'#appView .topright .nova-v78-headerbtn{height:39px;min-width:39px}}'
].join('');
document.head.append(css);

function makeBtn(id,label,icon){
 const b=document.createElement('button');b.type='button';b.id=id;
 b.className='nova-v78-headerbtn';b.title=label;b.setAttribute('aria-label',label);
 b.textContent=icon;return b;
}
const bell=makeBtn('novaNoticeButton','Centro de notificaciones','🔔');
const badge=document.createElement('span');badge.id='novaNoticeCount';badge.className='nova-v78-badge';
bell.append(badge);top.insertBefore(bell,top.firstChild);
const calendarBtn=makeBtn('novaCalendarButton','Agenda médica interactiva','📅');
bell.after(calendarBtn);
const shade=document.createElement('div');shade.className='nova-v78-shade';
const drawer=document.createElement('aside');drawer.className='nova-v78-drawer';
drawer.id='novaV78Drawer';drawer.setAttribute('role','dialog');
drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','Herramientas Nova Salud');
drawer.innerHTML='<div class="nova-v78-drawer-head"><div><h2 id="novaV78Title">Avisos</h2><small id="novaV78Sub">Nova Salud · Centro de trabajo</small></div><button class="nova-v78-x" type="button" aria-label="Cerrar panel">×</button></div><div class="nova-v78-scroll" id="novaV78Content"></div>';
document.body.append(shade,drawer);
const main=drawer.querySelector('#novaV78Content'),title=drawer.querySelector('#novaV78Title'),sub=drawer.querySelector('#novaV78Sub');
const bactive=()=>api()&&!!role()&&!app.classList.contains('hidden');
function close(){
 shade.classList.remove('visible');drawer.classList.remove('visible');
 view=null;fetchId++;
 document.body.classList.remove('nova-v78-no-scroll');
}
function open(mode){
 if(!bactive())return;
 if(mode==='agenda'&&!allowedCalendar.has(role()))return;
 view=mode;shade.classList.add('visible');drawer.classList.add('visible');
 title.textContent=mode==='agenda'?'Agenda médica':'Centro de notificaciones';
 sub.textContent=mode==='agenda'?'Visualización de citas autorizadas':'Avisos internos · Sin envío a WhatsApp';
 if(mode==='agenda'){calendarY=Number(today.slice(0,4));calendarM=Number(today.slice(5,7));calendarDate=today;loadAgenda()}
 else{renderAlerts();refreshAlerts(true)}
 drawer.querySelector('.nova-v78-x').focus();
}
function updateVisibility(){
 const active=!!role()&&!app.classList.contains('hidden');
 bell.hidden=!active;
 calendarBtn.hidden=!active||!allowedCalendar.has(role());
 if(!active){close();badge.classList.remove('active');latestAlerts=[];lastSignature='';lastRole=null}
}
function alertItem(level,icon,heading,msg,date=''){
 return {level,icon,heading:String(heading||''),msg:String(msg||''),date:String(date||'')};
}
function setBadge(n){
 const c=Math.min(Math.max(n,0),99);
 badge.classList.toggle('active',c>0);
 badge.textContent=c>=99?'99+':String(c);
 bell.setAttribute('aria-label',c+' avisos · Centro de notificaciones');
}
function infoMessage(txt){
 const box=document.createElement('div');box.className='nova-v78-empty';box.textContent=txt;main.append(box);
}
function renderAlerts(){
 if(view!=='avisos')return;
 main.replaceChildren();
 const tools=document.createElement('div');tools.className='nova-v78-tools';
 const refresh=document.createElement('button');refresh.type='button';refresh.textContent='↻ Actualizar avisos';
 refresh.onclick=()=>refreshAlerts(true);
 tools.append(refresh);
 if(allowedStock.has(role())){
  const goInv=document.createElement('button');goInv.textContent='📦 Abrir inventario';
  goInv.onclick=()=>{close();if(typeof go==='function')go('inventory')};tools.append(goInv);
 }
 main.append(tools);
 const note=document.createElement('div');note.className='nova-v78-note';
 note.textContent='Los avisos se consultan durante tu sesión y se actualizan periódicamente mientras usas la web. No son notificaciones push ni mensajes de WhatsApp.';
 main.append(note);
 if(!latestAlerts.length){infoMessage('Por ahora no se encontraron avisos pendientes, o aún no hay datos disponibles.');return}
 latestAlerts.slice(0,65).forEach(x=>{
  const el=document.createElement('article');el.className='nova-v78-alert '+x.level;
  const icon=document.createElement('span');icon.className='nova-v78-alert-icon';icon.textContent=x.icon;
  const copy=document.createElement('div');copy.className='nova-v78-alert-copy';
  const heading=document.createElement('strong');heading.textContent=x.heading;
  const p=document.createElement('p');p.textContent=x.msg;copy.append(heading,p);
  if(x.date){const time=document.createElement('small');time.textContent=x.date;copy.append(time)}
  el.append(icon,copy);main.append(el);
 });
}
async function refreshAlerts(forced=false){
 if(!bactive()||busy)return;
 const r=role();
 if(!forced && document.hidden)return;
 busy=true;const token=++fetchId;let rows=[];
 try{
  if(r==='patient'){
   const list=await api().patientNotifications();
   if(token!==fetchId||role()!==r)return;
   rows=list.filter(x=>!x.leida).slice(0,35).map(x=>alertItem(
    x.tipo==='ERROR'?'warn':x.tipo==='OK'?'ok':'info','🔔',x.titulo||'Notificación',
    x.mensaje||'Consulta tu portal.',String(x.fecha_hora||'').replace('T',' ').slice(0,16)));
  }
  else if(allowedStock.has(r)){
   const branch=r==='almacen'?String(user()?.branch||''):'';
   if(r==='almacen'&&!branch)throw Error('Sede de almacén no identificada');
   const stock=await api().inventoryStock({branch,limit:1200});
   if(token!==fetchId||role()!==r)return;
   const problems=stock.filter(x=>['CRITICO','AGOTADO'].includes(String(x.stock_status||'').toUpperCase()));
   const expiry=stock.filter(x=>['POR_VENCER','VENCIDO'].includes(String(x.expiry_status||'').toUpperCase()));
   rows=[...problems.slice(0,30).map(x=>alertItem('warn','📦','Stock '+String(x.stock_status||'crítico').toLowerCase(),
      String(x.product||'Producto')+' · '+String(x.branch||branch||'Sede')+' · '+String(x.quantity??0)+' unidades')),
    ...expiry.slice(0,25).map(x=>alertItem('warn','⏳','Revisar vencimiento',
      String(x.product||'Producto')+' · '+String(x.expiry_status||'').replaceAll('_',' ')+' · '+String(x.expiry||'Sin fecha'))) ];
   if(problems.length+expiry.length>rows.length)
     rows.push(alertItem('info','📄','Más avisos pendientes','Abre Inventario para consultar todos los registros con filtros.'));
  } else if(allowedStaffCalendar.has(r)){
   // Sin mirar datos de otros roles: la RPC conserva el filtro del usuario.
   const from=today,to=new Date(Date.parse(from+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
   const list=await api().staffAppointments({branch:r==='gerencia'?'':String(user()?.branch||''),from,to,limit:150});
   if(token!==fetchId||role()!==r)return;
   const upcoming=list.filter(x=>['PROGRAMADA','CONFIRMADA'].includes(String(x.status||'').toUpperCase()));
   rows=upcoming.length?[alertItem('info','📅','Agenda próxima',
     upcoming.length+' citas programadas o confirmadas en los próximos siete días. Abre la agenda para ver los detalles.')]:[];
  }
 }catch(_e){
   // Sin datos sintéticos ni avisos falsos si el backend no responde.
   if(token===fetchId&&view==='avisos'){rows=[alertItem('info','ℹ️','Avisos no disponibles',
     'No fue posible consultar el servicio con esta sesión. Revisa tu conexión o permisos de Supabase.')];}
 }
 finally{busy=false}
 if(token!==fetchId||role()!==r)return;
 latestAlerts=rows;setBadge(rows.filter(x=>x.level==='warn').length+
   (r==='patient'?rows.filter(x=>x.level!=='warn').length:0));
 if(view==='avisos')renderAlerts();
 lastRole=r;
}
function ym(d){return new Date(Date.UTC(calendarY,calendarM-1,1)).toLocaleDateString('es-PE',{year:'numeric',month:'long',timeZone:'UTC'})}
function eventDate(e){return normalizeDate(e.fecha||e.date)}
function eventTime(e){return fmtTime(e.hora||e.time)}
function eventStatus(e){return String(e.status||e.estado||'Programada')}
function renderCalendar(){
 if(view!=='agenda')return;
 main.replaceChildren();
 const hint=document.createElement('p');hint.className='nova-v78-note';
 hint.textContent='Agenda visual de solo lectura, basada en los registros autorizados de Supabase. Para solicitar o modificar citas, usa el módulo de citas.';
 main.append(hint);
 const topbar=document.createElement('div');topbar.className='nova-v78-cal-top';
 const prev=document.createElement('button');prev.textContent='‹';prev.title='Mes anterior';
 const next=document.createElement('button');next.textContent='›';next.title='Mes siguiente';
 const month=document.createElement('strong');month.textContent=ym();
 const move=step=>{const d=new Date(Date.UTC(calendarY,calendarM-1+step,1));
  calendarY=d.getUTCFullYear();calendarM=d.getUTCMonth()+1;
  calendarDate=isoMonth(calendarY,calendarM)+'-01';loadAgenda()};
 prev.onclick=()=>move(-1);next.onclick=()=>move(1);
 topbar.append(prev,month,next);main.append(topbar);
 const grid=document.createElement('div');grid.className='nova-v78-cal-grid';
 for(let i=0;i<7;i++){
  const day=document.createElement('div');day.className='nova-v78-dayname';day.textContent=labels[i];grid.append(day);
 }
 const offset=new Date(Date.UTC(calendarY,calendarM-1,1)).getUTCDay();
 for(let i=0;i<offset;i++){const e=document.createElement('div');e.className='nova-v78-spacer';grid.append(e)}
 for(let day=1;day<=maxDate(calendarY,calendarM);day++){
  const key=isoMonth(calendarY,calendarM)+'-'+String(day).padStart(2,'0');
  const number=calendarRows.filter(x=>eventDate(x)===key).length;
  const b=document.createElement('button');b.type='button';
  b.className='nova-v78-day'+(key===today?' today':'');b.setAttribute('aria-pressed',String(key===calendarDate));
  b.setAttribute('aria-label',key+': '+number+' citas');
  const n=document.createElement('span');n.textContent=String(day);b.append(n);
  if(number){const dot=document.createElement('span');dot.className='nova-v78-dot';dot.textContent=number+' cita'+(number===1?'':'s');b.append(dot)}
  b.onclick=()=>{calendarDate=key;renderCalendar()};grid.append(b);
 }
 main.append(grid);
 const box=document.createElement('div');box.className='nova-v78-agenda';
 const head=document.createElement('h3');head.textContent='📅 '+calendarDate+' · Detalle del día';
 box.append(head);
 const events=calendarRows.filter(x=>eventDate(x)===calendarDate).sort((a,b)=>eventTime(a).localeCompare(eventTime(b)));
 if(!events.length){const p=document.createElement('div');p.className='nova-v78-empty';p.textContent='Sin citas registradas para este día.';box.append(p)}
 else events.forEach(e=>{
  const card=document.createElement('article');card.className='nova-v78-event';
  const strong=document.createElement('strong');strong.textContent=eventTime(e)+' · '+String(e.specialty||e.doctor||'Cita médica');
  const summary=document.createElement('p');
  // Mostramos solo datos ya autorizados por el RPC para este rol.
  summary.textContent=(role()==='patient'?String(e.doctor||'Médico'):String(e.patient||e.doctor||'Agenda'))+
     ' · '+String(e.branch||'Sede')+' · '+eventStatus(e);
  card.append(strong,summary);box.append(card);
 });
 const tools=document.createElement('div');tools.className='nova-v78-tools';
 const action=document.createElement('button');action.textContent='Abrir módulo de citas';
 action.onclick=()=>{const r=role();close();if(typeof go==='function')go(r==='patient'?'patient-appointments':'appointments')};
 tools.append(action);box.append(tools);main.append(box);
}
async function loadAgenda(){
 if(view!=='agenda'||!bactive())return;
 const r=role(),token=++fetchId,first=isoMonth(calendarY,calendarM)+'-01',last=isoMonth(calendarY,calendarM)+'-'+String(maxDate(calendarY,calendarM)).padStart(2,'0');
 main.replaceChildren();
 const load=document.createElement('div');load.className='nova-v78-empty';load.textContent='Consultando agenda…';main.append(load);
 try{
  if(r==='patient'){calendarRows=await api().patientAppointments()}
  else if(allowedStaffCalendar.has(r)){
   calendarRows=await api().staffAppointments({branch:r==='gerencia'?'':String(user()?.branch||''),from:first,to:last,limit:500});
  }
  else calendarRows=[];
  if(token!==fetchId||view!=='agenda'||role()!==r)return;
  if(!Array.isArray(calendarRows))calendarRows=[];
  renderCalendar();
 }catch(_e){
  if(token!==fetchId||view!=='agenda')return;
  main.replaceChildren();infoMessage('No se pudo consultar la agenda desde Supabase. Comprueba tu conexión y los permisos de esta cuenta.');
 }
}
shade.addEventListener('click',close);
drawer.querySelector('.nova-v78-x').addEventListener('click',close);
bell.addEventListener('click',()=>open('avisos'));
calendarBtn.addEventListener('click',()=>open('agenda'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&view)close()});
setInterval(()=>{
 updateVisibility();
 if(!bactive())return;
 if(lastRole!==role()){lastRole=role();latestAlerts=[];lastSignature='';setBadge(0)}
 // Cada dos minutos como máximo, sin solicitar permisos de notificaciones al navegador.
 refreshAlerts();
},120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateVisibility();if(bactive())refreshAlerts()}});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="logout"]')){close();latestAlerts=[];setBadge(0);lastRole=null}
},true);
updateVisibility();
// Se comprueba periódicamente si hay sesión; la primera lectura ocurre cuando se abre el panel.
window.NovaV78Tools={openAgenda:()=>open('agenda'),openNotices:()=>open('avisos'),refresh:()=>refreshAlerts(true)};
})();
