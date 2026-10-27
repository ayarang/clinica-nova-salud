/* ===== inline-6 · extracted from index.html ===== */
(function(){
  function badge(text,cls,title=''){
    let el=document.getElementById('novaDbStatus');
    if(!el){el=document.createElement('div');el.id='novaDbStatus';document.body.appendChild(el)}
    el.className=cls;el.textContent=text;el.title=title;
  }
  async function connectNova(){
    if(!window.NovaAPI){badge('Demo local · API no cargada','demo');return}
    badge('Comprobando Supabase…','demo');
    try{
      const r=await window.NovaAPI.init();
      if(r?.ok){
        window.NOVA_REMOTE_SEDES=r.sedes||[];
        badge(`Supabase conectado · ${window.NOVA_REMOTE_SEDES.length} sedes · Auth listo`,'ok','PostgreSQL, Data API y Supabase Auth disponibles. Los módulos se migran de forma progresiva.');
        console.info('[Nova Salud] Supabase conectado',window.NOVA_REMOTE_SEDES);
        document.dispatchEvent(new CustomEvent('nova:remote-ready',{detail:{sedes:window.NOVA_REMOTE_SEDES.length}}));
      }else if(r?.reason==='NO_CONFIG'){
        badge('Demo local · configura Supabase','demo','Edita nova-supabase-config.js con Project URL y Publishable key.');
      }else{
        badge('Supabase sin conexión','err',r?.reason||'Error desconocido');
        console.warn('[Nova Salud] Error Supabase',r);
      }
    }catch(err){badge('Supabase sin conexión','err',err?.message||String(err));console.error(err)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',connectNova,{once:true});
  else connectNova();
})();
;

/* ===== inline-7 · extracted from index.html ===== */
(function(){
  const $q=s=>document.querySelector(s);
  function remoteReady(){return !!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client)}
  function friendlyAuthError(err){
    const m=String(err?.message||err||'Error de autenticación');
    if(/invalid login credentials/i.test(m))return 'Correo o contraseña incorrectos.';
    if(/email not confirmed/i.test(m))return 'Confirma tu correo antes de ingresar.';
    if(/already registered|already been registered|user already registered/i.test(m))return 'Ese correo ya tiene una cuenta.';
    return m;
  }
  function setBusy(form,on,label='Procesando…'){
    const b=form?.querySelector('button[type="submit"],button:not([type])');
    if(!b)return;
    if(on){b.dataset.oldText=b.textContent;b.disabled=true;b.textContent=label}
    else{b.disabled=false;b.textContent=b.dataset.oldText||'Continuar'}
  }
  function mapPatientProfile(p){return {
    id_paciente:p.id_paciente,code:p.code,dni:p.dni,name:p.name,first:p.first,last:p.last,
    phone:p.phone||'',email:p.email||'',birth:p.birth||'',address:p.address||'',district:p.district||'',
    branch:p.branch||'Sin sede',insurance:p.insurance||'Particular',status:p.status||'Pendiente',
    portalStatus:p.portalStatus||'Pendiente',emergencyName:p.emergencyName||'',emergencyPhone:p.emergencyPhone||'',allergies:[]
  }}

  const previousRenderPatientAuth=window.renderPatientAuth;
  window.renderPatientAuth=function(mode){
    previousRenderPatientAuth(mode);
    if(mode==='login'&&remoteReady()){
      const form=$q('#patientLogin');if(!form)return;
      const first=form.querySelector('label');
      if(first)first.innerHTML='Correo electrónico<input name="email" type="email" autocomplete="username" placeholder="tu@correo.com" required>';
      const note=document.createElement('p');note.className='hint';note.textContent='Acceso real protegido con Supabase Auth: correo + contraseña.';
      form.appendChild(note);
    }
  };

  document.addEventListener('submit',async e=>{
    const id=e.target?.id;
    if(!['staffLogin','patientLogin','patientRegister'].includes(id))return;
    // Nunca sustituir Auth real por credenciales demo durante una caída de Supabase.
    if(!remoteReady()){
      if(window.NOVA_SUPABASE?.url&&window.NOVA_SUPABASE?.publishableKey){
        e.preventDefault();e.stopImmediatePropagation();
        showToast('Supabase no está disponible. No se inició sesión ni se guardaron datos.');
      }
      return;
    }
    e.preventDefault();e.stopImmediatePropagation();
    const form=e.target,fd=new FormData(form);
    try{
      if(id==='staffLogin'){
        setBusy(form,true,'Ingresando…');
        const profile=await NovaAPI.signInStaff(String(fd.get('email')||'').trim(),String(fd.get('password')||''));
        showToast('Sesión real iniciada con Supabase Auth');
        openInternal(profile);return;
      }
      if(id==='patientLogin'){
        setBusy(form,true,'Ingresando…');
        const profile=await NovaAPI.signInPatient(String(fd.get('email')||'').trim(),String(fd.get('password')||''));
        showToast('Bienvenido a tu portal');
        patientPortal(mapPatientProfile(profile));return;
      }
      if(id==='patientRegister'){
        setBusy(form,true,'Creando cuenta…');
        const payload={
          email:String(fd.get('email')||'').trim().toLowerCase(),password:String(fd.get('password')||''),
          dni:String(fd.get('dni')||'').trim(),first:String(fd.get('first')||'').trim(),last:String(fd.get('last')||'').trim(),
          birth:String(fd.get('birth')||''),phone:String(fd.get('phone')||''),branch:String(fd.get('branch')||''),
          address:String(fd.get('address')||''),district:String(fd.get('district')||''),insurance:String(fd.get('insurance')||'Particular'),
          policy:String(fd.get('policy')||''),emergencyName:String(fd.get('emergencyName')||''),emergencyPhone:String(fd.get('emergencyPhone')||''),
          allergies:String(fd.get('allergies')||''),marketing:fd.get('marketingConsent')==='on'
        };
        const result=await NovaAPI.signUpPatient(payload);
        if(result.needsEmailConfirmation){
          closeModal();
          modal('<div class="successbox"><div class="big">✓</div><h2>Cuenta creada</h2><p>Supabase creó tu cuenta. Revisa tu correo para confirmar el acceso y luego inicia sesión.</p><p class="hint">PostgreSQL preparó tu ficha, historial, validación y consentimientos.</p></div>',true);
        }else if(result.profile){
          showToast('Cuenta real creada en Supabase');patientPortal(mapPatientProfile(result.profile));
        }else{closeModal();showToast('Cuenta creada. Ya puedes iniciar sesión.');}
      }
    }catch(err){showToast(friendlyAuthError(err));console.error('[Nova Auth]',err)}
    finally{setBusy(form,false)}
  },true);

  const previousLogout=window.logout;
  window.logout=function(){if(remoteReady())NovaAPI.signOut().catch(console.warn);return previousLogout()};

  async function restoreRealSession(){
    if(!remoteReady())return;
    try{
      const ctx=await NovaAPI.restoreContext();if(!ctx)return;
      if(ctx.kind==='staff')openInternal(ctx);
      if(ctx.kind==='patient')patientPortal(mapPatientProfile(ctx));
    }catch(err){console.warn('[Nova Salud] No se pudo restaurar sesión',err)}
  }
  if(remoteReady())queueMicrotask(restoreRealSession);
  else document.addEventListener('nova:remote-ready',restoreRealSession,{once:true});
})();
;

/* ===== nova-v64-pacientes-citas · extracted from index.html ===== */
// Nova Salud v6.4 · Pacientes y citas reales en PostgreSQL/Supabase.
(function(){
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const dbBadge='<span class="badge ok">PostgreSQL real</span>';

  async function renderPatientsRemote(c){
    if(!remoteOk()) return window.__novaLocalRenderPatients?.(c);
    const global=state.role==='gerencia';
    const defaultBranch=global?'Todas las sedes':userBranch();
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="patientSearch" placeholder="Buscar DNI, código o nombre"><select id="patientBranch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="patientStatus"><option value="">Todos los estados</option><option value="ACTIVO">Activo</option><option value="PENDIENTE">Pendiente</option><option value="OBSERVADO">Observado</option><option value="RECHAZADO">Rechazado</option><option value="INACTIVO">Inactivo</option></select></div><div class="right">${dbBadge}${actionAllowed('new-patient')?'<button class="btn btn-primary" data-action="new-patient">+ Registrar paciente</button>':''}</div></div><div class="notice" style="margin-bottom:12px"><b>Identidad global:</b> el DNI es único en toda Nova Salud. La sede mostrada es la sede preferida, no limita dónde puede atenderse.</div><div id="patientsTable">${loading('Consultando pacientes...')}</div>`;
    $('#patientBranch').value=defaultBranch;
    let timer;
    const update=async()=>{
      const box=$('#patientsTable'); box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const rows=await NovaAPI.staffPatients({search:$('#patientSearch').value.trim(),status:$('#patientStatus').value,branch:$('#patientBranch').value,limit:200});
        box.innerHTML=rowTable(['Código','DNI','Paciente','Teléfono','Correo','Sede preferida','Seguro','Estado','Portal'],rows.map(p=>[
          esc(p.code),esc(p.dni),esc(p.name),esc(p.phone||'—'),esc(p.email||'—'),esc(p.branch||'—'),esc(p.insurance||'Particular'),
          `<span class="badge ${String(p.status).toLowerCase()==='activo'?'ok':'warn'}">${esc(p.status)}</span>`,
          `<span class="badge ${String(p.portal_status).toLowerCase()==='activa'?'ok':'warn'}">${esc(p.portal_status||'Sin cuenta')}</span>`
        ]));
        if(!rows.length) box.innerHTML='<div class="notice">No hay pacientes que coincidan con los filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };
    $('#patientSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,300)};
    $('#patientBranch').onchange=update; $('#patientStatus').onchange=update;
    await update();
  }

  async function renderAppointmentsRemote(c){
    if(!remoteOk()) return window.__novaLocalRenderAppointments?.(c);
    const global=state.role==='gerencia';
    const defaultBranch=global?'Todas las sedes':userBranch();
    const apptToday=(()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`})();
    const apptNext7=(()=>{const d=new Date();d.setDate(d.getDate()+7);const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`})();
    c.innerHTML=`<div class="toolbar"><div class="left"><select id="apptBranch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="apptDoctor"><option value="">Todos los médicos</option></select><select id="apptStatus"><option value="">Todos los estados</option><option>Programada</option><option>Confirmada</option><option>Realizada</option><option>Cancelada</option><option value="NO_ASISTIO">No asistió</option></select><label>Desde<input id="apptFrom" type="date" value="${apptToday}"></label><label>Hasta<input id="apptTo" type="date" value="${apptNext7}"></label></div><div class="right">${dbBadge}${actionAllowed('new-appointment')?'<button class="btn btn-primary" data-action="new-appointment">+ Nueva cita</button>':''}</div></div><div class="notice" style="margin-bottom:12px"><b>Agenda:</b> se muestran hoy y los próximos 7 días. Puedes ampliar el rango.</div><div id="apptTable">${loading('Consultando citas...')}</div>`;
    $('#apptBranch').value=defaultBranch;
    const loadDoctors=async()=>{
      const branch=$('#apptBranch').value;
      try{
        const docs=await NovaAPI.activeDoctors(branch==='Todas las sedes'?'':branch);
        const d=$('#apptDoctor');
        d.innerHTML='<option value="">Todos los médicos</option>'+docs.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.specialty||'')}</option>`).join('');
        if(state.role==='medico'){d.value=state.user.staffCode;d.disabled=true}
      }catch(e){console.warn(e)}
    };
    const update=async()=>{
      const box=$('#apptTable');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const rows=await NovaAPI.staffAppointments({branch:$('#apptBranch').value,doctor:state.role==='medico'?state.user.staffCode:$('#apptDoctor').value,status:$('#apptStatus').value,from:$('#apptFrom').value||null,to:$('#apptTo').value||null,limit:1000});
        box.innerHTML=rowTable(['Código','Paciente','DNI','Médico','Sede','Fecha','Hora','Estado','Motivo'],rows.map(a=>[
          esc(a.id),esc(a.patient),esc(a.patient_dni),esc(a.doctor),esc(a.branch),esc(a.fecha),esc(a.hora),
          `<span class="badge ${String(a.status).toLowerCase()==='realizada'?'ok':String(a.status).toLowerCase()==='cancelada'?'danger':'warn'}">${esc(a.status)}</span>`,esc(a.reason||'—')
        ]));
        if(!rows.length) box.innerHTML='<div class="notice">No hay citas registradas para estos filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };
    await loadDoctors();
    $('#apptBranch').onchange=async()=>{await loadDoctors();await update()};
    $('#apptDoctor').onchange=update;$('#apptStatus').onchange=update;$('#apptFrom').onchange=update;$('#apptTo').onchange=update;
    await update();
  }

  // Guardamos la versión local como respaldo y sustituimos solo cuando Supabase está disponible.
  window.__novaLocalRenderPatients=window.renderPatients;
  window.__novaLocalRenderAppointments=window.renderAppointments;
  window.renderPatients=renderPatientsRemote;
  window.renderAppointments=renderAppointmentsRemote;

  window.openNewPatient=function(){
    if(!remoteOk()) return showToast('Conecta Supabase para registrar pacientes reales');
    const fixed=state.role==='recepcion';
    modal(`<span class="eyebrow">PostgreSQL real</span><h2>Registrar paciente</h2><p class="muted">La ficha se crea como paciente activo y sin cuenta de portal. El DNI se valida de forma global.</p><form id="remotePatientForm"><div class="formgrid"><label>DNI<input name="dni" maxlength="8" pattern="[0-9]{8}" required></label><label>Nombres<input name="first" required></label><label>Apellidos<input name="last" required></label><label>Teléfono<input name="phone"></label><label>Correo<input name="email" type="email"></label><label>Sede preferida<select name="branch" ${fixed?'disabled':''}>${fixed?`<option>${esc(userBranch())}</option>`:branchOptions()}</select></label><label>Seguro<select name="insurance"><option>Particular</option><option>SIS</option><option>Rímac</option><option>Pacífico</option><option>Mapfre</option></select></label><label>Canal<select name="channel"><option>PRESENCIAL</option><option>TELEFONO</option></select></label></div><button class="btn btn-primary" style="margin-top:16px">Guardar en PostgreSQL</button></form>`);
    $('#remotePatientForm').onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';
      try{
        const p=await NovaAPI.createStaffPatient({dni:fd.get('dni'),first:fd.get('first'),last:fd.get('last'),phone:fd.get('phone'),email:fd.get('email'),branch:fixed?userBranch():fd.get('branch'),insurance:fd.get('insurance'),channel:fd.get('channel')});
        closeModal();showToast(`Paciente real registrado · ${p.code}`);go('patients');
      }catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar en PostgreSQL'}
    };
  };

  window.openAppointment=function(){
    if(!remoteOk()) return showToast('Conecta Supabase para registrar citas reales');
    const fixed=state.role==='recepcion',initialBranch=fixed?userBranch():'Chorrillos';
    modal(`<span class="eyebrow">Agenda PostgreSQL</span><h2>Registrar cita real</h2><form id="remoteAppointmentForm"><div class="formgrid"><label>Sede<select id="remoteApptBranch" name="branch" ${fixed?'disabled':''}>${fixed?`<option>${esc(userBranch())}</option>`:branchOptions()}</select></label><label>Médico<select id="remoteApptDoctor" name="doctor" required></select></label><label>Fecha<input name="date" type="date" required></label><label>Hora<input name="time" type="time" required></label></div><div class="formsec"><h3>Paciente · búsqueda global</h3><div class="lookupbox"><input id="remotePatientSearch" placeholder="DNI, código o nombre" autocomplete="off"><div id="remotePatientResults" class="lookup-results hidden"></div><input type="hidden" id="remotePatientCode" name="patientCode"><div id="remotePatientCard" class="selected-card hidden"></div></div></div><div class="formsec"><label>Motivo<textarea name="reason" required></textarea></label></div><button class="btn btn-primary" style="margin-top:16px">Guardar cita en PostgreSQL</button></form>`);
    const b=$('#remoteApptBranch'),d=$('#remoteApptDoctor'),q=$('#remotePatientSearch'),res=$('#remotePatientResults'),code=$('#remotePatientCode'),card=$('#remotePatientCard');b.value=initialBranch;
    const loadDoctors=async()=>{d.innerHTML='<option>Cargando…</option>';try{const docs=await NovaAPI.activeDoctors(b.value);d.innerHTML=docs.length?docs.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.specialty||'')}</option>`).join(''):'<option value="">Sin médicos activos</option>'}catch(e){d.innerHTML='<option value="">Error al cargar</option>'}};
    let timer;
    q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{code.value='';card.classList.add('hidden');if(q.value.trim().length<2){res.classList.add('hidden');return}try{const rows=await NovaAPI.searchPatients(q.value.trim(),10);res.innerHTML=rows.length?rows.map(p=>`<button type="button" class="lookup-item" data-real-patient="${esc(p.code)}" data-name="${esc(p.name)}" data-dni="${esc(p.dni)}" data-insurance="${esc(p.insurance)}"><b>${esc(p.name)}</b><small>DNI ${esc(p.dni)} · ${esc(p.code)} · ${esc(p.branch)}</small></button>`).join(''):'<div class="lookup-item"><small>Sin coincidencias globales.</small></div>';res.classList.remove('hidden')}catch(e){res.innerHTML=`<div class="lookup-item"><small>${esc(e.message)}</small></div>`;res.classList.remove('hidden')}},250)};
    res.onclick=e=>{const x=e.target.closest('[data-real-patient]');if(!x)return;code.value=x.dataset.realPatient;q.value=`${x.dataset.dni} · ${x.dataset.name}`;card.innerHTML=`<strong>${x.dataset.name}</strong><span>${x.dataset.realPatient} · DNI ${x.dataset.dni} · ${x.dataset.insurance}</span>`;card.classList.remove('hidden');res.classList.add('hidden')};
    b.onchange=loadDoctors;loadDoctors();
    $('#remoteAppointmentForm').onsubmit=async e=>{e.preventDefault();if(!code.value){showToast('Busca y selecciona un paciente');return}const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const a=await NovaAPI.createStaffAppointment({patientCode:code.value,doctorCode:fd.get('doctor'),branch:fixed?userBranch():fd.get('branch'),date:fd.get('date'),time:fd.get('time'),reason:fd.get('reason')});closeModal();showToast(`Cita real registrada · ${a.id}`);go('appointments')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar cita en PostgreSQL'}};
  };

  // Portal: agenda y solicitud también trabajan contra PostgreSQL.
  const localGo=window.go;
  window.go=function(page){
    if(state.role==='patient'&&page==='patient-appointments'&&remoteOk()){
      state.page=page;renderPatientSide();$('#pageTitle').textContent='Mis citas';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';
      $('#appContent').innerHTML=`<div class="toolbar"><div><h3 style="margin:0">Mis citas ${dbBadge}</h3></div><button class="btn btn-primary" data-action="patient-book">+ Solicitar cita</button></div><div id="realPatientAppointments">${loading('Consultando tus citas...')}</div>`;
      NovaAPI.patientAppointments().then(rows=>{$('#realPatientAppointments').innerHTML=rows.length?rowTable(['Código','Fecha','Hora','Médico','Especialidad','Sede','Estado','Motivo'],rows.map(a=>[esc(a.id),esc(a.fecha),esc(a.hora),esc(a.doctor),esc(a.specialty||'—'),esc(a.branch),esc(a.status),esc(a.reason||'—')])):'<div class="notice">Todavía no tienes citas registradas.</div>'}).catch(e=>{$('#realPatientAppointments').innerHTML=errBox(e)});
      return;
    }
    return localGo(page);
  };

  window.patientBook=function(){
    if(state.role!=='patient')return openPatientModal('register');
    if(!remoteOk())return showToast('Conecta Supabase para solicitar una cita real');
    modal(`<span class="eyebrow">Portal del paciente</span><h2>Solicitar cita real</h2><form id="remotePatientBook"><div class="formgrid"><label>Sede<select id="patientBookBranch" name="branch">${branchOptions()}</select></label><label>Médico<select id="patientBookDoctor" name="doctor" required></select></label><label>Fecha<input name="date" type="date" required></label><label>Hora<input name="time" type="time" required></label></div><div class="formsec"><label>Motivo<textarea name="reason" required></textarea></label></div><button class="btn btn-primary" style="margin-top:16px">Solicitar cita</button></form>`);
    const b=$('#patientBookBranch'),d=$('#patientBookDoctor');
    const load=async()=>{d.innerHTML='<option>Cargando…</option>';try{const docs=await NovaAPI.activeDoctors(b.value);d.innerHTML=docs.length?docs.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.specialty||'')}</option>`).join(''):'<option value="">Sin médicos activos</option>'}catch(e){d.innerHTML='<option value="">Error al cargar</option>'}};b.onchange=load;load();
    $('#remotePatientBook').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Enviando…';try{const a=await NovaAPI.createPatientAppointment({doctorCode:fd.get('doctor'),branch:fd.get('branch'),date:fd.get('date'),time:fd.get('time'),reason:fd.get('reason')});closeModal();showToast(`Cita registrada · ${a.id}`);go('patient-appointments')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Solicitar cita'}};
  };

  // El Inicio del paciente también toma la próxima cita desde PostgreSQL.
  const localPatientHome=window.renderPatientHome;
  window.renderPatientHome=function(){
    if(!remoteOk())return localPatientHome();
    const p=state.user.patient;state.page='patient-home';$('#pageTitle').textContent='Mi salud';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';
    $('#appContent').innerHTML=loading('Cargando tu resumen...');renderPatientSide();
    NovaAPI.patientAppointments().then(rows=>{
      const today=new Date().toISOString().slice(0,10),next=[...rows].filter(a=>a.fecha>=today&&!['Cancelada','Realizada'].includes(a.status)).sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora))[0];
      $('#appContent').innerHTML=`${p.status==='Pendiente'?'<div class="notice" style="margin-bottom:14px"><b>Cuenta de portal creada · validación de paciente pendiente.</b> Puedes solicitar citas; Recepción validará tu identidad para funciones clínicas sensibles.</div>':''}<div class="kpis"><div class="kpi"><span>Próxima cita</span><strong>${next?esc(next.fecha.slice(5)):'Sin cita'}</strong></div><div class="kpi"><span>Citas registradas</span><strong>${rows.length}</strong></div><div class="kpi"><span>Origen de datos</span><strong style="font-size:1.1rem">PostgreSQL</strong></div><div class="kpi"><span>Sede preferida</span><strong style="font-size:1.2rem">${esc(p.branch)}</strong></div></div><div class="modulegrid" style="margin-top:14px"><div class="panel"><h3>Próxima atención</h3>${next?`<p><b>${esc(next.doctor)}</b></p><p class="muted">${esc(next.fecha)} · ${esc(next.hora)} · ${esc(next.branch)}</p>`:'<p class="muted">No tienes citas futuras registradas.</p>'}</div><div class="panel"><h3>Acciones rápidas</h3><div class="quick"><button data-action="patient-book"><span>📅</span><b>Solicitar cita</b></button><button data-page="patient-profile"><span>👤</span><b>Mi perfil</b></button><button data-page="patient-appointments"><span>🗓️</span><b>Ver mis citas</b></button></div></div></div>`;
    }).catch(e=>{$('#appContent').innerHTML=errBox(e)});
  };
})();
;

/* ===== nova-v65-historial-clinico · extracted from index.html ===== */
// Nova Salud v6.5 · Historial clínico real: consultas, alergias y prescripciones.
(function(){
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const dbBadge='<span class="badge ok">PostgreSQL real</span>';
  const allergyHtml=list=>Array.isArray(list)&&list.length
    ?`<div class="v65-allergy-list">${list.map(a=>`<span class="allergy-pill">⚠ ${esc(typeof a==='string'?a:a.name)}</span>`).join('')}</div>`
    :'<span class="allergy-none">Sin alergias activas</span>';

  async function renderHistoryRemote(c){
    if(!remoteOk())return window.__novaLocalRenderHistoryV65?.(c);
    const global=state.role==='gerencia',medical=state.role==='medico';
    const defaultBranch=global?'Todas las sedes':userBranch();
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="historySearch" placeholder="Paciente, DNI, historia, consulta o diagnóstico"><select id="historyBranch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="historyDoctor"><option value="">Todos los médicos</option></select></div><div class="right">${dbBadge}${medical?'<button class="btn btn-primary" data-v65-new-consultation>+ Nueva consulta</button>':''}</div></div><div class="v65-real-note"><b>Historial clínico longitudinal real:</b> consultas, alergias y prescripciones se leen desde PostgreSQL. Solo el rol Médico puede registrar información clínica nueva.</div><div id="historyTable">${loading('Consultando historial clínico...')}</div>`;
    $('#historyBranch').value=defaultBranch;
    const loadDoctors=async()=>{
      try{
        const docs=await NovaAPI.activeDoctors($('#historyBranch').value==='Todas las sedes'?'':$('#historyBranch').value);
        const sel=$('#historyDoctor');
        sel.innerHTML='<option value="">Todos los médicos</option>'+docs.map(d=>`<option value="${esc(d.code)}">${esc(d.name)} · ${esc(d.specialty||'')}</option>`).join('');
        if(medical){sel.value=state.user.staffCode;sel.disabled=true}
      }catch(e){console.warn('[Nova Historial] médicos',e)}
    };
    let timer;
    const update=async()=>{
      const box=$('#historyTable');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const rows=await NovaAPI.staffHistory({
          search:$('#historySearch').value.trim(),branch:$('#historyBranch').value,
          doctor:medical?state.user.staffCode:$('#historyDoctor').value,limit:300
        });
        box.innerHTML=rows.length?rowTable(['Historia','Consulta','Fecha','Paciente','Alergias','Diagnóstico','Recetas','Médico','Sede','Acciones'],rows.map(h=>[
          esc(h.history_code),esc(h.consultation_code),esc(h.fecha),`${esc(h.patient)}<br><small>DNI ${esc(h.patient_dni)}</small>`,
          allergyHtml(h.allergies),esc(h.diagnosis||'—'),`<span class="badge info">${Number(h.prescription_count||0)} receta(s)</span>`,
          esc(h.doctor),esc(h.branch),`<button class="btn btn-outline btn-sm" data-v65-clinical="${esc(h.patient_code)}">Ver ficha</button>`
        ])):'<div class="notice">Todavía no hay consultas clínicas que coincidan con los filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };
    await loadDoctors();
    $('#historySearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,280)};
    $('#historyBranch').onchange=async()=>{await loadDoctors();await update()};
    $('#historyDoctor').onchange=update;
    await update();
  }

  window.__novaLocalRenderHistoryV65=window.renderHistory;
  window.renderHistory=renderHistoryRemote;

  async function openClinicalFileRemote(patientCode){
    if(!remoteOk())return showToast('Conecta Supabase para consultar la ficha real');
    modal(loading('Cargando ficha clínica real...'));
    try{
      const f=await NovaAPI.clinicalFile(patientCode),p=f.patient||{},consults=f.consultations||[],rx=f.prescriptions||[],allergies=f.allergies||[];
      const events=[];
      consults.forEach(x=>events.push({date:x.fecha_hora||x.fecha,type:'consult',html:`<div class="v65-event"><div class="meta">${esc(x.fecha)} · ${esc(x.branch)} · ${esc(x.consultation_code)}</div><b>🩺 Consulta · ${esc(x.doctor)}</b><div><b>Diagnóstico:</b> ${esc(x.diagnosis||'—')}</div>${x.indications?`<div><b>Indicaciones:</b> ${esc(x.indications)}</div>`:''}${x.observations?`<small class="muted">${esc(x.observations)}</small>`:''}${state.role==='medico'&&x.doctor_code===state.user.staffCode?`<div class="actions"><button class="btn btn-primary btn-sm" data-v65-prescribe="${esc(x.consultation_code)}" data-patient-code="${esc(p.code)}">+ Recetar</button></div>`:''}</div>`}));
      rx.forEach(x=>events.push({date:x.fecha_hora||x.fecha,type:'rx',html:`<div class="v65-event rx"><div class="meta">${esc(x.fecha)} · ${esc(x.branch)} · ${esc(x.prescription_code)}</div><b>💊 ${esc(x.medicamento)}</b><div>${esc(x.dosis)}${x.frecuencia?` · ${esc(x.frecuencia)}`:''}${x.duracion?` · ${esc(x.duracion)}`:''}</div><small class="muted">Consulta ${esc(x.consultation_code)} · ${esc(x.doctor)}</small>${x.instrucciones?`<div class="muted">${esc(x.instrucciones)}</div>`:''}</div>`}));
      events.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
      const canEdit=state.role==='medico';
      modal(`<div class="v65-clinical-head"><div><span class="eyebrow">Ficha clínica PostgreSQL</span><h2 style="margin:6px 0">${esc(p.name)}</h2><p class="muted" style="margin:0">${esc(p.code)} · DNI ${esc(p.dni)} · HC ${esc(p.history_code)} · ${esc(p.branch)}</p></div><div class="v65-clinical-actions">${canEdit?`<button class="btn btn-primary btn-sm" data-v65-new-consultation data-patient-code="${esc(p.code)}">+ Consulta</button><button class="btn btn-outline btn-sm" data-v65-edit-allergies="${esc(p.code)}">Editar alergias</button>`:''}</div></div><div class="allergy-alert" style="${allergies.length?'':'border-color:#b9dfcf;background:#f1fbf6;color:#24674f'}"><span class="alert-icon">${allergies.length?'⚠️':'✓'}</span><div><b>Alergias medicamentosas activas</b>${allergyHtml(allergies)}</div></div><div class="v65-summary"><div><small>Consultas</small><b>${consults.length}</b></div><div><small>Prescripciones</small><b>${rx.length}</b></div><div><small>Origen</small><b style="font-size:1rem">PostgreSQL</b></div></div><h3>Atenciones y medicamentos</h3><div class="v65-timeline">${events.length?events.map(x=>x.html).join(''):'<div class="notice">Todavía no existen movimientos clínicos para este paciente.</div>'}</div>`);
    }catch(e){modal(errBox(e),true)}
  }

  async function openConsultationRemote(preselected=''){
    if(state.role!=='medico')return showToast('Solo el rol Médico puede registrar una consulta');
    modal(`<span class="eyebrow">Consulta clínica real</span><h2>Nueva consulta</h2><p class="muted">Médico: ${esc(state.user.name)} · ${esc(userBranch())}</p><form id="v65ConsultForm"><div class="formsec" style="margin-top:0;padding-top:0;border-top:0"><h3>Paciente · búsqueda global</h3><div class="lookupbox"><input id="v65ConsultPatientSearch" placeholder="DNI, código o nombre" autocomplete="off"><div id="v65ConsultPatientResults" class="lookup-results hidden"></div><input type="hidden" id="v65ConsultPatientCode" name="patientCode"><div id="v65ConsultPatientCard" class="selected-card hidden"></div></div></div><div class="formgrid"><label>Cita vinculada<select id="v65ConsultAppointment" name="appointmentCode"><option value="">Atención directa / sin cita</option></select></label><label>Sede<input value="${esc(userBranch())}" disabled></label></div><div class="formsec"><label>Diagnóstico<textarea name="diagnosis" required placeholder="Diagnóstico clínico"></textarea></label><div class="v65-two" style="margin-top:10px"><label>Indicaciones<textarea name="indications" placeholder="Indicaciones para el paciente"></textarea></label><label>Observaciones<textarea name="observations" placeholder="Notas clínicas"></textarea></label></div></div><button class="btn btn-primary" style="margin-top:15px">Guardar consulta en PostgreSQL</button></form>`);
    const q=$('#v65ConsultPatientSearch'),res=$('#v65ConsultPatientResults'),code=$('#v65ConsultPatientCode'),card=$('#v65ConsultPatientCard'),appt=$('#v65ConsultAppointment');
    const selectPatient=async p=>{
      code.value=p.code;q.value=`${p.dni} · ${p.name}`;card.innerHTML=`<strong>${esc(p.name)}</strong><span>${esc(p.code)} · DNI ${esc(p.dni)} · ${esc(p.branch)}</span>`;card.classList.remove('hidden');res.classList.add('hidden');
      appt.innerHTML='<option value="">Atención directa / sin cita</option>';
      try{const rows=await NovaAPI.doctorPatientAppointments(p.code);appt.insertAdjacentHTML('beforeend',rows.map(a=>`<option value="${esc(a.code)}">${esc(a.code)} · ${esc(a.fecha)} ${esc(a.hora)} · ${esc(a.status)}</option>`).join(''))}catch(e){console.warn(e)}
    };
    let timer;q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{code.value='';card.classList.add('hidden');if(q.value.trim().length<2){res.classList.add('hidden');return}try{const rows=await NovaAPI.searchPatients(q.value.trim(),10);res.innerHTML=rows.length?rows.map(p=>`<button type="button" class="lookup-item" data-v65-pick-patient="${esc(p.code)}" data-name="${esc(p.name)}" data-dni="${esc(p.dni)}" data-branch="${esc(p.branch)}"><b>${esc(p.name)}</b><small>DNI ${esc(p.dni)} · ${esc(p.code)} · ${esc(p.branch)}</small></button>`).join(''):'<div class="lookup-item"><small>Sin coincidencias.</small></div>';res.classList.remove('hidden')}catch(e){res.innerHTML=`<div class="lookup-item"><small>${esc(e.message)}</small></div>`;res.classList.remove('hidden')}},250)};
    res.onclick=e=>{const x=e.target.closest('[data-v65-pick-patient]');if(!x)return;selectPatient({code:x.dataset.v65PickPatient,name:x.dataset.name,dni:x.dataset.dni,branch:x.dataset.branch})};
    if(preselected){NovaAPI.searchPatients(preselected,5).then(rows=>{const p=rows.find(x=>x.code===preselected)||rows[0];if(p)selectPatient(p)}).catch(console.warn)}
    $('#v65ConsultForm').onsubmit=async e=>{e.preventDefault();if(!code.value)return showToast('Selecciona un paciente');const fd=new FormData(e.target),btn=e.target.querySelector('button[type="submit"],button:not([type])');btn.disabled=true;btn.textContent='Guardando…';try{const x=await NovaAPI.createConsultation({patientCode:code.value,appointmentCode:fd.get('appointmentCode'),diagnosis:fd.get('diagnosis'),indications:fd.get('indications'),observations:fd.get('observations')});closeModal();showToast(`Consulta real guardada · ${x.consultation_code}`);go('history')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar consulta en PostgreSQL'}};
  }

  async function openAllergiesRemote(patientCode){
    if(state.role!=='medico')return showToast('Solo un médico puede validar alergias');
    try{
      const f=await NovaAPI.clinicalFile(patientCode),p=f.patient||{},current=(f.allergies||[]).map(a=>a.name).join(', ');
      modal(`<span class="eyebrow">Seguridad farmacológica</span><h2>Alergias · ${esc(p.name)}</h2><p class="muted">Separa cada alergia con comas. Al guardar, quedarán marcadas como validadas clínicamente.</p><form id="v65AllergyForm"><label>Alergias activas<textarea name="allergies" placeholder="Ej. Penicilina, Ibuprofeno">${esc(current)}</textarea></label><button class="btn btn-primary" style="margin-top:14px">Guardar en PostgreSQL</button></form>`);
      $('#v65AllergyForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{await NovaAPI.saveClinicalAllergies(patientCode,fd.get('allergies'));closeModal();showToast('Alergias clínicas actualizadas');openClinicalFileRemote(patientCode)}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar en PostgreSQL'}};
    }catch(e){showToast(e?.message||String(e))}
  }

  async function openPrescriptionRemote(consultationCode,patientCode){
    if(state.role!=='medico')return showToast('Solo un médico puede emitir recetas');
    try{
      const [meds,f]=await Promise.all([NovaAPI.medicationCatalog(),NovaAPI.clinicalFile(patientCode)]),allergies=f.allergies||[];
      if(!meds.length)return showToast('No hay medicamentos activos en el catálogo');
      modal(`<span class="eyebrow">Prescripción PostgreSQL</span><h2>Nueva receta · ${esc(f.patient?.name||patientCode)}</h2><p class="muted">Consulta ${esc(consultationCode)}</p><div class="allergy-alert" style="${allergies.length?'':'border-color:#b9dfcf;background:#f1fbf6;color:#24674f'}"><span class="alert-icon">${allergies.length?'⚠️':'✓'}</span><div><b>Alergias activas</b>${allergyHtml(allergies)}</div></div><form id="v65RxForm"><div class="formgrid"><label>Medicamento<select id="v65RxMedication" name="productCode">${meds.map(m=>`<option value="${esc(m.code)}" data-name="${esc(m.name)}">${esc(m.name)} · ${esc(m.presentation||'')}</option>`).join('')}</select></label><label>Dosis<input name="dose" required placeholder="Ej. 1 tableta"></label><label>Frecuencia<input name="frequency" placeholder="Ej. cada 8 horas"></label><label>Duración<input name="duration" placeholder="Ej. 5 días"></label></div><label style="margin-top:10px">Indicaciones<textarea name="instructions" placeholder="Indicaciones al paciente"></textarea></label><div id="v65RxWarning" class="v65-prescription-alert"></div><button class="btn btn-primary" style="margin-top:14px">Guardar prescripción</button></form>`);
      const med=$('#v65RxMedication'),warning=$('#v65RxWarning');
      const conflict=()=>{const name=med.selectedOptions[0]?.dataset.name||'',hits=allergies.filter(a=>norm(name).includes(norm(a.name))||norm(a.name).includes(norm(name)));warning.innerHTML=hits.length?`<div class="allergy-alert"><span class="alert-icon">⛔</span><div><b>Prescripción bloqueada</b><div>Conflicto con alergia activa: ${esc(hits.map(x=>x.name).join(', '))}</div></div></div>`:'';return hits};med.onchange=conflict;conflict();
      $('#v65RxForm').onsubmit=async e=>{e.preventDefault();if(conflict().length)return showToast('Selecciona un medicamento sin conflicto de alergia');const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const x=await NovaAPI.createPrescription({consultationCode,productCode:fd.get('productCode'),dose:fd.get('dose'),frequency:fd.get('frequency'),duration:fd.get('duration'),instructions:fd.get('instructions')});closeModal();showToast(`Prescripción real guardada · ${x.prescription_code}`);openClinicalFileRemote(patientCode)}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar prescripción'}};
    }catch(e){showToast(e?.message||String(e))}
  }

  document.addEventListener('click',e=>{
    const file=e.target.closest('[data-v65-clinical]');if(file){openClinicalFileRemote(file.dataset.v65Clinical);return}
    const nc=e.target.closest('[data-v65-new-consultation]');if(nc){openConsultationRemote(nc.dataset.patientCode||'');return}
    const al=e.target.closest('[data-v65-edit-allergies]');if(al){openAllergiesRemote(al.dataset.v65EditAllergies);return}
    const rx=e.target.closest('[data-v65-prescribe]');if(rx){openPrescriptionRemote(rx.dataset.v65Prescribe,rx.dataset.patientCode);return}
    if(e.target.closest('[data-v65-save-patient-allergies]')){
      const ta=$('#v65PatientAllergies');if(!ta)return;
      NovaAPI.savePatientAllergies(ta.value).then(()=>{showToast('Alergias declaradas guardadas en PostgreSQL');go('patient-profile')}).catch(err=>showToast(err?.message||String(err)));return;
    }
  });

  // Portal del paciente: añade historial real y reemplaza alergias locales por PostgreSQL.
  const localRenderPatientSideV65=window.renderPatientSide;
  window.renderPatientSide=function(){
    if(state.role==='patient'&&remoteOk()){
      const items=[['patient-home','⌂','Inicio'],['patient-appointments','📅','Mis citas'],['patient-history','📋','Mi historial'],['patient-profile','👤','Mi perfil'],['patient-payments','💳','Mis pagos']];
      $('#sideNav').innerHTML=items.map(([k,i,l])=>`<button class="navbtn ${state.page===k?'active':''}" data-page="${k}"><span>${i}</span><span>${l}</span></button>`).join('');return;
    }
    return localRenderPatientSideV65();
  };

  const localGoV65=window.go;
  window.go=function(page){
    if(state.role==='patient'&&remoteOk()&&page==='patient-history'){
      state.page=page;renderPatientSide();$('#pageTitle').textContent='Mi historial';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';$('#appContent').innerHTML=loading('Cargando tu historial...');
      NovaAPI.patientClinicalHistory().then(f=>{const consults=f.consultations||[],rx=f.prescriptions||[],all=f.allergies||[];$('#appContent').innerHTML=`<div class="v65-real-note"><b>Información clínica real:</b> solo se muestran registros vinculados a tu propia cuenta autenticada.</div><div class="panel"><h3>Alergias activas</h3>${allergyHtml(all)}</div><div class="modulegrid" style="margin-top:14px"><div class="panel"><h3>Consultas</h3>${consults.length?rowTable(['Fecha','Médico','Especialidad','Sede','Diagnóstico'],consults.map(x=>[esc(x.fecha),esc(x.doctor),esc(x.specialty||'—'),esc(x.branch),esc(x.diagnosis||'—')])):'<div class="notice">Aún no tienes consultas registradas.</div>'}</div><div class="panel"><h3>Medicamentos recetados</h3>${rx.length?rowTable(['Fecha','Medicamento','Dosis','Frecuencia','Duración'],rx.map(x=>[esc(x.fecha),esc(x.medicamento),esc(x.dosis),esc(x.frecuencia||'—'),esc(x.duracion||'—')])):'<div class="notice">Aún no tienes prescripciones registradas.</div>'}</div></div>`}).catch(e=>{$('#appContent').innerHTML=errBox(e)});return;
    }
    if(state.role==='patient'&&remoteOk()&&page==='patient-profile'){
      state.page=page;renderPatientSide();const p=state.user.patient;$('#pageTitle').textContent='Mi perfil';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';$('#appContent').innerHTML=loading('Cargando perfil...');
      NovaAPI.patientClinicalHistory().then(f=>{const all=f.allergies||[];$('#appContent').innerHTML=`<div class="panel"><h3>Datos personales</h3><div class="formgrid"><label>Código<input value="${esc(p.code)}" disabled></label><label>DNI<input value="${esc(p.dni)}" disabled></label><label>Nombre<input value="${esc(p.name)}" disabled></label><label>Teléfono<input value="${esc(p.phone||'')}" disabled></label><label>Correo<input value="${esc(p.email||'')}" disabled></label><label>Sede preferida<input value="${esc(p.branch)}" disabled></label></div><div class="formsec"><h3>Alergias medicamentosas declaradas</h3><p class="muted">Puedes declarar alergias. Las que ya fueron validadas clínicamente se conservan aunque edites tus declaraciones.</p><textarea id="v65PatientAllergies" placeholder="Ej. Penicilina, Ibuprofeno">${esc(all.filter(a=>a.source==='DECLARADA').map(a=>a.name).join(', '))}</textarea><div style="margin-top:10px">${allergyHtml(all)}</div></div><button class="btn btn-primary" style="margin-top:14px" data-v65-save-patient-allergies>Guardar alergias en PostgreSQL</button></div>`}).catch(e=>{$('#appContent').innerHTML=errBox(e)});return;
    }
    return localGoV65(page);
  };
})();
;

