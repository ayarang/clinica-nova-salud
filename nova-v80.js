/* Nova Salud v8.0 — Turnos, solicitudes de insumos y recorrido de exposición.
   Operaciones reales ÚNICAMENTE por Supabase RPC y roles autorizados.
   Sin credenciales, sin bypass de RLS, sin simulaciones presentadas como datos reales. */
(function(){
'use strict';
document.title='Clínica Nova Salud · v8.0';
if(document.getElementById('novaV80Drawer'))return;
const app=document.getElementById('appView'),publicPage=document.getElementById('publicView');
if(!app||!publicPage)return;
const role=()=>{try{return state?.role||null}catch(_){return null}};
const api=()=>window.NovaAPI?.enabled&&window.NovaAPI.client?window.NovaAPI:null;
const getStaffBranch=()=>{try{return state?.user?.branch||''}catch(_){return ''}};
const canTurn=new Set(['patient','recepcion','medico','enfermeria','gerencia']);
const canSupplies=new Set(['medico','enfermeria','almacen','gerencia']);
const canRegister=new Set(['recepcion','gerencia']);
const canUpdateTurn=new Set(['recepcion','medico','gerencia']);
const canCreateRequest=new Set(['medico','enfermeria','gerencia']);
const canApproveRequest=new Set(['almacen','gerencia']);
let mode=null,req=0;
const guideSteps=[
 {title:'1. El paciente reserva una cita',icon:'👤',role:'Paciente',
  detail:'El paciente ingresa al portal, selecciona sede, especialista y fecha. La reserva real se registra en Supabase con el usuario autenticado.',
  screen:'📅 Cita demostrativa: NS-DEMO-015 · Chorrillos · 09:30 · Solicitada'},
 {title:'2. Recepción registra la llegada',icon:'🎫',role:'Recepción',
  detail:'Después de confirmar la cita, recepción identifica al paciente y registra su llegada. Se genera un turno para esa cita. La vista real requiere la migración SQL 49.',
  screen:'🎫 Turno ficticio: A-0015 · EN ESPERA'},
 {title:'3. El médico inicia la atención',icon:'🩺',role:'Médico',
  detail:'El médico ve solamente los turnos asignados conforme a sus permisos. Se cambia el estado del turno de En espera a En atención.',
  screen:'🩺 Turno ficticio: A-0015 · EN ATENCIÓN'},
 {title:'4. Enfermería solicita un insumo',icon:'📋',role:'Enfermería',
  detail:'El personal registra un pedido con producto y cantidad. Los pedidos reales quedan pendientes para el Almacén de la sede y no contienen datos médicos.',
  screen:'📦 Solicitud ficticia: Guantes de examen · 3 cajas · PENDIENTE'},
 {title:'5. Almacén revisa y registra la entrega',icon:'📦',role:'Almacén',
  detail:'Almacén puede aprobar o rechazar la solicitud y marcarla entregada. La salida de inventario debe registrarse separadamente para descontar el stock.',
  screen:'✅ Solicitud ficticia: APROBADA → ENTREGADA; salida de stock aún por registrar'},
 {title:'6. El paciente consulta su turno',icon:'📱',role:'Paciente',
  detail:'Desde el portal, el paciente puede consultar el estado de su turno del día. No se exponen nombres ni datos personales de otros pacientes.',
  screen:'✅ Turno ficticio: A-0015 · FINALIZADO'}
];
const css=document.createElement('style');css.id='novaV80Styles';
css.textContent=[
'.nova-v80-action{display:inline-flex;gap:6px;align-items:center;border:1px solid #c6e2ed;',
'background:#eff8fb;border-radius:10px;color:#225a7a;padding:9px 11px;font:750 12px system-ui;',
'cursor:pointer;white-space:nowrap;min-height:39px}',
'.nova-v80-action:hover{background:#ddf2f9}',
'.nova-v80-action[hidden]{display:none!important}',
'.nova-v80-scrim{position:fixed;inset:0;background:rgba(13,40,59,.64);z-index:4400;display:none}',
'.nova-v80-scrim.open{display:block}',
'.nova-v80-drawer{position:fixed;z-index:4401;top:0;right:0;bottom:0;width:min(585px,100vw);',
'background:#f7fafc;color:#193e54;box-shadow:-16px 0 60px #10364f4f;display:none;',
'flex-direction:column;font:14px system-ui}',
'.nova-v80-drawer.open{display:flex}',
'.nova-v80-head{background:linear-gradient(135deg,#153e60,#1e7c97);color:white;',
'padding:17px 19px;display:flex;gap:10px;align-items:center;justify-content:space-between}',
'.nova-v80-head h2{font-size:1.1rem;margin:0}.nova-v80-head small{font-size:11px;opacity:.86}',
'.nova-v80-exit{border:1px solid #ffffff64;background:#ffffff22;border-radius:9px;',
'color:white;font-size:22px;width:34px;height:34px;cursor:pointer;flex:none}',
'.nova-v80-content{flex:1;overflow:auto;padding:18px;overscroll-behavior:contain}',
'.nova-v80-notice{background:#eaf5fa;border:1px solid #cde5ee;padding:11px 13px;',
'border-radius:11px;color:#396b81;font-size:12px;line-height:1.5;margin-bottom:15px}',
'.nova-v80-notice.warn{background:#fff7eb;border-color:#f0d8ad;color:#875b19}',
'.nova-v80-controls{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:15px 0}',
'.nova-v80-btn{border:1px solid #bfd9e6;border-radius:10px;background:white;',
'padding:9px 13px;color:#28607a;font:750 12px system-ui;cursor:pointer;min-height:39px}',
'.nova-v80-btn.primary{background:#217c9d;border-color:#217c9d;color:white}',
'.nova-v80-btn:disabled{opacity:.54;cursor:not-allowed}',
'.nova-v80-form{display:grid;gap:10px;background:white;border:1px solid #d9e7ed;',
'padding:15px;border-radius:15px;margin:14px 0}',
'.nova-v80-form h3{font-size:.95rem;margin:0 0 3px}',
'.nova-v80-form input,.nova-v80-form textarea{width:100%;max-width:100%;font-size:14px;',
'min-height:41px;padding:9px 10px}',
'.nova-v80-form textarea{min-height:70px}',
'.nova-v80-list{display:grid;gap:10px;margin:13px 0}',
'.nova-v80-card{background:white;border:1px solid #dae8ee;border-radius:13px;padding:13px;',
'overflow-wrap:anywhere}',
'.nova-v80-card h3{margin:0 0 7px;font-size:.94rem;color:#204c63}',
'.nova-v80-card p{margin:4px 0;color:#587486;font-size:.8rem;line-height:1.5}',
'.nova-v80-card .nova-v80-controls{margin:9px 0 0}',
'.nova-v80-pill{display:inline-flex;padding:5px 9px;background:#e5f4f9;color:#276980;',
'font-size:11px;font-weight:800;border-radius:999px}',
'.nova-v80-empty{background:white;border:1px dashed #bed5de;border-radius:13px;',
'padding:22px;text-align:center;color:#718b98;line-height:1.6}',
'.nova-v80-progress{background:#d7eaf3;border-radius:99px;height:9px;overflow:hidden;margin:12px 0 18px}',
'.nova-v80-progress span{display:block;background:linear-gradient(90deg,#1e84ac,#27a98d);',
'height:100%;transition:width .2s}',
'.nova-v80-showcase{background:white;border:1px solid #dce9ef;border-radius:17px;',
'padding:23px;margin:13px 0}',
'.nova-v80-showcase .icon{font-size:39px;display:block;margin-bottom:10px}',
'.nova-v80-showcase h3{margin:7px 0 11px;font-size:1.22rem}',
'.nova-v80-showcase p{color:#587585;line-height:1.7}',
'.nova-v80-mock{border-left:4px solid #22a784;background:#f1faf6;border-radius:7px;',
'padding:13px 14px;font-size:.85rem;color:#2d6657}',
'.nova-v80-stepcount{font-weight:800;font-size:12px;color:#227c91}',
'.nova-v80-hero{border-color:#ffffff70;background:#ffffff24;color:white}',
'.nova-v80-hero:hover{background:#ffffff3f}',
'@media(max-width:610px){.nova-v80-content{padding:13px}.nova-v80-head{padding:13px 15px}',
'.nova-v80-showcase{padding:17px}.nova-v80-action{padding:8px 9px;font-size:11px}',
'#appView .topright .nova-v80-action{height:39px;min-height:39px;padding:8px;min-width:39px;justify-content:center}',
'.nova-v80-label{display:none!important}',
'#appView .topright .nova-v80-expo-head{display:none!important}}'
].join('');
document.head.append(css);
const shade=document.createElement('div');shade.className='nova-v80-scrim';
const panel=document.createElement('section');panel.className='nova-v80-drawer';panel.id='novaV80Drawer';
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Nova Salud v8');
panel.innerHTML='<div class="nova-v80-head"><div><h2 id="novaV80Title">Nova Salud</h2><small id="novaV80Subtitle">Gestión segura por usuario</small></div><button class="nova-v80-exit" aria-label="Cerrar panel" type="button">×</button></div><div id="novaV80Content" class="nova-v80-content"></div>';
document.body.append(shade,panel);
const body=panel.querySelector('#novaV80Content');
const header=panel.querySelector('#novaV80Title');
const subtitle=panel.querySelector('#novaV80Subtitle');
function element(tag,cls,txt){
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=String(txt);return el;
}
function paragraph(parent,txt,cls=''){const p=element('p',cls,txt);parent.append(p);return p}
function notice(txt,warn=false){const n=element('div','nova-v80-notice'+(warn?' warn':''),txt);body.append(n)}
function button(txt,cb,primary=false){
 const b=element('button','nova-v80-btn'+(primary?' primary':''),txt);b.type='button';b.addEventListener('click',cb);return b;
}
function controls(...els){const row=element('div','nova-v80-controls');row.append(...els);return row}
function empty(txt){body.append(element('div','nova-v80-empty',txt))}
function load(){body.replaceChildren();empty('Consultando Supabase…')}
function fail(e){
 body.replaceChildren();
 notice('No se pudo consultar o actualizar el módulo. Si aparece un error de función inexistente, falta ejecutar SQL 49 en Supabase. Ningún dato fue inventado.',true);
 const msg=String(e?.message||'Error de conexión o permisos');
 paragraph(body,msg.slice(0,200));
}
function dismiss(){
 req++;mode=null;shade.classList.remove('open');panel.classList.remove('open');
}
function open(name){
 if(name!=='expo'&&(!role()||app.classList.contains('hidden')||!api()))return;
 if(name==='turnos'&&!canTurn.has(role()))return;
 if(name==='insumos'&&!canSupplies.has(role()))return;
 mode=name;req++;shade.classList.add('open');panel.classList.add('open');
 header.textContent=name==='expo'?'🎓 Modo exposición':name==='turnos'?'🎫 Turnos de atención':'📦 Solicitudes a almacén';
 subtitle.textContent=name==='expo'?'Escenario ficticio · Sin afectar registros':'Datos autorizados en PostgreSQL';
 if(name==='expo')showExpo(0);
 else if(name==='turnos')showTurnos();
 else showInsumos();
 panel.querySelector('.nova-v80-exit').focus();
}
shade.onclick=dismiss;panel.querySelector('.nova-v80-exit').onclick=dismiss;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode)dismiss()});
function rpc(name,args){return api().client.rpc(name,args||{}).then(({data,error})=>{if(error)throw error;return data})}
function card(title,details,status){
 const el=element('article','nova-v80-card');
 el.append(element('h3','',title));
 if(status)el.append(element('span','nova-v80-pill',status));
 details.forEach(x=>paragraph(el,x));
 return el;
}
function showExpo(i){
 body.replaceChildren();
 notice('Recorrido ilustrativo para la exposición. Todos los códigos, estados y datos son ficticios. No se crean pacientes, citas ni movimientos.');
 const step=guideSteps[i],count=element('div','nova-v80-stepcount','Paso '+(i+1)+' de '+guideSteps.length+' · '+step.role);
 const progress=element('div','nova-v80-progress');
 const indicator=element('span');indicator.style.width=((i+1)/guideSteps.length*100)+'%';
 progress.append(indicator);body.append(count,progress);
 const scene=element('div','nova-v80-showcase');
 scene.append(element('span','icon',step.icon),element('h3','',step.title));
 paragraph(scene,step.detail);
 scene.append(element('div','nova-v80-mock',step.screen));body.append(scene);
 body.append(controls(
  button('← Anterior',()=>showExpo(Math.max(0,i-1))),
  button(i===guideSteps.length-1?'↻ Repetir recorrido':'Siguiente →',
    ()=>showExpo(i===guideSteps.length-1?0:i+1),true)
 ));
 notice('Para probar operaciones reales, inicia sesión con perfiles ficticios y ejecuta previamente SQL 49.');
}
function formField(form,labelName,type,name,placeholder='',min='',max=''){
 const label=element('label','',labelName);
 const input=element(type==='textarea'?'textarea':'input');
 if(type!=='textarea')input.type=type;
 input.name=name;input.required=name!=='nota';input.placeholder=placeholder;
 if(min!=='')input.min=min;if(max!=='')input.max=max;
 if(name==='codigo')input.maxLength=55;
 if(name==='producto')input.maxLength=120;
 if(name==='nota')input.maxLength=350;
 label.append(input);form.append(label);return input;
}
function displayRows(container,rows,render){
 const grid=element('div','nova-v80-list');
 if(!rows.length){grid.append(element('div','nova-v80-empty','Todavía no hay registros accesibles para este perfil.'))}
 rows.forEach(item=>grid.append(render(item)));
 container.append(grid);
}
async function showTurnos(){
 if(mode!=='turnos')return;const token=++req;load();
 try{
  const data=await rpc('api_v80_turnos_listar');
  if(token!==req||mode!=='turnos')return;
  body.replaceChildren();
  notice('Turnos de citas de hoy, limitados por tu perfil y sede. No se publican datos personales de otros pacientes.');
  const r=role();
  if(canRegister.has(r)){
   const form=element('form','nova-v80-form');
   form.append(element('h3','', 'Registrar llegada del paciente'));
   const code=formField(form,'Código de cita confirmado','text','codigo','Ej.: código de cita del sistema');
   const submit=element('button','nova-v80-btn primary','Crear turno');
   submit.type='submit';form.append(submit);
   form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!code.value.trim())return;
    submit.disabled=true;
    try{await rpc('api_v80_turno_registrar',{p_codigo_cita:code.value.trim()});if(mode==='turnos')showTurnos()}
    catch(e){if(mode==='turnos')fail(e)}finally{submit.disabled=false}
   });
   body.append(form);
  }
  body.append(controls(button('↻ Actualizar turnos',showTurnos)));
  displayRows(body,Array.isArray(data)?data:[],t=>{
   const el=card(String(t.codigo||'Turno'),[
    'Cita: '+String(t.cita||'—'),
    'Fecha: '+String(t.fecha||'—')+' · Hora: '+String(t.hora||'—').slice(0,5),
    'Sede: '+String(t.sede||'—')],String(t.estado||'—').replaceAll('_',' '));
   if(canUpdateTurn.has(r)){
    const options=t.estado==='EN_ESPERA'?
     [{state:'EN_ATENCION',label:'Iniciar atención'},{state:'ANULADO',label:'Anular turno'}]:
     t.estado==='EN_ATENCION'?[{state:'FINALIZADO',label:'Finalizar'}]:[];
    if(options.length){
     const row=element('div','nova-v80-controls');
     options.forEach(o=>row.append(button(o.label,async()=>{
      if(!confirm('¿Cambiar el turno '+String(t.codigo||'')+' a '+o.state.replaceAll('_',' ')+'?'))return;
      try{await rpc('api_v80_turno_estado',{p_id:Number(t.id),p_estado:o.state});if(mode==='turnos')showTurnos()}
      catch(e){if(mode==='turnos')fail(e)}
     },o.state==='EN_ATENCION')));
     el.append(row);
    }
   }
   return el;
  });
 }catch(e){if(token===req&&mode==='turnos')fail(e)}
}
async function showInsumos(){
 if(mode!=='insumos')return;const token=++req;load();
 try{
  const data=await rpc('api_v80_solicitudes_listar');
  if(token!==req||mode!=='insumos')return;
  body.replaceChildren();
  notice('Solicitudes del personal según su rol y sede. Marcar entregada NO descuenta existencias: registra la salida en Inventario por separado.',true);
  const r=role();
  if(canCreateRequest.has(r)){
   const form=element('form','nova-v80-form');
   form.append(element('h3','', 'Nueva solicitud de material'));
   const product=formField(form,'Producto o insumo','text','producto','Ej.: guantes de examen');
   const qty=formField(form,'Cantidad','number','cantidad','1',1,1000);
   const note=formField(form,'Nota administrativa (sin información clínica)','textarea','nota','Uso interno. No incluir datos de pacientes.');
   const submit=element('button','nova-v80-btn primary','Enviar solicitud');
   submit.type='submit';form.append(submit);
   form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(product.value.trim().length<3||Number(qty.value)<1)return;
    submit.disabled=true;
    try{
     await rpc('api_v80_solicitud_crear',{p_producto:product.value.trim(),p_cantidad:Number(qty.value),p_nota:note.value.trim()});
     if(mode==='insumos')showInsumos();
    }catch(e){if(mode==='insumos')fail(e)}finally{submit.disabled=false}
   });
   body.append(form);
  }
  const row=controls(button('↻ Actualizar solicitudes',showInsumos));
  if(['almacen','gerencia'].includes(r))row.append(button('📦 Ir a Inventario',()=>{
    dismiss();if(typeof window.go==='function')window.go('inventory');
  }));
  body.append(row);
  displayRows(body,Array.isArray(data)?data:[],s=>{
   const el=card('#'+String(s.id||'—')+' · '+String(s.producto||'Insumo'),[
    'Cantidad: '+String(s.cantidad||0)+' · Sede: '+String(s.sede||'—'),
    'Fecha: '+String(s.fecha||'').replace('T',' ').slice(0,16),
    s.nota?'Nota: '+String(s.nota):''],String(s.estado||'PENDIENTE'));
   if(canApproveRequest.has(r)){
    const opts=s.estado==='PENDIENTE'?[['APROBADA','Aprobar'],['RECHAZADA','Rechazar']]:
     s.estado==='APROBADA'?[['ENTREGADA','Marcar entrega']]:[];
    if(opts.length){
     const btnrow=element('div','nova-v80-controls');
     opts.forEach(([status,label])=>btnrow.append(button(label,async()=>{
      if(!confirm('¿Cambiar la solicitud #'+s.id+' a '+status+'? La entrega NO mueve inventario automáticamente.'))return;
      try{await rpc('api_v80_solicitud_estado',{p_id:Number(s.id),p_estado:status});if(mode==='insumos')showInsumos()}
      catch(e){if(mode==='insumos')fail(e)}
     },status==='APROBADA')));
     el.append(btnrow);
    }
   }
   return el;
  });
 }catch(e){if(token===req&&mode==='insumos')fail(e)}
}
const top=app.querySelector('.topright');
const headerButtons=[];
function addHeader(name,icon,text,roles){
 const b=element('button','nova-v80-action');
 b.append(element('span','nova-v80-icon',icon),element('span','nova-v80-label',text));
 if(name==='expo')b.classList.add('nova-v80-expo-head');
 b.type='button';b.title=text;b.setAttribute('aria-label',text);
 top.insertBefore(b,top.firstChild);
 b.onclick=()=>open(name);
 headerButtons.push({b,roles});
 return b;
}
addHeader('expo','🎓','Modo exposición',null);
addHeader('insumos','📦','Solicitudes',canSupplies);
addHeader('turnos','🎫','Turnos',canTurn);
const hero=publicPage.querySelector('.heroactions');
if(hero){
 const expo=element('button','btn heroGhost nova-v80-hero','🎓 Ver recorrido');
 expo.type='button';expo.onclick=()=>open('expo');hero.append(expo);
}
function sync(){
 const r=role(),logged=!!r&&!app.classList.contains('hidden');
 headerButtons.forEach(({b,roles})=>b.hidden=!logged||(roles&&!roles.has(r)));
 if(mode!=='expo'&&mode&&!logged)dismiss();
 if(mode==='turnos'&&!canTurn.has(r))dismiss();
 if(mode==='insumos'&&!canSupplies.has(r))dismiss();
}
sync();
new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="logout"]'))dismiss();
},true);
window.NovaV80={openTurnos:()=>open('turnos'),openSolicitudes:()=>open('insumos'),openExposicion:()=>open('expo')};
})();
