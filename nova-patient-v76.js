/* Nova Salud v7.6 — portal del paciente: autogestión y preferencias WhatsApp.
   Los cambios se guardan exclusivamente mediante RPC autenticadas de Supabase.
   No utiliza tokens privados ni envía mensajes automáticos a WhatsApp. */
(function () {
  'use strict';
  const E = value => String(value ?? '').replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $v = id => document.getElementById(id);
  const api = () => window.NovaAPI;
  const active = () => !!(api() && api().enabled);
  const message = error => String(error?.message || error || 'Ocurrió un error');
  const peruToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date());
  const plusDays = (date,n) => {
    const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);
    return d.toISOString().slice(0,10);
  };
  const isFuture = a => (String(a.fecha||'')+'T'+String(a.hora||'00:00')) >
    new Date(Date.now()-5*3600*1000).toISOString().slice(0,16);
  const editable = a => ['PROGRAMADA','CONFIRMADA'].includes(
    String(a.status||'').toUpperCase()) && isFuture(a);
  const statusClass = s => String(s).toUpperCase()==='CANCELADA'?'cancelada':
    String(s).toUpperCase()==='REALIZADA'?'realizada':'programada';
  const notify = (txt) => {
    if (typeof showToast==='function') showToast(txt);
    else window.alert(txt);
  };
  const busy = (btn,text) => { if(btn){btn.disabled=true;btn.dataset.oldLabel=btn.textContent;btn.textContent=text;} };
  const free = btn => { if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldLabel||'Guardar';} };

  async function renderAppointmentsV76() {
    if (typeof state==='undefined'||state.role!=='patient') return;
    if (!active()) return originalGo('patient-appointments');
    state.page='patient-appointments';
    renderPatientSide();
    $v('pageTitle').textContent='Mis citas';
    $v('pageKicker').textContent='Portal del paciente · Nova Salud v7.6';
    $v('appContent').innerHTML=`
      <div class="v76-heading">
        <div><span class="eyebrow">Autogestión de citas</span><h3>Gestiona tu atención</h3>
          <p>Consulta tus reservas, cambia el horario o cancela si ya no puedes asistir.</p></div>
        <div class="v76-top-actions">
          <button class="btn btn-outline" type="button" data-v76-whatsapp>✉ Preferencias de WhatsApp</button>
          <button class="btn btn-primary" type="button" data-action="patient-book">+ Solicitar cita</button>
        </div>
      </div>
      <div class="v76-note">🔐 Solo puedes modificar citas asociadas a tu cuenta. Los cambios requieren confirmación de la base de datos. Si existe un pago, consulta la política de devolución con recepción.</div>
      <div id="v76AppointmentList" aria-live="polite"><div class="notice">Cargando tus citas...</div></div>
      <section class="v76-notices"><div class="v76-section-title"><h3>🔔 Notificaciones recientes</h3>
        <button class="btn btn-outline btn-sm" data-v76-reload type="button">Actualizar</button></div>
        <div id="v76NotificationList"><p class="muted">Cargando...</p></div></section>`;
    try {
      const rows=await api().patientAppointments();
      if(state.role!=='patient'||state.page!=='patient-appointments')return;
      const upcoming=rows.filter(a=>isFuture(a)&&String(a.status).toUpperCase()!=='CANCELADA');
      $v('v76AppointmentList').innerHTML=`
        <div class="v76-summary">
          <div><span>Total de citas</span><strong>${rows.length}</strong></div>
          <div><span>Próximas</span><strong>${upcoming.length}</strong></div>
          <div><span>Canceladas</span><strong>${rows.filter(a=>String(a.status).toUpperCase()==='CANCELADA').length}</strong></div>
        </div>
        ${rows.length ? '<div class="v76-list">'+rows.map(a=>`
          <article class="v76-appointment">
            <div class="v76-card-top"><div><small>Cita ${E(a.id)}</small><h4>${E(a.specialty||'Consulta médica')}</h4>
              <p>${E(a.doctor||'Médico por confirmar')}</p></div>
              <span class="v76-status ${statusClass(a.status)}">${E(a.status)}</span></div>
            <div class="v76-card-meta">
              <span>📅 ${E(a.fecha)} · ${E(a.hora)}</span><span>📍 Sede ${E(a.branch)}</span>
            </div>
            <div class="v76-card-actions">
              ${editable(a) ? `
              <button type="button" class="btn btn-soft btn-sm" data-v76-action="reprogramar" data-cita="${E(a.id)}">📅 Reprogramar</button>
              <button type="button" class="btn btn-outline btn-sm v76-cancel" data-v76-action="cancelar" data-cita="${E(a.id)}">Cancelar cita</button>`:
              '<span class="muted">Esta cita ya no admite cambios desde el portal.</span>'}
            </div>
          </article>`).join('')+'</div>' : '<div class="notice">Todavía no tienes citas registradas.</div>'}`;
      window.__novaV76Appointments=rows;
    } catch(err) {
      $v('v76AppointmentList').innerHTML='<div class="notice">No se pudieron consultar las citas: '+E(message(err))+'</div>';
    }
    await renderNotifications();
  }

  async function renderNotifications(){
    const box=$v('v76NotificationList');
    if(!box)return;
    try{
      const rows=await api().patientNotifications();
      if(!box.isConnected)return;
      box.innerHTML=rows.length ? rows.slice(0,6).map(n=>`
        <div class="v76-notice"><span class="v76-notice-icon">🔔</span><div>
          <b>${E(n.titulo||'Notificación')}</b><p>${E(n.mensaje||'')}</p>
          <small>${E(String(n.fecha_hora||'').replace('T',' ').slice(0,16))}</small>
        </div></div>`).join('') : '<p class="muted">No hay notificaciones nuevas.</p>';
    }catch(_err){box.innerHTML='<p class="muted">Las notificaciones no están disponibles en esta sesión.</p>';}
  }

  function openCancel(a){
    modal(`<span class="eyebrow">Mi cita · ${E(a.id)}</span><h2>Cancelar cita</h2>
      <p>¿Confirmas que deseas cancelar tu cita del <b>${E(a.fecha)} a las ${E(a.hora)}</b>?</p>
      <div class="v76-note">Esta acción libera el turno si la base de datos tiene aplicada la migración v7.6. Si realizaste un pago, consulta a recepción cómo gestionarlo.</div>
      <form id="v76CancelForm"><div class="v76-modal-actions">
        <button type="button" class="btn btn-outline" data-action="close-modal">Volver</button>
        <button type="submit" class="btn btn-primary">Sí, cancelar cita</button></div></form>`,true);
    $v('v76CancelForm').onsubmit=async ev=>{
      ev.preventDefault();const btn=ev.target.querySelector('[type=submit]');busy(btn,'Cancelando...');
      try{
        await api().cancelPatientAppointment(a.id);
        closeModal();notify('Cita cancelada correctamente');renderAppointmentsV76();
      }catch(err){notify(message(err));free(btn);}
    };
  }

  async function openReprogram(a){
    modal(`<span class="eyebrow">Mi cita · ${E(a.id)}</span><h2>Reprogramar cita</h2>
      <p class="muted">Elige la sede, el médico y otro horario. La disponibilidad se valida al confirmar.</p>
      <form id="v76RescheduleForm"><div class="formgrid">
        <label>Sede<select id="v76Branch" name="branch" required>
          ${branches.map(b=>`<option value="${E(b.name)}" ${b.name===a.branch?'selected':''}>${E(b.name)}</option>`).join('')}</select></label>
        <label>Médico<select id="v76Doctor" name="doctor" required><option value="">Cargando...</option></select></label>
        <label>Fecha<input name="date" type="date" min="${peruToday()}" max="${plusDays(peruToday(),180)}" value="${E(a.fecha)}" required></label>
        <label>Hora<input name="time" type="time" step="900" min="07:00" max="21:00" value="${E(a.hora)}" required></label>
      </div><div class="v76-note">Lunes a sábado, de 07:00 a 21:00. No se modifican automáticamente consultas ya realizadas.</div>
      <div class="v76-modal-actions"><button class="btn btn-outline" type="button" data-action="close-modal">Volver</button>
      <button type="submit" class="btn btn-primary">Confirmar nuevo horario</button></div></form>`,true);
    const form=$v('v76RescheduleForm'),branch=$v('v76Branch'),doc=$v('v76Doctor');
    async function loadDoctors(){
      doc.innerHTML='<option value="">Buscando médicos...</option>';
      try{
        const doctors=await api().activeDoctors(branch.value);
        if(!doc.isConnected)return;
        const same=doctors.filter(d=>!a.specialty||!d.specialty||
          String(d.specialty).toLowerCase()===String(a.specialty).toLowerCase());
        doc.innerHTML=same.length?same.map(d=>`<option value="${E(d.code)}" ${d.code===a.doctor_code?'selected':''}>${E(d.name)} · ${E(d.specialty)}</option>`).join(''):'<option value="">No hay médicos de la especialidad</option>';
      }catch(err){doc.innerHTML='<option value="">No fue posible cargar los médicos</option>';notify(message(err));}
    }
    branch.onchange=loadDoctors;
    loadDoctors();
    form.onsubmit=async ev=>{
      ev.preventDefault();const fd=new FormData(form);
      const date=String(fd.get('date')||''),hour=String(fd.get('time')||'');
      if(!fd.get('doctor'))return notify('Selecciona un médico disponible');
      if(new Date(date+'T12:00:00Z').getUTCDay()===0)return notify('Elige un día de lunes a sábado');
      if(date<peruToday()||date>plusDays(peruToday(),180)||hour<'07:00'||hour>'21:00')
        return notify('Elige un horario válido en los siguientes 180 días');
      if(date+'T'+hour<=new Date(Date.now()-5*3600*1000).toISOString().slice(0,16))
        return notify('La nueva cita debe ser futura');
      const btn=form.querySelector('[type=submit]');busy(btn,'Guardando...');
      try {
        await api().reschedulePatientAppointment({code:a.id,branch:fd.get('branch'),
          doctorCode:fd.get('doctor'),date,hour});
        closeModal();notify('Cita reprogramada correctamente');renderAppointmentsV76();
      }catch(err){notify(message(err));free(btn);}
    };
  }

  async function openWhatsApp(){
    modal(`<span class="eyebrow">Comunicación · Nova Salud</span><h2>Preferencias de WhatsApp</h2>
      <p>Autoriza por separado los recordatorios operativos de tu cita. Puedes retirar este permiso cuando quieras.</p>
      <form id="v76WhatsappForm">
        <label>Número de WhatsApp en formato internacional
          <input id="v76Phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="+51912345678" maxlength="16">
        </label>
        <label class="check" style="margin-top:16px"><input id="v76Consent" type="checkbox" name="consent">
          Autorizo recibir avisos operativos de citas por WhatsApp.</label>
        <div class="v76-note"><b>Importante:</b> guardar la preferencia NO activa los envíos.
          La automatización requiere integrar y configurar la API oficial de WhatsApp Business.
          No se enviarán diagnósticos ni resultados clínicos por este canal.</div>
        <div class="v76-modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Volver</button>
          <button type="submit" class="btn btn-primary">Guardar preferencia</button></div>
      </form>`,true);
    const form=$v('v76WhatsappForm'),phone=$v('v76Phone'),check=$v('v76Consent');
    const savedPhone=String(state.user?.patient?.phone||'').replace(/[\s()-]/g,'');
    phone.value=/^9[0-9]{8}$/.test(savedPhone)?'+51'+savedPhone:savedPhone;
    try{
      const p=await api().whatsAppPreferences();
      if(!form.isConnected)return;
      phone.value=p.numero||phone.value;
      check.checked=!!p.autorizado;
    }catch(_err){notify('Las preferencias estarán disponibles después de activar la migración SQL v7.6');}
    form.onsubmit=async e=>{
      e.preventDefault();const btn=form.querySelector('[type=submit]'),number=phone.value.trim();
      if(check.checked && !/^\+[1-9][0-9]{7,14}$/.test(number))
        return notify('Usa el formato +51912345678');
      busy(btn,'Guardando...');
      try{
        await api().saveWhatsAppPreferences(number,check.checked);
        closeModal();notify(check.checked?'Permiso guardado. Los envíos automáticos aún no están activos.':'Autorización de WhatsApp retirada.');
      }catch(err){notify(message(err));free(btn);}
    };
  }

  const originalGo=window.go;
  if(typeof originalGo==='function'){
    window.go=function(page){
      if(typeof state!=='undefined' && state.role==='patient' && page==='patient-appointments' && active()){
        return renderAppointmentsV76();
      }
      return originalGo.apply(this,arguments);
    };
  }
  document.addEventListener('click',event=>{
    if(typeof state==='undefined'||state.role!=='patient')return;
    const action=event.target.closest('[data-v76-action]');
    if(action){
      event.preventDefault();event.stopPropagation();
      const a=(window.__novaV76Appointments||[]).find(x=>x.id===action.dataset.cita);
      if(!a||!editable(a))return notify('Esta cita ya no admite cambios.');
      return action.dataset.v76Action==='cancelar'?openCancel(a):openReprogram(a);
    }
    if(event.target.closest('[data-v76-whatsapp]')){
      event.preventDefault();event.stopPropagation();return openWhatsApp();
    }
    if(event.target.closest('[data-v76-reload]')){
      event.preventDefault();event.stopPropagation();return renderAppointmentsV76();
    }
  });
})();