/* ===== nova-v66-laboratorio · extracted from index.html ===== */
// Nova Salud v6.6 · Laboratorio real en Supabase/PostgreSQL.
(function(){
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const roleKpis=items=>`<div class="role-grid">${items.map(x=>`<div class="role-kpi"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong>${x.sub?`<small>${esc(x.sub)}</small>`:''}</div>`).join('')}</div>`;
  const statusLabel=s=>({SOLICITADO:'Solicitado',MUESTRA_PENDIENTE:'Muestra pendiente',EN_PROCESO:'En proceso',RESULTADO_LISTO:'Resultado listo',ENTREGADO:'Entregado',ANULADO:'Anulado'})[s]||s||'—';
  const statusBadge=s=>{const label=statusLabel(s),cls=['RESULTADO_LISTO','ENTREGADO'].includes(s)?'ok':['ANULADO'].includes(s)?'danger':'warn';return `<span class="badge ${cls}">${esc(label)}</span>`};
  let currentRows=[];

  function resultSummary(x){
    if(!x.result_text)return '<span class="muted">Sin resultado</span>';
    const main=x.result_value?`${esc(x.result_value)}${x.result_unit?` ${esc(x.result_unit)}`:''}`:esc(x.result_text);
    return `<div class="v66-result"><b>${main}</b><small>${esc(x.result_text)}</small>${x.validated?'<span class="badge ok">Validado</span>':'<span class="badge warn">Pendiente de validar</span>'}</div>`;
  }

  function actionHtml(x){
    if(state.role!=='laboratorio')return `<button class="btn btn-outline btn-xs" data-v66-lab-view="${esc(x.order_code)}">Ver</button>`;
    const a=[];
    if(['SOLICITADO','MUESTRA_PENDIENTE'].includes(x.status))a.push(`<button class="btn btn-outline btn-xs" data-v66-lab-sample="${esc(x.order_code)}">Muestra tomada</button>`);
    if(x.status==='EN_PROCESO'){
      a.push(`<button class="btn btn-primary btn-xs" data-v66-lab-result="${esc(x.order_code)}">${x.result_text?'Editar resultado':'Registrar resultado'}</button>`);
      if(x.result_text&&!x.validated)a.push(`<button class="btn btn-outline btn-xs" data-v66-lab-validate="${esc(x.order_code)}">Validar</button>`);
    }
    if(x.status==='RESULTADO_LISTO')a.push(`<button class="btn btn-outline btn-xs" data-v66-lab-deliver="${esc(x.order_code)}">Entregar</button>`);
    a.push(`<button class="btn btn-outline btn-xs" data-v66-lab-view="${esc(x.order_code)}">Ver</button>`);
    return `<div class="v66-lab-actions">${a.join('')}</div>`;
  }

  async function renderLaboratoryRemote(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    const global=state.role==='gerencia', doctor=state.role==='medico';
    const defaultBranch=global?'Todas las sedes':userBranch();
    c.innerHTML=`<div class="workflow-toolbar"><div class="left"><input id="v66LabSearch" placeholder="Orden, DNI, paciente o examen"><select id="v66LabBranch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="v66LabStatus"><option value="">Todos los estados</option><option value="MUESTRA_PENDIENTE">Muestra pendiente</option><option value="EN_PROCESO">En proceso</option><option value="RESULTADO_LISTO">Resultado listo</option><option value="ENTREGADO">Entregado</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span>${doctor?'<button class="btn btn-primary" data-v66-new-lab-order>+ Nueva orden</button>':''}</div></div><div class="v66-lab-note"><b>Laboratorio real:</b> el Médico solicita el examen; Laboratorio registra muestra, resultado, validación y entrega. Gerencia mantiene consulta global.</div><div id="v66LabKpis" class="v66-lab-kpis"></div><div id="v66LabTable">${loading('Consultando órdenes...')}</div>`;
    $('#v66LabBranch').value=defaultBranch;
    let timer;
    const update=async()=>{
      const box=$('#v66LabTable');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        currentRows=await NovaAPI.staffLabOrders({search:$('#v66LabSearch').value.trim(),branch:$('#v66LabBranch').value,status:$('#v66LabStatus').value,doctor:doctor?state.user.staffCode:'',limit:400});
        const rows=currentRows;
        $('#v66LabKpis').innerHTML=roleKpis([
          {label:'Órdenes visibles',value:rows.length},
          {label:'Muestra pendiente',value:rows.filter(x=>['SOLICITADO','MUESTRA_PENDIENTE'].includes(x.status)).length},
          {label:'En proceso',value:rows.filter(x=>x.status==='EN_PROCESO').length},
          {label:'Resultados listos',value:rows.filter(x=>['RESULTADO_LISTO','ENTREGADO'].includes(x.status)).length}
        ]);
        box.innerHTML=rows.length?rowTable(['Orden','Fecha','Paciente','Examen','Médico','Sede','Estado','Resultado','Acciones'],rows.map(x=>[
          esc(x.order_code),esc(x.fecha),`${esc(x.patient)}<br><small>DNI ${esc(x.patient_dni)}</small>`,`${esc(x.test)}<br><small>${esc(x.test_code)}</small>`,esc(x.doctor),esc(x.branch),statusBadge(x.status),resultSummary(x),actionHtml(x)
        ])):'<div class="notice">No existen órdenes que coincidan con los filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };
    $('#v66LabSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};
    $('#v66LabBranch').onchange=update;$('#v66LabStatus').onchange=update;
    await update();
  }

  async function renderLabDashboardRemote(c){
    c.innerHTML=loading('Cargando dashboard de laboratorio real...');
    try{
      const rows=await NovaAPI.staffLabOrders({branch:userBranch(),limit:250});
      c.innerHTML=`<div class="role-dashboard"><div class="role-head"><div><h3>Laboratorio · ${esc(userBranch())}</h3><div class="role-sub">${esc(state.user.name)} · datos reales de PostgreSQL</div></div><button class="btn btn-primary" data-page="laboratory">Abrir órdenes</button></div>${roleKpis([{label:'Órdenes visibles',value:rows.length},{label:'Muestras pendientes',value:rows.filter(x=>['SOLICITADO','MUESTRA_PENDIENTE'].includes(x.status)).length},{label:'En proceso',value:rows.filter(x=>x.status==='EN_PROCESO').length},{label:'Resultados listos',value:rows.filter(x=>['RESULTADO_LISTO','ENTREGADO'].includes(x.status)).length}])}<div class="role-panel"><h3>Cola reciente</h3>${rows.length?rowTable(['Orden','Paciente','Examen','Estado'],rows.slice(0,12).map(x=>[esc(x.order_code),esc(x.patient),esc(x.test),statusBadge(x.status)])):'<div class="notice">Sin órdenes registradas.</div>'}</div></div>`;
    }catch(e){c.innerHTML=errBox(e)}
  }

  async function openNewLabOrder(){
    if(state.role!=='medico')return showToast('Solo el rol Médico puede generar una orden clínica');
    let exams=[];try{exams=await NovaAPI.labExamCatalog()}catch(e){return showToast(e.message)}
    if(!exams.length)return showToast('No hay tipos de examen activos');
    modal(`<span class="eyebrow">Laboratorio PostgreSQL</span><h2>Nueva orden</h2><p class="muted">Médico: ${esc(state.user.name)} · ${esc(userBranch())}</p><form id="v66LabOrderForm"><div class="formsec" style="margin-top:0;padding-top:0;border-top:0"><h3>Paciente · búsqueda global</h3><div class="lookupbox"><input id="v66LabPatientSearch" placeholder="DNI, código o nombre" autocomplete="off"><div id="v66LabPatientResults" class="lookup-results hidden"></div><input type="hidden" name="patientCode" id="v66LabPatientCode"><div id="v66LabPatientCard" class="selected-card hidden"></div></div></div><div class="formgrid"><label>Examen<select name="testCode">${exams.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} · ${esc(x.category||'')}</option>`).join('')}</select></label><label>Sede<input value="${esc(userBranch())}" disabled></label></div><label style="margin-top:10px">Observación<textarea name="observation" placeholder="Indicación clínica opcional"></textarea></label><button class="btn btn-primary" style="margin-top:14px">Crear orden en PostgreSQL</button></form>`);
    const q=$('#v66LabPatientSearch'),res=$('#v66LabPatientResults'),code=$('#v66LabPatientCode'),card=$('#v66LabPatientCard');let timer;
    q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{code.value='';card.classList.add('hidden');if(q.value.trim().length<2){res.classList.add('hidden');return}try{const rows=await NovaAPI.searchPatients(q.value.trim(),10);res.innerHTML=rows.length?rows.map(p=>`<button type="button" class="lookup-item" data-v66-pick-lab-patient="${esc(p.code)}" data-name="${esc(p.name)}" data-dni="${esc(p.dni)}" data-branch="${esc(p.branch)}"><b>${esc(p.name)}</b><small>DNI ${esc(p.dni)} · ${esc(p.code)} · ${esc(p.branch)}</small></button>`).join(''):'<div class="lookup-item"><small>Sin coincidencias.</small></div>';res.classList.remove('hidden')}catch(e){res.innerHTML=`<div class="lookup-item"><small>${esc(e.message)}</small></div>`;res.classList.remove('hidden')}},250)};
    res.onclick=e=>{const x=e.target.closest('[data-v66-pick-lab-patient]');if(!x)return;code.value=x.dataset.v66PickLabPatient;q.value=`${x.dataset.dni} · ${x.dataset.name}`;card.innerHTML=`<strong>${esc(x.dataset.name)}</strong><span>${esc(code.value)} · DNI ${esc(x.dataset.dni)} · sede preferida ${esc(x.dataset.branch)}</span>`;card.classList.remove('hidden');res.classList.add('hidden')};
    $('#v66LabOrderForm').onsubmit=async e=>{e.preventDefault();if(!code.value)return showToast('Selecciona un paciente');const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const x=await NovaAPI.createLabOrder({patientCode:code.value,testCode:fd.get('testCode'),observation:fd.get('observation')});closeModal();showToast(`Orden real creada · ${x.order_code}`);go('laboratory')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Crear orden en PostgreSQL'}};
  }

  function rowByOrder(code){return currentRows.find(x=>x.order_code===code)}
  function viewLabOrder(code){const x=rowByOrder(code);if(!x)return showToast('Actualiza la lista para ver la orden');modal(`<span class="eyebrow">Orden de laboratorio</span><h2>${esc(x.order_code)} · ${esc(x.test)}</h2><div class="formgrid"><label>Paciente<input value="${esc(x.patient)} · DNI ${esc(x.patient_dni)}" disabled></label><label>Médico<input value="${esc(x.doctor)}" disabled></label><label>Sede<input value="${esc(x.branch)}" disabled></label><label>Estado<input value="${esc(statusLabel(x.status))}" disabled></label></div><div class="v66-result-box"><b>Resultado</b>${x.result_text?`<div>${esc(x.result_text)}</div>${x.result_value?`<div><strong>${esc(x.result_value)} ${esc(x.result_unit||'')}</strong> · ref. ${esc(x.result_range||x.reference_range||'—')}</div>`:''}<small class="muted">${x.validated?'Validado':'Pendiente de validación'}${x.lab_tech?` · ${esc(x.lab_tech)}`:''}</small>`:'<span class="muted">Aún no existe resultado registrado.</span>'}</div>`,true)}

  function openResultForm(code){const x=rowByOrder(code);if(!x)return;modal(`<span class="eyebrow">Procesamiento de laboratorio</span><h2>${esc(x.order_code)} · ${esc(x.test)}</h2><form id="v66LabResultForm"><label>Resultado / interpretación<textarea name="resultText" required>${esc(x.result_text||'')}</textarea></label><div class="formgrid" style="margin-top:10px"><label>Valor<input name="value" value="${esc(x.result_value||'')}"></label><label>Unidad<input name="unit" value="${esc(x.result_unit||x.reference_unit||'')}"></label><label>Rango referencial<input name="range" value="${esc(x.result_range||x.reference_range||'')}"></label><label>Estado<input value="Pendiente de validación" disabled></label></div><label style="margin-top:10px">Observación<textarea name="observation">${esc(x.result_note||'')}</textarea></label><button class="btn btn-primary" style="margin-top:14px">Guardar resultado</button></form>`);$('#v66LabResultForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{await NovaAPI.saveLabResult({orderCode:code,resultText:fd.get('resultText'),value:fd.get('value'),unit:fd.get('unit'),range:fd.get('range'),observation:fd.get('observation')});closeModal();showToast('Resultado guardado · pendiente de validación');go('laboratory')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Guardar resultado'}}}

  // Captura acciones nuevas antes de los listeners demo antiguos.
  document.addEventListener('click',async e=>{
    const newOrder=e.target.closest('[data-v66-new-lab-order]');if(newOrder){e.preventDefault();e.stopImmediatePropagation();return openNewLabOrder()}
    const sample=e.target.closest('[data-v66-lab-sample]');if(sample){e.preventDefault();e.stopImmediatePropagation();try{await NovaAPI.takeLabSample(sample.dataset.v66LabSample);showToast('Muestra registrada · orden en proceso');go('laboratory')}catch(err){showToast(err.message)}return}
    const result=e.target.closest('[data-v66-lab-result]');if(result){e.preventDefault();e.stopImmediatePropagation();openResultForm(result.dataset.v66LabResult);return}
    const valid=e.target.closest('[data-v66-lab-validate]');if(valid){e.preventDefault();e.stopImmediatePropagation();if(!confirm('¿Validar este resultado y dejarlo disponible como resultado listo?'))return;try{await NovaAPI.validateLabResult(valid.dataset.v66LabValidate);showToast('Resultado validado');go('laboratory')}catch(err){showToast(err.message)}return}
    const deliver=e.target.closest('[data-v66-lab-deliver]');if(deliver){e.preventDefault();e.stopImmediatePropagation();try{await NovaAPI.deliverLabResult(deliver.dataset.v66LabDeliver);showToast('Resultado marcado como entregado');go('laboratory')}catch(err){showToast(err.message)}return}
    const view=e.target.closest('[data-v66-lab-view]');if(view){e.preventDefault();e.stopImmediatePropagation();viewLabOrder(view.dataset.v66LabView);return}
  },true);

  // Intercepta la navegación a Laboratorio para usar PostgreSQL real.
  const localGoV66=window.go;
  window.go=function(page){
    if(remoteOk()&&state.role!=='patient'&&page==='laboratory'&&['gerencia','medico','laboratorio'].includes(state.role)){
      state.page=page;renderNav();$('#pageTitle').textContent='Laboratorio';$('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderLaboratoryRemote($('#appContent'));
    }
    if(remoteOk()&&state.role==='laboratorio'&&page==='dashboard'){
      state.page=page;renderNav();$('#pageTitle').textContent='Dashboard';$('#pageKicker').textContent='Laboratorio · PostgreSQL real';return renderLabDashboardRemote($('#appContent'));
    }
    if(remoteOk()&&state.role==='patient'&&page==='patient-history'){
      state.page=page;renderPatientSide();$('#pageTitle').textContent='Mi historial';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';$('#appContent').innerHTML=loading('Cargando historial y laboratorio...');
      Promise.all([NovaAPI.patientClinicalHistory(),NovaAPI.patientLabResults()]).then(([f,labs])=>{const consults=f.consultations||[],rx=f.prescriptions||[],all=f.allergies||[];$('#appContent').innerHTML=`<div class="v66-lab-note"><b>Información clínica real:</b> consultas, medicamentos y resultados validados de laboratorio pertenecen a tu cuenta autenticada.</div><div class="panel"><h3>Alergias activas</h3>${all.length?all.map(a=>`<span class="allergy-pill">⚠ ${esc(a.name)}</span>`).join(' '):'<span class="allergy-none">Sin alergias activas</span>'}</div><div class="modulegrid" style="margin-top:14px"><div class="panel"><h3>Consultas</h3>${consults.length?rowTable(['Fecha','Médico','Sede','Diagnóstico'],consults.map(x=>[esc(x.fecha),esc(x.doctor),esc(x.branch),esc(x.diagnosis||'—')])):'<div class="notice">Aún no tienes consultas.</div>'}</div><div class="panel"><h3>Medicamentos</h3>${rx.length?rowTable(['Fecha','Medicamento','Dosis'],rx.map(x=>[esc(x.fecha),esc(x.medicamento),esc(x.dosis)])):'<div class="notice">Aún no tienes prescripciones.</div>'}</div></div><div class="panel v66-patient-labs"><h3>🧪 Resultados de laboratorio validados</h3>${labs.length?rowTable(['Fecha','Examen','Resultado','Sede'],labs.map(x=>[esc(x.fecha),esc(x.test),x.result_value?`${esc(x.result_value)} ${esc(x.unit||'')}`:esc(x.result_text),esc(x.branch)])):'<div class="notice">Aún no tienes resultados validados.</div>'}</div>`}).catch(e=>{$('#appContent').innerHTML=errBox(e)});return;
    }
    return localGoV66(page);
  };
})();
;

/* ===== nova-v67-enfermeria · extracted from index.html ===== */
// Nova Salud v6.8 · Enfermería real en Supabase/PostgreSQL.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const addUnique=(arr,v)=>{if(!arr.includes(v))arr.push(v)};
  addUnique(perms.gerencia,'nursing');addUnique(perms.enfermeria,'nursing');
  if(!nav.some(x=>x[0]==='nursing')){
    const i=nav.findIndex(x=>x[0]==='history');
    nav.splice(i>=0?i+1:nav.length,0,['nursing','💉','Enfermería']);
  }

  const statusLabel=s=>({PENDIENTE:'Pendiente',EN_PROCESO:'En proceso',COMPLETADA:'Completada',CANCELADA:'Cancelada'})[s]||s||'—';
  const statusBadge=s=>{const cls=s==='COMPLETADA'?'ok':s==='CANCELADA'?'danger':'warn';return `<span class="badge ${cls}">${esc(statusLabel(s))}</span>`};
  const priorityBadge=p=>{const cls=p==='URGENTE'?'v67-priority-urgent':p==='ALTA'?'v67-priority-high':'v67-priority-normal';return `<span class="badge ${cls}">${esc(p||'NORMAL')}</span>`};
  const kpis=items=>`<div class="role-grid">${items.map(x=>`<div class="role-kpi"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong>${x.sub?`<small>${esc(x.sub)}</small>`:''}</div>`).join('')}</div>`;
  let currentTasks=[];

  function taskActions(x){
    const a=[];
    if(state.role==='enfermeria'&&x.status==='PENDIENTE')a.push(`<button class="btn btn-primary btn-xs" data-v67-start="${esc(x.task_code)}">Iniciar</button>`);
    if(state.role==='enfermeria'&&x.status==='EN_PROCESO')a.push(`<button class="btn btn-primary btn-xs" data-v67-complete="${esc(x.task_code)}">Completar</button>`);
    if(state.role==='gerencia'&&['PENDIENTE','EN_PROCESO'].includes(x.status))a.push(`<button class="btn btn-outline btn-xs" data-v67-cancel="${esc(x.task_code)}">Cancelar</button>`);
    a.push(`<button class="btn btn-outline btn-xs" data-v65-clinical="${esc(x.patient_code)}">Ver ficha</button>`);
    return `<div class="v67-actions">${a.join('')}</div>`;
  }

  async function renderNursingRemote(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    const global=state.role==='gerencia';
    const defaultBranch=global?'Todas las sedes':userBranch();
    c.innerHTML=`<div class="workflow-toolbar"><div class="left"><input id="v67Search" placeholder="Tarea, DNI, paciente o actividad"><select id="v67Branch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="v67Status"><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="COMPLETADA">Completada</option><option value="CANCELADA">Cancelada</option></select><select id="v67Priority"><option value="">Todas las prioridades</option><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select>${global?'<select id="v67Nurse"><option value="">Todos los enfermeros</option></select>':''}</div><div class="right"><span class="badge ok">PostgreSQL real</span>${global?'<button class="btn btn-primary" data-v67-new-task>+ Nueva tarea</button>':''}</div></div><div class="v67-note"><b>Enfermería real:</b> Gerencia asigna tareas; cada enfermero solo puede iniciar y completar las tareas que tiene asignadas en su sede.</div><div id="v67Kpis" class="v67-kpis"></div><div id="v67Table">${loading('Consultando tareas...')}</div>`;
    q('#v67Branch').value=defaultBranch;

    const loadNurses=async()=>{
      if(!global)return;
      const sel=q('#v67Nurse');sel.innerHTML='<option value="">Todos los enfermeros</option>';
      try{
        const rows=await NovaAPI.activeNurses(q('#v67Branch').value==='Todas las sedes'?'':q('#v67Branch').value);
        sel.innerHTML='<option value="">Todos los enfermeros</option>'+rows.map(n=>`<option value="${esc(n.code)}">${esc(n.name)} · ${esc(n.branch)}</option>`).join('');
      }catch(e){console.warn('[Nova Enfermería] enfermeros',e)}
    };

    let timer;
    const update=async()=>{
      const box=q('#v67Table');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        currentTasks=await NovaAPI.nursingTasks({
          search:q('#v67Search').value.trim(),branch:q('#v67Branch').value,
          status:q('#v67Status').value,priority:q('#v67Priority').value,
          nurse:state.role==='enfermeria'?state.user.staffCode:(q('#v67Nurse')?.value||''),limit:500
        });
        const rows=currentTasks;
        q('#v67Kpis').innerHTML=kpis([
          {label:'Tareas visibles',value:rows.length},
          {label:'Pendientes',value:rows.filter(x=>x.status==='PENDIENTE').length},
          {label:'En proceso',value:rows.filter(x=>x.status==='EN_PROCESO').length},
          {label:'Completadas',value:rows.filter(x=>x.status==='COMPLETADA').length}
        ]);
        box.innerHTML=rows.length?rowTable(['Tarea','Programada','Paciente','Actividad','Enfermero','Sede','Prioridad','Estado','Observación','Acciones'],rows.map(x=>[
          esc(x.task_code),`${esc(x.scheduled)}${x.overdue?'<span class="v67-overdue">⚠ Fuera de hora</span>':''}`,
          `${esc(x.patient)}<br><small>DNI ${esc(x.patient_dni)}</small>`,
          `<div class="v67-task-type">${esc(x.task_type)}</div>`,esc(x.nurse),esc(x.branch),priorityBadge(x.priority),statusBadge(x.status),
          `<div class="v67-task-type">${esc(x.observation||'—')}</div>`,taskActions(x)
        ])):'<div class="notice">No existen tareas que coincidan con los filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };

    await loadNurses();
    q('#v67Search').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};
    q('#v67Branch').onchange=async()=>{await loadNurses();await update()};
    q('#v67Status').onchange=update;q('#v67Priority').onchange=update;
    if(q('#v67Nurse'))q('#v67Nurse').onchange=update;
    await update();
  }

  async function renderNursingDashboard(c){
    c.innerHTML=loading('Cargando agenda de enfermería...');
    try{
      const rows=await NovaAPI.nursingTasks({branch:userBranch(),nurse:state.user.staffCode,limit:200});
      const open=rows.filter(x=>['PENDIENTE','EN_PROCESO'].includes(x.status));
      c.innerHTML=`<div class="role-dashboard"><div class="role-head"><div><h3>Mi agenda de Enfermería · ${esc(userBranch())}</h3><div class="role-sub">${esc(state.user.name)} · datos reales de PostgreSQL</div></div><button class="btn btn-primary" data-page="nursing">Abrir tareas</button></div>${kpis([{label:'Tareas asignadas',value:rows.length},{label:'Pendientes',value:rows.filter(x=>x.status==='PENDIENTE').length},{label:'En proceso',value:rows.filter(x=>x.status==='EN_PROCESO').length},{label:'Completadas',value:rows.filter(x=>x.status==='COMPLETADA').length}])}<div class="role-panel"><h3>Próximas / abiertas</h3>${open.length?rowTable(['Hora','Paciente','Actividad','Prioridad','Estado'],open.slice(0,12).map(x=>[esc(x.scheduled),esc(x.patient),esc(x.task_type),priorityBadge(x.priority),statusBadge(x.status)])):'<div class="notice">No tienes tareas abiertas.</div>'}</div></div>`;
    }catch(e){c.innerHTML=errBox(e)}
  }

  async function openNewTask(){
    if(state.role!=='gerencia')return showToast('Solo Gerencia puede asignar nuevas tareas en esta etapa');
    modal(`<span class="eyebrow">Enfermería PostgreSQL</span><h2>Asignar nueva tarea</h2><form id="v67TaskForm"><div class="formgrid"><label>Sede<select id="v67TaskBranch">${branchOptions()}</select></label><label>Enfermero<select id="v67TaskNurse" name="nurseCode" required></select></label><label>Fecha y hora<input name="scheduledAt" type="datetime-local" required></label><label>Prioridad<select name="priority"><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label></div><div class="formsec"><h3>Paciente · búsqueda global</h3><div class="lookupbox"><input id="v67PatientSearch" placeholder="DNI, código o nombre" autocomplete="off"><div id="v67PatientResults" class="lookup-results hidden"></div><input type="hidden" name="patientCode" id="v67PatientCode"><div id="v67PatientCard" class="selected-card hidden"></div></div></div><div class="formgrid" style="margin-top:12px"><label>Actividad<select name="taskType"><option>Control de signos vitales</option><option>Preparación para consulta médica</option><option>Control de temperatura y saturación</option><option>Seguimiento de signos vitales</option><option>Educación breve de cuidados indicados</option><option>Verificación de indicaciones de cuidado</option></select></label><label>Observación<textarea name="observation" placeholder="Indicaciones u observaciones"></textarea></label></div><button class="btn btn-primary" style="margin-top:14px">Asignar en PostgreSQL</button></form>`);
    const branch=q('#v67TaskBranch'),nurse=q('#v67TaskNurse'),search=q('#v67PatientSearch'),results=q('#v67PatientResults'),code=q('#v67PatientCode'),card=q('#v67PatientCard');
    const loadNurses=async()=>{nurse.innerHTML='<option value="">Cargando…</option>';try{const rows=await NovaAPI.activeNurses(branch.value);nurse.innerHTML=rows.length?rows.map(n=>`<option value="${esc(n.code)}">${esc(n.name)} · ${esc(n.branch)}</option>`).join(''):'<option value="">Sin enfermeros activos</option>'}catch(e){nurse.innerHTML='<option value="">Error al cargar</option>'}};
    branch.onchange=loadNurses;await loadNurses();
    let timer;
    search.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{code.value='';card.classList.add('hidden');if(search.value.trim().length<2){results.classList.add('hidden');return}try{const rows=await NovaAPI.searchPatients(search.value.trim(),10);results.innerHTML=rows.length?rows.map(p=>`<button type="button" class="lookup-item" data-v67-patient="${esc(p.code)}" data-name="${esc(p.name)}" data-dni="${esc(p.dni)}"><b>${esc(p.name)}</b><small>DNI ${esc(p.dni)} · ${esc(p.code)} · ${esc(p.branch)}</small></button>`).join(''):'<div class="lookup-item"><small>Sin coincidencias.</small></div>';results.classList.remove('hidden')}catch(e){results.innerHTML=`<div class="lookup-item"><small>${esc(e.message)}</small></div>`;results.classList.remove('hidden')}},250)};
    results.onclick=e=>{const x=e.target.closest('[data-v67-patient]');if(!x)return;code.value=x.dataset.v67Patient;search.value=`${x.dataset.dni} · ${x.dataset.name}`;card.innerHTML=`<strong>${esc(x.dataset.name)}</strong><span>${esc(code.value)} · DNI ${esc(x.dataset.dni)}</span>`;card.classList.remove('hidden');results.classList.add('hidden')};
    q('#v67TaskForm').onsubmit=async e=>{e.preventDefault();if(!code.value)return showToast('Selecciona un paciente');const fd=new FormData(e.target),raw=String(fd.get('scheduledAt')||'');if(!raw)return showToast('Selecciona fecha y hora');const scheduledAt=/[zZ]|[+-]\d\d:\d\d$/.test(raw)?raw:`${raw}:00-05:00`;const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Asignando…';try{const x=await NovaAPI.createNursingTask({patientCode:code.value,nurseCode:fd.get('nurseCode'),scheduledAt,taskType:fd.get('taskType'),priority:fd.get('priority'),observation:fd.get('observation')});closeModal();showToast(`Tarea real asignada · ${x.task_code}`);go('nursing')}catch(err){showToast(err?.message||String(err));btn.disabled=false;btn.textContent='Asignar en PostgreSQL'}};
  }

  function openCompleteTask(code){
    modal(`<span class="eyebrow">Enfermería PostgreSQL</span><h2>Completar ${esc(code)}</h2><form id="v67CompleteForm"><label>Observación final (opcional)<textarea name="observation" placeholder="Registro breve de la atención realizada"></textarea></label><button class="btn btn-primary" style="margin-top:14px">Marcar como completada</button></form>`,true);
    q('#v67CompleteForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{await NovaAPI.completeNursingTask(code,fd.get('observation'));closeModal();showToast('Tarea completada en PostgreSQL');go('nursing')}catch(err){showToast(err?.message||String(err));btn.disabled=false}};
  }

  document.addEventListener('click',async e=>{
    const n=e.target.closest('[data-v67-new-task]');if(n){e.preventDefault();e.stopImmediatePropagation();return openNewTask()}
    const start=e.target.closest('[data-v67-start]');if(start){e.preventDefault();e.stopImmediatePropagation();try{await NovaAPI.startNursingTask(start.dataset.v67Start);showToast('Tarea iniciada');go('nursing')}catch(err){showToast(err?.message||String(err))}return}
    const complete=e.target.closest('[data-v67-complete]');if(complete){e.preventDefault();e.stopImmediatePropagation();openCompleteTask(complete.dataset.v67Complete);return}
    const cancel=e.target.closest('[data-v67-cancel]');if(cancel){e.preventDefault();e.stopImmediatePropagation();const reason=prompt('Motivo de cancelación:','Tarea reprogramada')||'';if(!reason.trim())return;try{await NovaAPI.cancelNursingTask(cancel.dataset.v67Cancel,reason);showToast('Tarea cancelada');go('nursing')}catch(err){showToast(err?.message||String(err))}return}
  },true);

  const localGoV67=window.go;
  window.go=function(page){
    if(remoteOk()&&page==='nursing'&&['gerencia','enfermeria'].includes(state.role)){
      state.page=page;renderNav();q('#pageTitle').textContent='Enfermería';q('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderNursingRemote(q('#appContent'));
    }
    if(remoteOk()&&state.role==='enfermeria'&&page==='dashboard'){
      state.page=page;renderNav();q('#pageTitle').textContent='Dashboard';q('#pageKicker').textContent='Enfermería · PostgreSQL real';return renderNursingDashboard(q('#appContent'));
    }
    return localGoV67(page);
  };
})();
;