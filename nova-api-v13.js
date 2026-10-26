// Nova Salud -> Supabase · Adaptador v9
// Auth real + pacientes + citas + historial clínico + laboratorio real + enfermería + facturación/caja real + inventario real + dashboard/auditoría real.
(function(){
  const cfg = window.NOVA_SUPABASE;
  const api = {
    enabled:false,
    client:null,
    async init(){
      if(!cfg || !cfg.url || !cfg.publishableKey || cfg.url.includes('TU-PROYECTO')) return {ok:false,reason:'NO_CONFIG'};
      if(!window.supabase?.createClient) return {ok:false,reason:'SDK_MISSING'};
      if(!this.client){
        this.client=window.supabase.createClient(cfg.url,cfg.publishableKey,{
          auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}
        });
      }
      const {data,error}=await this.client.from('sede')
        .select('id_sede,codigo_sede,nombre,distrito,telefono')
        .eq('estado','ACTIVA').order('id_sede').limit(5);
      if(error)return {ok:false,reason:error.message};
      this.enabled=true;
      return {ok:true,sedes:data};
    },
    async sedes(){
      if(!this.client)await this.init();
      const {data,error}=await this.client.from('sede').select('*').eq('estado','ACTIVA').order('id_sede');
      if(error)throw error; return data||[];
    },
    async session(){
      if(!this.client)return null;
      const {data,error}=await this.client.auth.getSession();
      if(error)throw error; return data.session;
    },
    async signInStaff(email,password){
      if(!this.client)await this.init();
      const {error}=await this.client.auth.signInWithPassword({email,password});
      if(error)throw error;
      const {data,error:profileError}=await this.client.rpc('mi_perfil_staff');
      if(profileError){await this.client.auth.signOut();throw profileError}
      if(!data){await this.client.auth.signOut();throw new Error('La cuenta existe en Auth, pero no está aprovisionada como personal de Nova Salud.');}
      return data;
    },
    async signInPatient(email,password){
      if(!this.client)await this.init();
      const {error}=await this.client.auth.signInWithPassword({email,password});
      if(error)throw error;
      const {data,error:profileError}=await this.client.rpc('mi_perfil_paciente');
      if(profileError){await this.client.auth.signOut();throw profileError}
      if(!data){await this.client.auth.signOut();throw new Error('La cuenta no está vinculada con un paciente de Nova Salud.');}
      return data;
    },
    async signUpPatient(form){
      if(!this.client)await this.init();
      const metadata={
        account_type:'patient',dni:form.dni,first_name:form.first,last_name:form.last,
        birth:form.birth,phone:form.phone,branch:form.branch,address:form.address,
        district:form.district,insurance:form.insurance,policy:form.policy||'',
        emergency_name:form.emergencyName||'',emergency_phone:form.emergencyPhone||'',
        allergies:form.allergies||'',marketing:!!form.marketing
      };
      const {data,error}=await this.client.auth.signUp({email:form.email,password:form.password,options:{data:metadata}});
      if(error)throw error;
      let profile=null;
      if(data.session){
        const r=await this.client.rpc('mi_perfil_paciente');
        if(r.error)throw r.error; profile=r.data;
      }
      return {user:data.user,session:data.session,profile,needsEmailConfirmation:!!data.user&&!data.session};
    },
    async staffProfile(){
      const {data,error}=await this.client.rpc('mi_perfil_staff');
      if(error)throw error; return data;
    },
    async patientProfile(){
      const {data,error}=await this.client.rpc('mi_perfil_paciente');
      if(error)throw error; return data;
    },
    async restoreContext(){
      const s=await this.session(); if(!s)return null;
      try{const staff=await this.staffProfile();if(staff)return staff}catch(_e){}
      try{const patient=await this.patientProfile();if(patient)return patient}catch(_e){}
      return null;
    },
    async signOut(){if(this.client)await this.client.auth.signOut();},
    async patientNotifications(){
      const {data,error}=await this.client.from('notificacion_paciente').select('*').order('fecha_hora',{ascending:false}).limit(20);
      if(error)throw error;return data||[];
    },

    // ---------------- Pacientes reales ----------------
    async staffPatients({search='',status='',branch='',limit=100}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_pacientes',{
        p_busqueda:search||null,p_estado:status||null,p_sede:branch||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async searchPatients(search,limit=10){
      const {data,error}=await this.client.rpc('api_staff_buscar_pacientes',{
        p_busqueda:search,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createStaffPatient(form){
      const {data,error}=await this.client.rpc('api_staff_crear_paciente',{
        p_dni:form.dni,p_nombres:form.first,p_apellidos:form.last,p_telefono:form.phone||null,
        p_correo:form.email||null,p_sede:form.branch||null,p_seguro:form.insurance||'Particular',
        p_canal:form.channel||'PRESENCIAL'
      });
      if(error)throw error;return data;
    },

    // ---------------- Médicos / citas reales ----------------
    async activeDoctors(branch=''){
      const {data,error}=await this.client.rpc('api_listar_medicos_activos',{p_sede:branch||null});
      if(error)throw error;return data||[];
    },
    async staffAppointments({branch='',doctor='',status='',from=null,to=null,limit=200}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_citas',{
        p_sede:branch||null,p_medico_code:doctor||null,p_estado:status||null,
        p_fecha_desde:from||null,p_fecha_hasta:to||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createStaffAppointment(form){
      const {data,error}=await this.client.rpc('api_staff_crear_cita',{
        p_paciente_code:form.patientCode,p_medico_code:form.doctorCode,p_sede:form.branch,
        p_fecha:form.date,p_hora:form.time,p_motivo:form.reason||''
      });
      if(error)throw error;return data;
    },
    async patientAppointments(){
      const {data,error}=await this.client.rpc('api_paciente_listar_citas');
      if(error)throw error;return data||[];
    },
    async createPatientAppointment(form){
      const {data,error}=await this.client.rpc('api_paciente_crear_cita',{
        p_medico_code:form.doctorCode,p_sede:form.branch,p_fecha:form.date,
        p_hora:form.time,p_motivo:form.reason||''
      });
      if(error)throw error;return data;
    },

    // ---------------- Autogestión del paciente · v7.6 ----------------
    // Requiere ejecutar sql/48_Portal_Paciente_Autogestion_v76.sql en Supabase.
    async cancelPatientAppointment(code){
      const {data,error}=await this.client.rpc('api_paciente_cancelar_cita',{p_cita_code:code});
      if(error)throw error;return data;
    },
    async reschedulePatientAppointment({code,doctorCode,branch,date,hour}){
      const {data,error}=await this.client.rpc('api_paciente_reprogramar_cita',{
        p_cita_code:code,p_medico_code:doctorCode,p_sede:branch,p_fecha:date,p_hora:hour
      });
      if(error)throw error;return data;
    },
    async whatsAppPreferences(){
      const {data,error}=await this.client.rpc('api_paciente_whatsapp_preferencias');
      if(error)throw error;return data||{numero:'',autorizado:false};
    },
    async saveWhatsAppPreferences(number,authorized){
      const {data,error}=await this.client.rpc('api_paciente_whatsapp_guardar',{
        p_numero:number,p_autorizado:!!authorized
      });
      if(error)throw error;return data;
    },

    // ---------------- Historial clínico real ----------------
    async staffHistory({search='',branch='',doctor='',limit=200}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_historial',{
        p_busqueda:search||null,p_sede:branch||null,p_medico_code:doctor||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async clinicalFile(patientCode){
      const {data,error}=await this.client.rpc('api_staff_ficha_clinica',{p_paciente_code:patientCode});
      if(error)throw error;return data;
    },
    async doctorPatientAppointments(patientCode){
      const {data,error}=await this.client.rpc('api_medico_citas_paciente',{p_paciente_code:patientCode});
      if(error)throw error;return data||[];
    },
    async createConsultation(form){
      const {data,error}=await this.client.rpc('api_medico_crear_consulta',{
        p_paciente_code:form.patientCode,
        p_cita_code:form.appointmentCode||null,
        p_diagnostico:form.diagnosis,
        p_indicaciones:form.indications||null,
        p_observaciones:form.observations||null
      });
      if(error)throw error;return data;
    },
    async saveClinicalAllergies(patientCode,allergies){
      const {data,error}=await this.client.rpc('api_medico_actualizar_alergias',{
        p_paciente_code:patientCode,p_alergias:allergies||''
      });
      if(error)throw error;return data||[];
    },
    async medicationCatalog(){
      const {data,error}=await this.client.rpc('api_catalogo_medicamentos');
      if(error)throw error;return data||[];
    },
    async createPrescription(form){
      const {data,error}=await this.client.rpc('api_medico_crear_prescripcion',{
        p_consulta_code:form.consultationCode,
        p_producto_code:form.productCode,
        p_dosis:form.dose,
        p_frecuencia:form.frequency||null,
        p_duracion:form.duration||null,
        p_instrucciones:form.instructions||null
      });
      if(error)throw error;return data;
    },
    async patientClinicalHistory(){
      const {data,error}=await this.client.rpc('api_paciente_historial_clinico');
      if(error)throw error;return data||{allergies:[],consultations:[],prescriptions:[]};
    },
    async savePatientAllergies(allergies){
      const {data,error}=await this.client.rpc('api_paciente_actualizar_alergias',{p_alergias:allergies||''});
      if(error)throw error;return data||[];
    },

    // ---------------- Laboratorio real ----------------
    async labExamCatalog(){
      const {data,error}=await this.client.rpc('api_catalogo_examenes');
      if(error)throw error;return data||[];
    },
    async staffLabOrders({search='',branch='',status='',doctor='',limit=250}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_laboratorio',{
        p_busqueda:search||null,p_sede:branch||null,p_estado:status||null,
        p_medico_code:doctor||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createLabOrder(form){
      const {data,error}=await this.client.rpc('api_medico_crear_orden_laboratorio',{
        p_paciente_code:form.patientCode,p_tipo_examen_code:form.testCode,
        p_observacion:form.observation||null,p_consulta_code:form.consultationCode||null
      });
      if(error)throw error;return data;
    },
    async takeLabSample(orderCode){
      const {data,error}=await this.client.rpc('api_lab_registrar_muestra',{p_orden_code:orderCode});
      if(error)throw error;return data;
    },
    async saveLabResult(form){
      const {data,error}=await this.client.rpc('api_lab_registrar_resultado',{
        p_orden_code:form.orderCode,p_resultado_texto:form.resultText,
        p_valor_resultado:form.value||null,p_unidad:form.unit||null,
        p_rango_referencial:form.range||null,p_observacion:form.observation||null
      });
      if(error)throw error;return data;
    },
    async validateLabResult(orderCode){
      const {data,error}=await this.client.rpc('api_lab_validar_resultado',{p_orden_code:orderCode});
      if(error)throw error;return data;
    },
    async deliverLabResult(orderCode){
      const {data,error}=await this.client.rpc('api_lab_entregar_resultado',{p_orden_code:orderCode});
      if(error)throw error;return data;
    },
    async patientLabResults(){
      const {data,error}=await this.client.rpc('api_paciente_resultados_laboratorio');
      if(error)throw error;return data||[];
    },
    async staffPatientLab(patientCode){
      const {data,error}=await this.client.rpc('api_staff_laboratorio_paciente',{p_paciente_code:patientCode});
      if(error)throw error;return data||[];
    },

    // ---------------- Enfermería real ----------------
    async activeNurses(branch=''){
      const {data,error}=await this.client.rpc('api_listar_enfermeros_activos',{p_sede:branch||null});
      if(error)throw error;return data||[];
    },
    async nursingTasks({search='',branch='',status='',priority='',nurse='',from=null,to=null,limit=300}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_enfermeria',{
        p_busqueda:search||null,p_sede:branch||null,p_estado:status||null,
        p_prioridad:priority||null,p_enfermero_code:nurse||null,
        p_fecha_desde:from||null,p_fecha_hasta:to||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createNursingTask(form){
      const {data,error}=await this.client.rpc('api_gerencia_crear_tarea_enfermeria',{
        p_paciente_code:form.patientCode,p_enfermero_code:form.nurseCode,
        p_fecha_hora:form.scheduledAt,p_tipo_tarea:form.taskType,
        p_prioridad:form.priority||'NORMAL',p_observacion:form.observation||null,
        p_cita_code:form.appointmentCode||null
      });
      if(error)throw error;return data;
    },
    async startNursingTask(taskCode){
      const {data,error}=await this.client.rpc('api_enfermeria_iniciar_tarea',{p_tarea_code:taskCode});
      if(error)throw error;return data;
    },
    async completeNursingTask(taskCode,observation=''){
      const {data,error}=await this.client.rpc('api_enfermeria_completar_tarea',{
        p_tarea_code:taskCode,p_observacion:observation||null
      });
      if(error)throw error;return data;
    },
    async cancelNursingTask(taskCode,observation=''){
      const {data,error}=await this.client.rpc('api_gerencia_cancelar_tarea_enfermeria',{
        p_tarea_code:taskCode,p_observacion:observation||null
      });
      if(error)throw error;return data;
    },

    // ---------------- Facturación y Caja real ----------------
    async staffInvoices({search='',branch='',status='',method='',from=null,to=null,limit=300}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_facturacion',{
        p_busqueda:search||null,p_sede:branch||null,p_estado:status||null,p_metodo:method||null,
        p_fecha_desde:from||null,p_fecha_hasta:to||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createInvoice(form){
      const {data,error}=await this.client.rpc('api_facturacion_crear_factura',{
        p_paciente_code:form.patientCode,p_sede:form.branch,
        p_tipo_comprobante:form.documentType||'BOLETA',p_items:form.items||[]
      });
      if(error)throw error;return data;
    },
    async invoiceDetail(invoiceCode){
      const {data,error}=await this.client.rpc('api_facturacion_ver_factura',{p_factura_code:invoiceCode});
      if(error)throw error;return data;
    },
    async registerPayment(form){
      const {data,error}=await this.client.rpc('api_caja_registrar_pago',{
        p_factura_code:form.invoiceCode,p_metodo:form.method,p_monto:form.amount||null
      });
      if(error)throw error;return data;
    },
    async patientInvoices(){
      const {data,error}=await this.client.rpc('api_paciente_facturas');
      if(error)throw error;return data||[];
    },

    // ---------------- Inventario real ----------------
    async inventoryStock({search='',branch='',warehouse='',category='',status='',limit=500}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_inventario',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,p_almacen:warehouse||null,
        p_categoria:category||null,p_estado:status||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async inventoryMovements({search='',branch='',warehouse='',type='',from=null,to=null,limit=500}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_movimientos_inventario',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,p_almacen:warehouse||null,p_tipo:type||null,
        p_fecha_desde:from||null,p_fecha_hasta:to||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createInventoryProduct(form){
      const {data,error}=await this.client.rpc('api_inventario_crear_producto',{
        p_nombre:form.name,p_categoria:form.category||null,p_presentacion:form.presentation||null,
        p_precio:Number(form.price||0),p_stock_minimo:Number(form.minimum||0),p_sede:form.branch,
        p_stock_inicial:Number(form.initialStock||0),p_fecha_vencimiento:form.expiry||null
      });
      if(error)throw error;return data;
    },
    async createInventoryMovement(form){
      const {data,error}=await this.client.rpc('api_inventario_registrar_movimiento',{
        p_almacen_code:form.warehouseCode,p_producto_code:form.productCode,p_lote_code:form.batch,
        p_tipo:form.type,p_cantidad:Number(form.quantity),p_motivo:form.reason||null
      });
      if(error)throw error;return data;
    },

    // ---------------- Dashboard + Auditoría real ----------------
    async executiveDashboard({branch='',from=null,to=null}={}){
      const {data,error}=await this.client.rpc('api_dashboard_gerencia_resumen',{
        p_sede:(!branch||branch==='Todas las sedes')?null:branch,
        p_fecha_desde:from||null,p_fecha_hasta:to||null
      });
      if(error)throw error;return data||{};
    },
    async auditLogs({search='',action='',entity='',from=null,to=null,limit=300}={}){
      const {data,error}=await this.client.rpc('api_auditoria_listar',{
        p_busqueda:search||null,p_accion:action||null,p_tabla:entity||null,
        p_fecha_desde:from||null,p_fecha_hasta:to||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async auditSummary({from=null,to=null}={}){
      const {data,error}=await this.client.rpc('api_auditoria_resumen',{
        p_fecha_desde:from||null,p_fecha_hasta:to||null
      });
      if(error)throw error;return data||{};
    }
,

    // ---------------- Validaciones + Emergencias reales ----------------
    async validations({search='',branch='',status='',limit=300}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_validaciones',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,
        p_estado:status||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async resolveValidation(patientCode,action,reason=''){
      const {data,error}=await this.client.rpc('api_validacion_resolver',{
        p_paciente_code:patientCode,p_accion:action,p_motivo:reason||null
      });
      if(error)throw error;return data;
    },
    async emergencies({search='',branch='',status='',identity='',limit=300}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_emergencias',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,
        p_estado:status||null,p_identidad:identity||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createEmergency(form){
      const {data,error}=await this.client.rpc('api_emergencia_crear',{
        p_sede:form.branch,p_dni:form.dni||null,p_nombre_temporal:form.temporaryName||null,
        p_medio_llegada:form.arrival,p_triage:form.triage,p_motivo:form.reason,
        p_contacto_nombre:form.contactName||null,p_contacto_telefono:form.contactPhone||null
      });
      if(error)throw error;return data;
    },
    async identifyEmergency(form){
      const {data,error}=await this.client.rpc('api_emergencia_identificar',{
        p_emergencia_code:form.emergencyCode,p_dni:form.dni,
        p_nombres:form.first||null,p_apellidos:form.last||null
      });
      if(error)throw error;return data;
    },
    async registerEmergencyContact(form){
      const {data,error}=await this.client.rpc('api_emergencia_registrar_contacto',{
        p_emergencia_code:form.emergencyCode,p_nombre:form.name||null,
        p_parentesco:form.relation||null,p_telefono:form.phone||null,
        p_resultado:form.result||'FAMILIAR_INFORMADO',p_observacion:form.observation||null
      });
      if(error)throw error;return data;
    },
    async advanceEmergency(emergencyCode){
      const {data,error}=await this.client.rpc('api_emergencia_avanzar_estado',{p_emergencia_code:emergencyCode});
      if(error)throw error;return data;
    }

,

    // ---------------- Personal + Sedes reales ----------------
    async staffMembers({search='',branch='',role='',status='',limit=400}={}){
      const {data,error}=await this.client.rpc('api_staff_listar_personal',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,
        p_rol:role||null,p_estado:status||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createStaffMember(form){
      const {data,error}=await this.client.rpc('api_personal_crear',{
        p_dni:form.dni,p_nombres:form.first,p_apellidos:form.last,
        p_correo:form.email||null,p_telefono:form.phone||null,p_rol:form.role,
        p_especialidad_funcion:form.specialtyFunction||null,p_sede:form.branch||null,
        p_estado_laboral:form.workStatus||'ACTIVO'
      });
      if(error)throw error;return data;
    },
    async changeStaffStatus(form){
      const {data,error}=await this.client.rpc('api_personal_cambiar_estado',{
        p_personal_code:form.code,p_estado:form.status,p_fecha_hasta:form.until||null,
        p_observacion:form.observation||null
      });
      if(error)throw error;return data;
    },
    async realBranches(search=''){
      const {data,error}=await this.client.rpc('api_staff_listar_sedes',{p_busqueda:search||null});
      if(error)throw error;return data||[];
    }
,

    // ---------------- Soporte + Mantenimiento real ----------------
    async supportTickets({search='',branch='',status='',priority='',limit=300}={}){
      const {data,error}=await this.client.rpc('api_soporte_listar',{
        p_busqueda:search||null,p_sede:(!branch||branch==='Todas las sedes')?null:branch,
        p_estado:status||null,p_prioridad:priority||null,p_limite:limit
      });
      if(error)throw error;return data||[];
    },
    async createSupportTicket(form){
      const {data,error}=await this.client.rpc('api_soporte_crear',{
        p_prioridad:form.priority,p_sede:form.branch,p_descripcion:form.description
      });
      if(error)throw error;return data;
    },
    async changeSupportStatus(ticketCode,status){
      const {data,error}=await this.client.rpc('api_soporte_cambiar_estado',{
        p_ticket_code:ticketCode,p_estado:status
      });
      if(error)throw error;return data;
    },
    async publicMaintenance(){
      if(!this.client)await this.init();
      const {data,error}=await this.client.rpc('api_mantenimiento_publico');
      if(error)throw error;return data||{active:false};
    },
    async maintenanceHistory(limit=20){
      const {data,error}=await this.client.rpc('api_mantenimiento_historial',{p_limite:limit});
      if(error)throw error;return data||[];
    },
    async activateMaintenance(message,minutes=20){
      const {data,error}=await this.client.rpc('api_mantenimiento_activar',{
        p_mensaje:message,p_minutos:Number(minutes)
      });
      if(error)throw error;return data;
    },
    async finishMaintenance(){
      const {data,error}=await this.client.rpc('api_mantenimiento_finalizar');
      if(error)throw error;return data;
    }

,

    // ---------------- Dashboards reales por rol ----------------
    async doctorDashboard(date=null){
      const {data,error}=await this.client.rpc('api_dashboard_medico_real',{p_fecha:date||null});
      if(error)throw error;return data||{};
    },
    async receptionDashboard(date=null){
      const {data,error}=await this.client.rpc('api_dashboard_recepcion_real',{p_fecha:date||null});
      if(error)throw error;return data||{};
    },
    async systemsDashboard({from=null,to=null}={}){
      const {data,error}=await this.client.rpc('api_dashboard_sistemas_real',{
        p_fecha_desde:from||null,p_fecha_hasta:to||null
      });
      if(error)throw error;return data||{};
    }




  };
  window.NovaAPI=api;
})();
