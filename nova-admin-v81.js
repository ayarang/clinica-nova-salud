/* ===== nova-v68-facturacion-caja · extracted from index.html ===== */
// Nova Salud v6.8 · Facturación y Caja reales en Supabase/PostgreSQL.
(function(){
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const statusBadge=s=>`<span class="badge ${s==='PAGADO'?'ok':s==='ANULADO'?'danger':'warn'}">${esc((s||'').replaceAll('_',' '))}</span>`;
  const methodLabel=s=>({YAPE:'Yape',EFECTIVO:'Efectivo',TARJETA_DEBITO:'Tarjeta de débito',TARJETA_CREDITO:'Tarjeta de crédito',DEPOSITO:'Depósito'})[s]||s||'—';
  const docLabel=s=>({BOLETA:'Boleta',FACTURA:'Factura',RECIBO_INTERNO:'Recibo interno'})[s]||s||'—';
  let currentInvoices=[];

  function billingKpis(rows){
    const paid=rows.reduce((a,x)=>a+Number(x.paid||0),0),balance=rows.reduce((a,x)=>a+Number(x.balance||0),0);
    return `<div class="v68-kpis"><div class="v68-kpi"><small>Comprobantes visibles</small><b>${rows.length}</b></div><div class="v68-kpi"><small>Ingresos registrados</small><b>${money(paid)}</b></div><div class="v68-kpi"><small>Saldo pendiente</small><b>${money(balance)}</b></div><div class="v68-kpi"><small>Pagados</small><b>${rows.filter(x=>x.status==='PAGADO').length}</b></div></div>`;
  }

  function invoiceActions(x){
    const a=[`<button class="btn btn-outline btn-sm" data-v68-view="${esc(x.invoice_code)}">Ver</button>`];
    if(Number(x.balance||0)>0 && x.status!=='ANULADO' && ['gerencia','caja'].includes(state.role))
      a.unshift(`<button class="btn btn-primary btn-sm" data-v68-pay="${esc(x.invoice_code)}">Cobrar</button>`);
    return `<div class="v68-actions">${a.join('')}</div>`;
  }

  async function renderBillingRemote(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    const global=state.role==='gerencia',fixed=state.role==='caja';
    const defaultBranch=global?'Todas las sedes':userBranch();
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v68BillSearch" placeholder="DNI, paciente o comprobante"><select id="v68BillBranch" ${fixed?'disabled':''}>${branchOptions(true)}</select><select id="v68BillStatus"><option value="">Todos los estados</option><option value="PENDIENTE">Pendiente</option><option value="PAGADO">Pagado</option><option value="ANULADO">Anulado</option></select><select id="v68BillMethod"><option value="">Todos los métodos</option><option value="YAPE">Yape</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA_DEBITO">Tarjeta de débito</option><option value="TARJETA_CREDITO">Tarjeta de crédito</option><option value="DEPOSITO">Depósito</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span><button class="btn btn-primary" data-v68-new-invoice>+ Nuevo comprobante</button></div></div><div class="v68-note"><b>Facturación real:</b> Gerencia supervisa todas las sedes; Caja emite y cobra únicamente en su sede. Los pagos quedan persistidos y auditados en PostgreSQL.</div><div id="v68BillKpis"></div><div id="v68BillTable">${loading('Consultando facturación...')}</div>`;
    $('#v68BillBranch').value=defaultBranch;
    let timer;
    const update=async()=>{
      const box=$('#v68BillTable');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        currentInvoices=await NovaAPI.staffInvoices({search:$('#v68BillSearch').value.trim(),branch:$('#v68BillBranch').value,status:$('#v68BillStatus').value,method:$('#v68BillMethod').value,limit:400});
        $('#v68BillKpis').innerHTML=billingKpis(currentInvoices);
        box.innerHTML=currentInvoices.length?rowTable(['Comprobante','Emisión','Paciente','Sede','Tipo','Total','Pagado','Saldo','Método','Estado','Acciones'],currentInvoices.map(x=>[
          esc(x.invoice_code),esc(x.issued),`${esc(x.patient)}<br><small>DNI ${esc(x.patient_dni)}</small>`,esc(x.branch),docLabel(x.document_type),
          `<span class="v68-money">${money(x.total)}</span>`,money(x.paid),money(x.balance),esc(methodLabel(x.method)),statusBadge(x.status),invoiceActions(x)
        ])):'<div class="notice">No existen comprobantes que coincidan con los filtros.</div>';
      }catch(e){box.innerHTML=errBox(e)}
    };
    $('#v68BillSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};
    $('#v68BillBranch').onchange=update;$('#v68BillStatus').onchange=update;$('#v68BillMethod').onchange=update;
    await update();
  }

  async function openNewInvoiceRemote(){
    if(!['gerencia','caja'].includes(state.role))return showToast('Acceso denegado');
    const fixed=state.role==='caja',initialBranch=fixed?userBranch():'Chorrillos';
    modal(`<span class="eyebrow">Facturación PostgreSQL</span><h2>Nuevo comprobante</h2><form id="v68InvoiceForm"><div class="formgrid"><label>Sede<select id="v68InvoiceBranch" name="branch" ${fixed?'disabled':''}>${fixed?`<option>${esc(userBranch())}</option>`:branchOptions()}</select></label><label>Tipo<select name="documentType"><option value="BOLETA">Boleta</option><option value="FACTURA">Factura</option><option value="RECIBO_INTERNO">Recibo interno</option></select></label></div><div class="formsec"><h3>Paciente · búsqueda global</h3><div class="lookupbox"><input id="v68PatientSearch" placeholder="DNI, código o nombre" autocomplete="off"><div id="v68PatientResults" class="lookup-results hidden"></div><input type="hidden" id="v68PatientCode" name="patientCode"><div id="v68PatientCard" class="selected-card hidden"></div></div></div><div class="formsec"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><h3 style="margin:0">Conceptos</h3><button type="button" class="btn btn-outline btn-sm" id="v68AddLine">+ Agregar línea</button></div><div id="v68Lines" class="v68-lines" style="margin-top:10px"></div><div class="v68-total">Total: <strong id="v68Total">S/ 0.00</strong></div></div><button class="btn btn-primary" style="margin-top:15px">Emitir comprobante</button></form>`);
    const branch=$('#v68InvoiceBranch');branch.value=initialBranch;
    const q=$('#v68PatientSearch'),res=$('#v68PatientResults'),code=$('#v68PatientCode'),card=$('#v68PatientCard'),lines=$('#v68Lines');let timer;
    const calc=()=>{let t=0;lines.querySelectorAll('.v68-line').forEach(r=>t+=(Number(r.querySelector('[name="qty"]').value)||0)*(Number(r.querySelector('[name="price"]').value)||0));$('#v68Total').textContent=money(t)};
    const addLine=(concept='',price='')=>{const row=document.createElement('div');row.className='v68-line';row.innerHTML=`<label>Tipo<select name="itemType"><option value="SERVICIO">Servicio</option><option value="LABORATORIO">Laboratorio</option><option value="PRODUCTO">Producto</option></select></label><label class="v68-concept">Concepto<input name="concept" value="${esc(concept)}" placeholder="Ej. Consulta médica" required></label><label>Cant.<input name="qty" type="number" min="0.01" step="0.01" value="1" required></label><label>Precio<input name="price" type="number" min="0" step="0.01" value="${esc(price)}" required></label><button type="button" class="btn btn-outline btn-sm" data-v68-remove-line>×</button>`;lines.appendChild(row);row.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',calc));row.querySelector('[data-v68-remove-line]').onclick=()=>{if(lines.children.length>1)row.remove();calc()};calc()};
    addLine('Consulta médica general','80.00');$('#v68AddLine').onclick=()=>addLine();
    q.oninput=()=>{clearTimeout(timer);timer=setTimeout(async()=>{code.value='';card.classList.add('hidden');if(q.value.trim().length<2){res.classList.add('hidden');return}try{const rows=await NovaAPI.searchPatients(q.value.trim(),10);res.innerHTML=rows.length?rows.map(p=>`<button type="button" class="lookup-item" data-v68-patient="${esc(p.code)}" data-name="${esc(p.name)}" data-dni="${esc(p.dni)}"><b>${esc(p.name)}</b><small>DNI ${esc(p.dni)} · ${esc(p.code)} · ${esc(p.branch)}</small></button>`).join(''):'<div class="lookup-item"><small>Sin coincidencias.</small></div>';res.classList.remove('hidden')}catch(e){res.innerHTML=`<div class="lookup-item"><small>${esc(e.message)}</small></div>`;res.classList.remove('hidden')}},250)};
    res.onclick=e=>{const x=e.target.closest('[data-v68-patient]');if(!x)return;code.value=x.dataset.v68Patient;q.value=`${x.dataset.dni} · ${x.dataset.name}`;card.innerHTML=`<strong>${esc(x.dataset.name)}</strong><span>${esc(code.value)} · DNI ${esc(x.dataset.dni)}</span>`;card.classList.remove('hidden');res.classList.add('hidden')};
    $('#v68InvoiceForm').onsubmit=async e=>{e.preventDefault();if(!code.value)return showToast('Selecciona un paciente');const fd=new FormData(e.target),items=[...lines.querySelectorAll('.v68-line')].map(r=>({type:r.querySelector('[name="itemType"]').value,concept:r.querySelector('[name="concept"]').value.trim(),quantity:Number(r.querySelector('[name="qty"]').value),unit_price:Number(r.querySelector('[name="price"]').value)}));if(items.some(x=>!x.concept||x.quantity<=0||x.unit_price<0))return showToast('Revisa los conceptos, cantidades y precios');const btn=e.target.querySelector('button[type="submit"],button.btn-primary:last-child');btn.disabled=true;btn.textContent='Emitiendo…';try{const x=await NovaAPI.createInvoice({patientCode:code.value,branch:fixed?userBranch():fd.get('branch'),documentType:fd.get('documentType'),items});closeModal();showToast(`Comprobante real emitido · ${x.invoice_code}`);go('billing')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Emitir comprobante'}};
  }

  function invoiceRow(code){return currentInvoices.find(x=>x.invoice_code===code)}
  async function openPaymentRemote(code){
    const x=invoiceRow(code);if(!x)return showToast('Actualiza la lista');
    modal(`<span class="eyebrow">Caja PostgreSQL</span><h2>Cobrar ${esc(code)}</h2><p class="muted">Paciente: ${esc(x.patient)} · saldo pendiente ${money(x.balance)}</p><form id="v68PayForm"><div class="formgrid"><label>Método<select name="method"><option value="YAPE">Yape</option><option value="EFECTIVO">Efectivo</option><option value="TARJETA_DEBITO">Tarjeta de débito</option><option value="TARJETA_CREDITO">Tarjeta de crédito</option><option value="DEPOSITO">Depósito</option></select></label><label>Monto<input name="amount" type="number" step="0.01" min="0.01" max="${esc(x.balance)}" value="${Number(x.balance).toFixed(2)}" required></label></div><button class="btn btn-primary" style="margin-top:14px">Registrar pago</button></form>`);
    $('#v68PayForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Cobrando…';try{const p=await NovaAPI.registerPayment({invoiceCode:code,method:fd.get('method'),amount:Number(fd.get('amount'))});closeModal();showToast(`Pago registrado · ${p.payment_code}`);go('billing')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Registrar pago'}};
  }

  async function viewInvoiceRemote(code){
    modal(loading('Cargando comprobante...'));
    try{const x=await NovaAPI.invoiceDetail(code);modal(`<div class="v68-receipt"><div class="v68-receipt-head"><div><span class="eyebrow">Nova Salud</span><h2>${esc(docLabel(x.document_type))} · ${esc(x.invoice_code)}</h2><div class="muted">${esc(x.issued)} · ${esc(x.branch)}</div></div><div>${statusBadge(x.status)}</div></div><div class="formgrid"><label>Paciente<input value="${esc(x.patient)}" disabled></label><label>DNI<input value="${esc(x.patient_dni)}" disabled></label></div><div class="tablewrap" style="margin-top:14px"><table class="table"><thead><tr><th>Tipo</th><th>Concepto</th><th>Cantidad</th><th>P. unitario</th><th>Subtotal</th></tr></thead><tbody>${(x.items||[]).map(i=>`<tr><td>${esc(i.type)}</td><td>${esc(i.concept)}</td><td>${esc(i.quantity)}</td><td>${money(i.unit_price)}</td><td>${money(i.subtotal)}</td></tr>`).join('')}</tbody></table></div><div class="v68-total">Total <strong>${money(x.total)}</strong> · Pagado <strong>${money(x.paid)}</strong> · Saldo <strong>${money(x.balance)}</strong></div><div class="v68-payments"><h3>Pagos</h3>${(x.payments||[]).length?rowTable(['Pago','Fecha','Método','Monto','Estado'],x.payments.map(p=>[esc(p.payment_code),esc(p.date),esc(methodLabel(p.method)),money(p.amount),statusBadge(p.status)])):'<div class="notice">Todavía no se registran pagos.</div>'}</div></div>`,true)}catch(e){modal(errBox(e),true)}
  }

  async function renderCajaDashboard(c){
    c.innerHTML=loading('Cargando caja real...');
    try{const rows=await NovaAPI.staffInvoices({branch:userBranch(),limit:120});c.innerHTML=`<div class="v68-note"><b>Caja · ${esc(userBranch())}:</b> operaciones reales de PostgreSQL.</div>${billingKpis(rows)}<div class="panel"><div class="toolbar"><h3 style="margin:0">Comprobantes recientes</h3><button class="btn btn-primary" data-page="billing">Abrir facturación</button></div>${rows.length?rowTable(['Comprobante','Paciente','Total','Saldo','Estado'],rows.slice(0,12).map(x=>[esc(x.invoice_code),esc(x.patient),money(x.total),money(x.balance),statusBadge(x.status)])):'<div class="notice">Sin comprobantes.</div>'}</div>`}catch(e){c.innerHTML=errBox(e)}
  }

  document.addEventListener('click',e=>{
    const n=e.target.closest('[data-v68-new-invoice]');if(n){e.preventDefault();e.stopImmediatePropagation();return openNewInvoiceRemote()}
    const p=e.target.closest('[data-v68-pay]');if(p){e.preventDefault();e.stopImmediatePropagation();return openPaymentRemote(p.dataset.v68Pay)}
    const v=e.target.closest('[data-v68-view]');if(v){e.preventDefault();e.stopImmediatePropagation();return viewInvoiceRemote(v.dataset.v68View)}
  },true);

  const localGoV68=window.go;
  window.go=function(page){
    if(remoteOk()&&page==='billing'&&['gerencia','caja'].includes(state.role)){
      state.page=page;renderNav();$('#pageTitle').textContent='Facturación y caja';$('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderBillingRemote($('#appContent'));
    }
    if(remoteOk()&&state.role==='caja'&&page==='dashboard'){
      state.page=page;renderNav();$('#pageTitle').textContent='Dashboard';$('#pageKicker').textContent='Caja · PostgreSQL real';return renderCajaDashboard($('#appContent'));
    }
    if(remoteOk()&&state.role==='patient'&&page==='patient-payments'){
      state.page=page;renderPatientSide();$('#pageTitle').textContent='Mis pagos';$('#pageKicker').textContent='Portal del paciente · PostgreSQL real';$('#appContent').innerHTML=loading('Cargando tus comprobantes...');NovaAPI.patientInvoices().then(rows=>{$('#appContent').innerHTML=`<div class="v68-note"><b>Facturación real:</b> aquí solo aparecen comprobantes vinculados a tu propia cuenta autenticada.</div>${rows.length?rowTable(['Comprobante','Emisión','Sede','Tipo','Total','Pagado','Saldo','Método','Estado'],rows.map(x=>[esc(x.invoice_code),esc(x.issued),esc(x.branch),esc(docLabel(x.document_type)),money(x.total),money(x.paid),money(x.balance),esc(methodLabel(x.method)),statusBadge(x.status)])):'<div class="notice">Todavía no tienes comprobantes registrados.</div>'}`}).catch(e=>{$('#appContent').innerHTML=errBox(e)});return;
    }
    return localGoV68(page);
  };
})();
;

/* ===== nova-v69-inventory · extracted from index.html ===== */
// Nova Salud v6.9 · Inventario real en Supabase/PostgreSQL.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyV69=n=>`S/ ${Number(n||0).toFixed(2)}`;
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const kpis=items=>`<div class="v69-kpis">${items.map(x=>`<div class="v69-kpi"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong>${x.sub?`<small class="muted">${esc(x.sub)}</small>`:''}</div>`).join('')}</div>`;
  let inventoryTab='stock',stockRows=[],movementRows=[];

  const stockBadge=s=>{
    const cls=s==='AGOTADO'?'v69-stock-danger':s==='CRITICO'?'v69-stock-warn':'v69-stock-ok';
    const label={AGOTADO:'Agotado',CRITICO:'Crítico',DISPONIBLE:'Disponible'}[s]||s;
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  };
  const expiryHtml=(date,status)=>{
    if(!date)return '<span class="muted">Sin fecha</span>';
    const cls=status==='VENCIDO'?'danger':status==='POR_VENCER'?'warn':'';
    const label=status==='VENCIDO'?'Vencido':status==='POR_VENCER'?'Por vencer':'';
    return `${esc(date)}${label?`<span class="v69-expiry ${cls}">${esc(label)}</span>`:''}`;
  };
  const movementLabel=t=>({ENTRADA:'Entrada',SALIDA:'Salida',VENTA:'Venta',USO_CLINICO:'Uso clínico',AJUSTE:'Ajuste',TRANSFERENCIA:'Transferencia',DISPENSACION:'Dispensación'})[t]||t;

  function topBar(){
    const global=state.role==='gerencia',defaultBranch=global?'Todas las sedes':userBranch();
    return `<div class="workflow-toolbar"><div class="left"><input id="v69Search" placeholder="Producto, código o lote"><select id="v69Branch" ${global?'':'disabled'}>${branchOptions(true)}</select><select id="v69Status"><option value="">Todos los estados</option><option value="CRITICO">Crítico</option><option value="AGOTADO">Agotado</option><option value="DISPONIBLE">Disponible</option><option value="POR_VENCER">Por vencer</option><option value="VENCIDO">Vencido</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span><button class="btn btn-outline" data-v69-movement>Registrar movimiento</button><button class="btn btn-primary" data-v69-new-product>+ Nuevo producto</button></div></div><div class="v69-note"><b>Inventario real:</b> Gerencia supervisa toda la red; Almacén opera únicamente su sede. Cada movimiento actualiza el stock de forma atómica y queda auditado en PostgreSQL.</div><div class="v69-tabs"><button class="v69-tab ${inventoryTab==='stock'?'active':''}" data-v69-tab="stock">Existencias</button><button class="v69-tab ${inventoryTab==='movements'?'active':''}" data-v69-tab="movements">Movimientos</button></div>`;
  }

  async function renderInventoryRemote(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    c.innerHTML=topBar()+`<div id="v69InventoryBody">${loading('Consultando inventario...')}</div>`;
    q('#v69Branch').value=state.role==='gerencia'?'Todas las sedes':userBranch();
    let timer;
    const update=async()=>{
      const body=q('#v69InventoryBody');body.innerHTML=loading(inventoryTab==='stock'?'Consultando existencias...':'Consultando movimientos...');
      try{
        if(inventoryTab==='stock'){
          stockRows=await NovaAPI.inventoryStock({search:q('#v69Search').value.trim(),branch:q('#v69Branch').value,status:q('#v69Status').value,limit:800});
          const rows=stockRows,total=rows.reduce((a,x)=>a+Number(x.quantity||0),0),critical=rows.filter(x=>['CRITICO','AGOTADO'].includes(x.stock_status)).length,soon=rows.filter(x=>['POR_VENCER','VENCIDO'].includes(x.expiry_status)).length,value=rows.reduce((a,x)=>a+Number(x.estimated_value||0),0);
          body.innerHTML=`${kpis([{label:'Posiciones visibles',value:rows.length},{label:'Unidades en stock',value:total.toLocaleString('es-PE')},{label:'Stock crítico / agotado',value:critical},{label:'Valor estimado',value:moneyV69(value),sub:`${soon} lote(s) por vencer/vencidos`}])}${rows.length?rowTable(['Producto','Categoría','Almacén','Sede','Lote','Vence','Stock','Mínimo','Precio','Estado'],rows.map(x=>[
            `${esc(x.product)}<br><small>${esc(x.product_code)} · ${esc(x.presentation||'—')}</small>`,esc(x.category),esc(x.warehouse),esc(x.branch),esc(x.batch),expiryHtml(x.expiry,x.expiry_status),Number(x.quantity).toLocaleString('es-PE'),Number(x.stock_minimum).toLocaleString('es-PE'),moneyV69(x.price),stockBadge(x.stock_status)
          ])):'<div class="notice">No hay existencias que coincidan con los filtros.</div>'}`;
        }else{
          movementRows=await NovaAPI.inventoryMovements({search:q('#v69Search').value.trim(),branch:q('#v69Branch').value,limit:800});
          const rows=movementRows,entries=rows.filter(x=>x.movement_type==='ENTRADA').reduce((a,x)=>a+Number(x.quantity||0),0),outs=rows.filter(x=>['SALIDA','VENTA','USO_CLINICO','DISPENSACION'].includes(x.movement_type)).reduce((a,x)=>a+Number(x.quantity||0),0);
          body.innerHTML=`${kpis([{label:'Movimientos visibles',value:rows.length},{label:'Unidades ingresadas',value:entries.toLocaleString('es-PE')},{label:'Unidades de salida',value:outs.toLocaleString('es-PE')},{label:'Última operación',value:rows[0]?String(rows[0].movement_code):'—'}])}${rows.length?rowTable(['Movimiento','Fecha','Tipo','Producto','Cantidad','Almacén','Sede','Lote','Usuario','Motivo'],rows.map(x=>[
            esc(x.movement_code),esc(String(x.occurred_at||'').replace('T',' ').slice(0,16)),esc(movementLabel(x.movement_type)),`${esc(x.product)}<br><small>${esc(x.product_code)}</small>`,Number(x.quantity).toLocaleString('es-PE'),esc(x.warehouse),esc(x.branch),esc(x.batch),esc(x.user_name||'—'),esc(x.reason||'—')
          ])):'<div class="notice">No hay movimientos que coincidan con los filtros.</div>'}`;
        }
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v69Search').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};
    q('#v69Branch').onchange=update;q('#v69Status').onchange=update;
    q('#appContent').querySelectorAll('[data-v69-tab]').forEach(b=>b.onclick=()=>{inventoryTab=b.dataset.v69Tab;renderInventoryRemote(c)});
    await update();
  }

  async function openNewProduct(){
    if(!remoteOk())return showToast('Conecta Supabase para crear productos reales');
    const fixed=state.role==='almacen';
    modal(`<span class="eyebrow">Inventario PostgreSQL</span><h2>Nuevo producto</h2><form id="v69ProductForm"><div class="v69-grid"><label>Nombre<input name="name" required></label><label>Categoría<select name="category"><option>Medicamento</option><option>Insumo</option><option>Material médico</option><option>Otro</option></select></label><label>Presentación<input name="presentation" placeholder="Ej. Caja x 20 unidades" required></label><label>Precio unitario<input name="price" type="number" min="0" step="0.01" required></label><label>Stock mínimo<input name="minimum" type="number" min="0" value="20" required></label><label>Stock inicial<input name="initialStock" type="number" min="0" value="0" required></label><label>Sede<select name="branch" ${fixed?'disabled':''}>${fixed?`<option>${esc(userBranch())}</option>`:branchOptions()}</select></label><label>Vencimiento inicial<input name="expiry" type="date"></label></div><p class="v69-select-note">El producto se crea con un lote inicial en el almacén principal de la sede elegida.</p><button class="btn btn-primary" style="margin-top:14px">Crear producto</button></form>`);
    q('#v69ProductForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const x=await NovaAPI.createInventoryProduct({name:fd.get('name'),category:fd.get('category'),presentation:fd.get('presentation'),price:fd.get('price'),minimum:fd.get('minimum'),initialStock:fd.get('initialStock'),branch:fixed?userBranch():fd.get('branch'),expiry:fd.get('expiry')});closeModal();showToast(`Producto real creado · ${x.product_code}`);inventoryTab='stock';go('inventory')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Crear producto'}};
  }

  async function openMovement(){
    if(!remoteOk())return showToast('Conecta Supabase para registrar movimientos');
    let rows=[];try{rows=await NovaAPI.inventoryStock({branch:state.role==='gerencia'?'':userBranch(),limit:1000})}catch(e){return showToast(e.message||String(e))}
    if(!rows.length)return showToast('No hay posiciones de stock disponibles');
    const options=rows.map((x,i)=>`<option value="${i}">${esc(x.product)} · ${esc(x.branch)} · ${esc(x.warehouse)} · ${esc(x.batch)} · stock ${esc(x.quantity)}</option>`).join('');
    modal(`<span class="eyebrow">Inventario PostgreSQL</span><h2>Registrar movimiento</h2><form id="v69MovementForm"><label>Producto / lote<select id="v69Position" name="position">${options}</select></label><div id="v69PositionInfo" class="selected-card"></div><div class="v69-grid" style="margin-top:12px"><label>Tipo<select name="type"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="USO_CLINICO">Uso clínico</option><option value="VENTA">Venta</option><option value="AJUSTE_ENTRADA">Ajuste positivo</option><option value="AJUSTE_SALIDA">Ajuste negativo</option></select></label><label>Cantidad<input name="quantity" type="number" min="1" value="1" required></label></div><label style="margin-top:10px">Motivo<textarea name="reason" placeholder="Motivo del movimiento" required></textarea></label><button class="btn btn-primary" style="margin-top:14px">Guardar movimiento</button></form>`);
    const sel=q('#v69Position'),info=q('#v69PositionInfo');
    const refreshInfo=()=>{const x=rows[Number(sel.value)||0];info.innerHTML=`<strong>${esc(x.product)}</strong><span>${esc(x.product_code)} · ${esc(x.warehouse_code)} · ${esc(x.batch)} · ${esc(x.branch)} · stock actual ${esc(x.quantity)}</span>`};sel.onchange=refreshInfo;refreshInfo();
    q('#v69MovementForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),x=rows[Number(fd.get('position'))||0],btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const r=await NovaAPI.createInventoryMovement({warehouseCode:x.warehouse_code,productCode:x.product_code,batch:x.batch,type:fd.get('type'),quantity:fd.get('quantity'),reason:fd.get('reason')});closeModal();showToast(`Movimiento ${r.movement_code} · stock ${r.new_stock}`);inventoryTab='movements';go('inventory')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Guardar movimiento'}};
  }

  async function renderWarehouseDashboard(c){
    c.innerHTML=loading('Cargando inventario real...');
    try{
      const [stock,mov]=await Promise.all([NovaAPI.inventoryStock({branch:userBranch(),limit:1000}),NovaAPI.inventoryMovements({branch:userBranch(),limit:100})]);
      const units=stock.reduce((a,x)=>a+Number(x.quantity||0),0),critical=stock.filter(x=>['CRITICO','AGOTADO'].includes(x.stock_status)),soon=stock.filter(x=>['POR_VENCER','VENCIDO'].includes(x.expiry_status));
      c.innerHTML=`<div class="v69-note"><b>Almacén · ${esc(userBranch())}:</b> indicadores calculados directamente desde PostgreSQL.</div>${kpis([{label:'Unidades en stock',value:units.toLocaleString('es-PE')},{label:'Posiciones críticas',value:critical.length},{label:'Por vencer / vencidos',value:soon.length},{label:'Movimientos recientes',value:mov.length}])}<div class="panel"><div class="toolbar"><h3 style="margin:0">Alertas de reposición</h3><button class="btn btn-primary" data-page="inventory">Abrir inventario</button></div>${critical.length?rowTable(['Producto','Lote','Stock','Mínimo','Estado'],critical.slice(0,12).map(x=>[esc(x.product),esc(x.batch),esc(x.quantity),esc(x.stock_minimum),stockBadge(x.stock_status)])):'<div class="notice">No hay posiciones críticas.</div>'}</div>`;
    }catch(e){c.innerHTML=errBox(e)}
  }

  document.addEventListener('click',e=>{
    const np=e.target.closest('[data-v69-new-product]');if(np){e.preventDefault();e.stopImmediatePropagation();return openNewProduct()}
    const mv=e.target.closest('[data-v69-movement]');if(mv){e.preventDefault();e.stopImmediatePropagation();return openMovement()}
  },true);

  const localGoV69=window.go;
  window.go=function(page){
    if(remoteOk()&&page==='inventory'&&['gerencia','almacen'].includes(state.role)){
      state.page=page;renderNav();q('#pageTitle').textContent='Inventario';q('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderInventoryRemote(q('#appContent'));
    }
    if(remoteOk()&&state.role==='almacen'&&page==='dashboard'){
      state.page=page;renderNav();q('#pageTitle').textContent='Dashboard';q('#pageKicker').textContent='Almacén · PostgreSQL real';return renderWarehouseDashboard(q('#appContent'));
    }
    return localGoV69(page);
  };
})();
;

/* ===== nova-v70-dashboard-auditoria · extracted from index.html ===== */
// Nova Salud v7.0 · Dashboard ejecutivo y Auditoría reales.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const iso=d=>d.toISOString().slice(0,10);
  const today=()=>{const d=new Date();return iso(d)};
  const monthStart=()=>{const d=new Date();d.setDate(1);return iso(d)};
  const num=n=>Number(n||0).toLocaleString('es-PE');
  const oldDashboard=window.renderDashboard;
  const oldAudit=window.renderAudit;

  function dashboardKpis(k){
    const items=[
      ['Total de pacientes activos',num(k.active_patients)],['Pacientes registrados en el periodo',num(k.registered_patients)],
      ['Citas del periodo',num(k.appointments)],['Consultas',num(k.consultations)],
      ['Ingresos',money(k.income)],['Saldo pendiente',money(k.outstanding_balance)],
      ['Órdenes laboratorio',num(k.lab_orders)],['Stock crítico',num(k.critical_stock)]
    ];
    return `<div class="v70-kpis">${items.map(x=>`<div class="v70-kpi"><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join('')}</div>`;
  }

  async function renderDashboardReal(c){
    c.innerHTML=`<div class="toolbar"><div class="left"><select id="v70DashBranch">${branchOptions(true)}</select><label>Desde<input id="v70DashFrom" type="date" value="${monthStart()}"></label><label>Hasta<input id="v70DashTo" type="date" value="${today()}"></label></div><div class="right"><span class="badge ok">PostgreSQL real</span></div></div><div class="v70-note"><b>Dashboard ejecutivo real:</b> los indicadores se calculan desde pacientes, citas, consultas, laboratorio, facturación, enfermería, emergencias e inventario almacenados en PostgreSQL.</div><div id="v70DashboardBody">${loading('Calculando indicadores...')}</div>`;
    q('#v70DashBranch').value='Todas las sedes';
    const update=async()=>{
      const body=q('#v70DashboardBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const d=await NovaAPI.executiveDashboard({branch:q('#v70DashBranch').value,from:q('#v70DashFrom').value,to:q('#v70DashTo').value});
        const k=d.kpis||{},branches=d.branches||[],daily=d.daily||[];
        const recent=[...daily].slice(-10);
        body.innerHTML=`${dashboardKpis(k)}<div class="v70-alerts"><div class="v70-alert"><span>Laboratorio pendiente</span><b>${num(k.lab_pending)}</b></div><div class="v70-alert"><span>Enfermería pendiente</span><b>${num(k.nursing_pending)}</b></div><div class="v70-alert"><span>Emergencias del periodo</span><b>${num(k.emergencies)}</b></div></div><div class="v70-grid" style="margin-top:14px"><div class="v70-card"><h3>Resumen por sede</h3>${branches.length?rowTable(['Sede','Citas','Consultas','Laboratorio','Ingresos','Stock crítico'],branches.map(x=>[esc(x.branch),num(x.appointments),num(x.consultations),num(x.lab_orders),money(x.income),num(x.critical_stock)])):'<div class="notice">Sin actividad para el periodo seleccionado.</div>'}</div><div class="v70-card"><h3>Últimos días del periodo</h3>${recent.length?rowTable(['Fecha','Citas','Consultas','Lab.','Ingresos'],recent.map(x=>[esc(x.date),num(x.appointments),num(x.consultations),num(x.lab_orders),money(x.income)])):'<div class="notice">Sin datos diarios.</div>'}</div></div>`;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v70DashBranch').onchange=update;q('#v70DashFrom').onchange=update;q('#v70DashTo').onchange=update;
    await update();
  }

  async function renderAuditReal(c){
    if(!remoteOk())return oldAudit(c);
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v70AuditSearch" placeholder="Usuario, tabla, registro o detalle"><select id="v70AuditAction"><option value="">Todas las acciones</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option><option>LOGIN</option></select><select id="v70AuditEntity"><option value="">Todas las entidades</option><option value="paciente">paciente</option><option value="cita">cita</option><option value="consulta">consulta</option><option value="prescripcion">prescripcion</option><option value="orden_laboratorio">orden_laboratorio</option><option value="tarea_enfermeria">tarea_enfermeria</option><option value="factura">factura</option><option value="pago">pago</option><option value="producto">producto</option><option value="movimiento_inventario">movimiento_inventario</option></select><input id="v70AuditFrom" type="date" value="${monthStart()}"><input id="v70AuditTo" type="date" value="${today()}"></div><div class="right"><span class="badge ok">PostgreSQL real</span></div></div><div class="v70-note"><b>Auditoría real:</b> muestra la trazabilidad registrada por las operaciones de los módulos conectados. Gerencia y Sistemas tienen acceso de consulta.</div><div id="v70AuditBody">${loading('Consultando auditoría...')}</div>`;
    let timer;
    const update=async()=>{
      const body=q('#v70AuditBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const args={search:q('#v70AuditSearch').value.trim(),action:q('#v70AuditAction').value,entity:q('#v70AuditEntity').value,from:q('#v70AuditFrom').value,to:q('#v70AuditTo').value,limit:500};
        const [rows,sum]=await Promise.all([NovaAPI.auditLogs(args),NovaAPI.auditSummary({from:args.from,to:args.to})]);
        body.innerHTML=`<div class="v70-audit-kpis"><div class="v70-audit-kpi"><small>Eventos</small><b>${num(sum.total)}</b></div><div class="v70-audit-kpi"><small>INSERT</small><b>${num(sum.inserts)}</b></div><div class="v70-audit-kpi"><small>UPDATE</small><b>${num(sum.updates)}</b></div><div class="v70-audit-kpi"><small>Actores</small><b>${num(sum.actors)}</b></div><div class="v70-audit-kpi"><small>Entidades</small><b>${num(sum.entities)}</b></div></div>${rows.length?rowTable(['Fecha','Actor','Acción','Entidad','Registro','Detalle','Cambios'],rows.map(x=>[esc(String(x.occurred_at||'').replace('T',' ').slice(0,19)),`${esc(x.actor_name)}<br><small>${esc(x.actor_code)} · ${esc(x.actor_type)}</small>`, `<span class="badge ${x.action==='INSERT'?'ok':x.action==='DELETE'?'danger':'warn'}">${esc(x.action)}</span>`,esc(x.entity),esc(x.record_id||'—'),esc(x.detail||'—'),`<button class="btn btn-outline btn-sm" data-v70-audit-json="${esc(x.audit_id)}">Ver</button>`])):'<div class="notice">No existen eventos que coincidan con los filtros.</div>'}`;
        window.__novaV70AuditRows=rows;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v70AuditSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};
    q('#v70AuditAction').onchange=update;q('#v70AuditEntity').onchange=update;q('#v70AuditFrom').onchange=update;q('#v70AuditTo').onchange=update;
    await update();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-v70-audit-json]');if(!b)return;
    const row=(window.__novaV70AuditRows||[]).find(x=>String(x.audit_id)===String(b.dataset.v70AuditJson));if(!row)return;
    const pretty=x=>x?JSON.stringify(x,null,2):'—';
    modal(`<span class="eyebrow">Auditoría PostgreSQL</span><h2>${esc(row.action)} · ${esc(row.entity)}</h2><p class="muted">${esc(row.actor_name)} · ${esc(row.record_id||'Sin ID')}</p><div class="v70-grid"><div><h3>Valor anterior</h3><pre class="v70-json">${esc(pretty(row.old_value))}</pre></div><div><h3>Valor nuevo</h3><pre class="v70-json">${esc(pretty(row.new_value))}</pre></div></div><div class="v70-note"><b>Detalle:</b> ${esc(row.detail||'—')}</div>`,true);
  },true);

  window.renderDashboard=function(c){
    if(remoteOk()&&state.role==='gerencia')return renderDashboardReal(c);
    return oldDashboard(c);
  };
  window.renderAudit=function(c){
    if(remoteOk()&&['gerencia','sistemas'].includes(state.role))return renderAuditReal(c);
    return oldAudit(c);
  };
})();
;

/* ===== nova-v71-validaciones-emergencias · extracted from index.html ===== */
// Nova Salud v7.1 · Validaciones y Emergencias reales en PostgreSQL/Supabase.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const label=s=>String(s||'—').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  const valBadge=s=>`<span class="badge ${s==='VALIDADO'?'ok':s==='RECHAZADO'?'danger':'warn'}">${esc(label(s))}</span>`;
  const idBadge=s=>`<span class="badge ${s==='IDENTIFICADO'?'v71-id-ok':'v71-id-pending'}">${esc(label(s))}</span>`;
  const triageBadge=s=>{const cls=s==='CRITICO'?'v71-critical':s==='MUY_URGENTE'?'v71-urgent':s==='URGENTE'?'v71-medium':'v71-low';return `<span class="badge ${cls}">${esc(label(s))}</span>`};
  const emgBadge=s=>`<span class="badge ${['ALTA','TRASLADO','HOSPITALIZACION'].includes(s)?'ok':s==='EN_ATENCION'?'warn':'info'}">${esc(label(s))}</span>`;
  const kpis=items=>`<div class="v71-kpis">${items.map(x=>`<div class="v71-kpi"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`).join('')}</div>`;
  let validationRows=[],emergencyRows=[];

  async function renderValidationsReal(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    const global=state.role==='gerencia',fixed=state.role==='recepcion';
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v71ValSearch" placeholder="DNI, paciente o código"><select id="v71ValBranch" ${fixed?'disabled':''}>${branchOptions(true)}</select><select id="v71ValStatus"><option value="">Todos</option><option value="PENDIENTE">Pendiente</option><option value="OBSERVADO">Observado</option><option value="VALIDADO">Validado</option><option value="RECHAZADO">Rechazado</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span></div></div><div class="v71-note"><b>Validación real:</b> el DNI sigue siendo único en toda Nova Salud. Recepción resuelve registros de su sede y Gerencia puede supervisar la red completa.</div><div id="v71ValBody">${loading('Consultando validaciones...')}</div>`;
    q('#v71ValBranch').value=global?'Todas las sedes':userBranch();
    let timer;
    const update=async()=>{
      const body=q('#v71ValBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        validationRows=await NovaAPI.validations({search:q('#v71ValSearch').value.trim(),branch:q('#v71ValBranch').value,status:q('#v71ValStatus').value,limit:600});
        const rows=validationRows;
        body.innerHTML=`${kpis([{label:'Registros visibles',value:rows.length},{label:'Pendientes',value:rows.filter(x=>x.validation_status==='PENDIENTE').length},{label:'Observados',value:rows.filter(x=>x.validation_status==='OBSERVADO').length},{label:'Validados',value:rows.filter(x=>x.validation_status==='VALIDADO').length}])}${rows.length?rowTable(['Solicitud','Paciente','DNI','Sede','Portal','Validación','Motivo','Acciones'],rows.map(x=>[
          esc(x.requested_at),`${esc(x.patient)}<br><small>${esc(x.patient_code)}</small>`,esc(x.dni),esc(x.branch),esc(label(x.portal_status)),valBadge(x.validation_status),`<div class="v71-wrap">${esc(x.reason||'—')}</div>`,
          ['PENDIENTE','OBSERVADO'].includes(x.validation_status)?`<div class="v71-actions"><button class="btn btn-primary btn-sm" data-v71-validation="VALIDAR" data-code="${esc(x.patient_code)}">Validar</button><button class="btn btn-outline btn-sm" data-v71-validation="OBSERVAR" data-code="${esc(x.patient_code)}">Observar</button><button class="btn btn-outline btn-sm" data-v71-validation="RECHAZAR" data-code="${esc(x.patient_code)}">Rechazar</button></div>`:'—'
        ])):'<div class="notice">No existen validaciones para los filtros seleccionados.</div>'}`;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v71ValSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};q('#v71ValBranch').onchange=update;q('#v71ValStatus').onchange=update;await update();
  }

  async function renderEmergenciesReal(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    const global=state.role==='gerencia',fixed=state.role==='recepcion';
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v71EmgSearch" placeholder="Emergencia, DNI, paciente o temporal"><select id="v71EmgBranch" ${fixed?'disabled':''}>${branchOptions(true)}</select><select id="v71EmgStatus"><option value="">Todos los estados</option><option value="INGRESADO">Ingresado</option><option value="EN_EVALUACION">En evaluación</option><option value="EN_ATENCION">En atención</option><option value="OBSERVACION">Observación</option><option value="ALTA">Alta</option><option value="HOSPITALIZACION">Hospitalización</option><option value="TRASLADO">Traslado</option></select><select id="v71EmgIdentity"><option value="">Todas las identidades</option><option value="PENDIENTE">Pendiente</option><option value="IDENTIFICADO">Identificado</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span><button class="btn btn-primary" data-v71-new-emergency>+ Nueva emergencia</button></div></div><div class="v71-note"><b>Emergencias reales:</b> la atención puede registrarse aun sin identidad. La regularización posterior vincula el episodio con la ficha global del paciente sin duplicarlo.</div><div id="v71EmgBody">${loading('Consultando emergencias...')}</div>`;
    q('#v71EmgBranch').value=global?'Todas las sedes':userBranch();
    let timer;
    const update=async()=>{
      const body=q('#v71EmgBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        emergencyRows=await NovaAPI.emergencies({search:q('#v71EmgSearch').value.trim(),branch:q('#v71EmgBranch').value,status:q('#v71EmgStatus').value,identity:q('#v71EmgIdentity').value,limit:600});
        const rows=emergencyRows,today=new Date().toISOString().slice(0,10);
        body.innerHTML=`${kpis([{label:'Emergencias visibles',value:rows.length},{label:'Ingresos hoy',value:rows.filter(x=>String(x.occurred_at||'').startsWith(today)).length},{label:'Identidad pendiente',value:rows.filter(x=>x.identity_status==='PENDIENTE').length},{label:'En atención / observación',value:rows.filter(x=>['EN_ATENCION','OBSERVACION'].includes(x.status)).length}])}${rows.length?rowTable(['Emergencia','Ingreso','Paciente','Identidad','Sede','Triaje','Estado','Contacto','Acciones'],rows.map(x=>[
          `${esc(x.emergency_code)}${x.temporary_code?`<br><small>${esc(x.temporary_code)}</small>`:''}`,esc(x.occurred_at),`${esc(x.patient)}${x.patient_dni?`<br><small>DNI ${esc(x.patient_dni)}</small>`:''}`,idBadge(x.identity_status),esc(x.branch),triageBadge(x.triage),emgBadge(x.status),`<div class="v71-wrap">${esc(label(x.contact_status))}${x.contact_name?`<br><small>${esc(x.contact_name)}${x.contact_phone?' · '+esc(x.contact_phone):''}</small>`:''}</div>`,
          `<div class="v71-actions">${x.identity_status==='PENDIENTE'?`<button class="btn btn-primary btn-sm" data-v71-identify="${esc(x.emergency_code)}">Identificar</button>`:''}${!['ALTA','HOSPITALIZACION','TRASLADO'].includes(x.status)?`<button class="btn btn-outline btn-sm" data-v71-advance="${esc(x.emergency_code)}">Avanzar</button>`:''}<button class="btn btn-outline btn-sm" data-v71-contact="${esc(x.emergency_code)}">Contacto</button></div>`
        ])):'<div class="notice">No existen emergencias para los filtros seleccionados.</div>'}`;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v71EmgSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};q('#v71EmgBranch').onchange=update;q('#v71EmgStatus').onchange=update;q('#v71EmgIdentity').onchange=update;await update();
  }

  function openEmergency(){
    const fixed=state.role==='recepcion';
    modal(`<span class="eyebrow">Emergencia PostgreSQL</span><h2>Registrar ingreso</h2><div class="v71-note">La atención no se bloquea por falta de documentos. Si el DNI ya existe, se vincula automáticamente con la ficha central.</div><form id="v71EmergencyForm"><div class="formgrid"><label>Sede<select name="branch" ${fixed?'disabled':''}>${fixed?`<option>${esc(userBranch())}</option>`:branchOptions()}</select></label><label>DNI (opcional)<input name="dni" maxlength="8" pattern="[0-9]{8}" placeholder="Si está disponible"></label><label>Nombre temporal<input name="temporaryName" placeholder="Paciente no identificado"></label><label>Medio de llegada<select name="arrival"><option value="AMBULANCIA">Ambulancia</option><option value="PARTICULAR">Particular</option><option value="BOMBEROS">Bomberos</option><option value="OTRO">Otro</option></select></label><label>Triaje<select name="triage"><option value="CRITICO">Crítico</option><option value="MUY_URGENTE">Muy urgente</option><option value="URGENTE" selected>Urgente</option><option value="MENOS_URGENTE">Menos urgente</option><option value="NO_URGENTE">No urgente</option></select></label><label>Motivo<input name="reason" required></label><label>Contacto familiar (opcional)<input name="contactName"></label><label>Teléfono familiar (opcional)<input name="contactPhone"></label></div><button class="btn btn-primary" style="margin-top:14px">Registrar emergencia</button></form>`);
    q('#v71EmergencyForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Registrando…';try{const x=await NovaAPI.createEmergency({branch:fixed?userBranch():fd.get('branch'),dni:fd.get('dni'),temporaryName:fd.get('temporaryName'),arrival:fd.get('arrival'),triage:fd.get('triage'),reason:fd.get('reason'),contactName:fd.get('contactName'),contactPhone:fd.get('contactPhone')});closeModal();showToast(`Emergencia registrada · ${x.emergency_code}`);go('emergencies')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Registrar emergencia'}};
  }

  function openIdentify(code){
    modal(`<span class="eyebrow">Regularización de identidad</span><h2>${esc(code)}</h2><p class="muted">Si el DNI ya existe en Nova Salud se enlaza la ficha. Si no existe, indica nombres y apellidos para crear una ficha mínima sin duplicados.</p><form id="v71IdentifyForm"><div class="formgrid"><label>DNI<input name="dni" maxlength="8" pattern="[0-9]{8}" required></label><label>Nombres<input name="first" placeholder="Solo si es paciente nuevo"></label><label>Apellidos<input name="last" placeholder="Solo si es paciente nuevo"></label></div><button class="btn btn-primary" style="margin-top:14px">Vincular identidad</button></form>`);
    q('#v71IdentifyForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{const x=await NovaAPI.identifyEmergency({emergencyCode:code,dni:fd.get('dni'),first:fd.get('first'),last:fd.get('last')});closeModal();showToast(x.created_patient?`Paciente creado y vinculado · ${x.patient_code}`:`Identidad vinculada · ${x.patient_code}`);go('emergencies')}catch(err){showToast(err.message||String(err));btn.disabled=false}};
  }

  function openContact(code){
    modal(`<span class="eyebrow">Contacto familiar</span><h2>${esc(code)}</h2><form id="v71ContactForm"><div class="formgrid"><label>Nombre<input name="name"></label><label>Parentesco<input name="relation"></label><label>Teléfono<input name="phone"></label><label>Resultado<select name="result"><option value="FAMILIAR_INFORMADO">Familiar informado</option><option value="CONTACTADO">Contactado</option><option value="SIN_RESPUESTA">Sin respuesta</option><option value="NUMERO_INVALIDO">Número inválido</option><option value="PENDIENTE">Pendiente</option></select></label></div><label style="margin-top:10px">Observación<textarea name="observation"></textarea></label><button class="btn btn-primary" style="margin-top:14px">Guardar gestión</button></form>`);
    q('#v71ContactForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{await NovaAPI.registerEmergencyContact({emergencyCode:code,name:fd.get('name'),relation:fd.get('relation'),phone:fd.get('phone'),result:fd.get('result'),observation:fd.get('observation')});closeModal();showToast('Gestión de contacto registrada');go('emergencies')}catch(err){showToast(err.message||String(err));btn.disabled=false}};
  }

  document.addEventListener('click',async e=>{
    const val=e.target.closest('[data-v71-validation]');if(val){e.preventDefault();e.stopImmediatePropagation();const action=val.dataset.v71Validation,code=val.dataset.code;let reason='';if(action==='OBSERVAR')reason=prompt('¿Qué debe revisar o corregir el paciente?','Confirmar datos de contacto.')||'';if(action==='RECHAZAR')reason=prompt('Motivo del rechazo:','Datos inconsistentes o solicitud no válida.')||'';if(['OBSERVAR','RECHAZAR'].includes(action)&&!reason.trim())return;if(action==='VALIDAR'&&!confirm('¿Validar y activar la ficha de este paciente?'))return;try{await NovaAPI.resolveValidation(code,action,reason);showToast(`Validación actualizada · ${label(action)}`);go('validations')}catch(err){showToast(err.message||String(err))}return}
    const ne=e.target.closest('[data-v71-new-emergency]');if(ne){e.preventDefault();e.stopImmediatePropagation();return openEmergency()}
    const id=e.target.closest('[data-v71-identify]');if(id){e.preventDefault();e.stopImmediatePropagation();return openIdentify(id.dataset.v71Identify)}
    const ct=e.target.closest('[data-v71-contact]');if(ct){e.preventDefault();e.stopImmediatePropagation();return openContact(ct.dataset.v71Contact)}
    const av=e.target.closest('[data-v71-advance]');if(av){e.preventDefault();e.stopImmediatePropagation();if(!confirm('¿Avanzar al siguiente estado de atención?'))return;try{const x=await NovaAPI.advanceEmergency(av.dataset.v71Advance);showToast(`Emergencia actualizada · ${label(x.status)}`);go('emergencies')}catch(err){showToast(err.message||String(err))}return}
  },true);

  const localGoV71=window.go;
  window.go=function(page){
    if(remoteOk()&&page==='validations'&&['gerencia','recepcion'].includes(state.role)){
      state.page=page;renderNav();q('#pageTitle').textContent='Validación de pacientes';q('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderValidationsReal(q('#appContent'));
    }
    if(remoteOk()&&page==='emergencies'&&['gerencia','recepcion'].includes(state.role)){
      state.page=page;renderNav();q('#pageTitle').textContent='Emergencias';q('#pageKicker').textContent=`${roles[state.role]} · Clínica Nova Salud`;return renderEmergenciesReal(q('#appContent'));
    }
    return localGoV71(page);
  };
})();
;

/* ===== nova-v72-personal-sedes · extracted from index.html ===== */
// Nova Salud v7.2 · Personal y Sedes reales.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const roleLabel=r=>({GERENCIA:'Gerencia',SISTEMAS:'Sistemas',RECEPCION:'Recepción',MEDICO:'Médico',ENFERMERIA:'Enfermería',LABORATORIO:'Laboratorio',CAJA:'Caja',ALMACEN:'Almacén'})[String(r||'').split(',')[0].trim()]||r||'—';
  const statusLabel=s=>({ACTIVO:'Activo',VACACIONES:'Vacaciones',LICENCIA:'Licencia',DESCANSO:'Descanso',INACTIVO:'Inactivo',BAJA:'Baja'})[s]||s||'—';
  const statusBadge=s=>{const cls=s==='ACTIVO'?'v72-state-active':['VACACIONES','LICENCIA','DESCANSO'].includes(s)?'v72-state-away':'v72-state-off';return `<span class="badge ${cls}">${esc(statusLabel(s))}</span>`};
  const accountBadge=(a,auth)=>{if(a==='SIN_CUENTA')return '<span class="badge info">Sin cuenta</span>';if(auth==='VINCULADO')return '<span class="badge ok">Auth vinculado</span>';return `<span class="badge warn">${esc(String(a||'Pendiente').replaceAll('_',' '))}</span>`};
  let staffRows=[];

  async function renderStaffReal(c){
    if(!remoteOk())return window.__novaLocalRenderStaffV72?.(c);
    if(!['gerencia','sistemas'].includes(state.role))return c.innerHTML=errBox('Acceso restringido a Gerencia y Sistemas');
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v72StaffSearch" placeholder="Nombre, DNI, código o correo"><select id="v72StaffBranch">${branchOptions(true)}</select><select id="v72StaffRole"><option value="">Todos los cargos</option><option value="MEDICO">Médico</option><option value="ENFERMERIA">Enfermería</option><option value="LABORATORIO">Laboratorio</option><option value="RECEPCION">Recepción</option><option value="CAJA">Caja</option><option value="ALMACEN">Almacén</option><option value="SISTEMAS">Sistemas</option><option value="GERENCIA">Gerencia</option></select><select id="v72StaffStatus"><option value="">Todos los estados</option><option value="ACTIVO">Activo</option><option value="VACACIONES">Vacaciones</option><option value="LICENCIA">Licencia</option><option value="DESCANSO">Descanso</option><option value="INACTIVO">Inactivo</option><option value="BAJA">Baja</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span><button class="btn btn-primary" data-v72-new-staff>+ Registrar personal</button></div></div><div class="v72-note"><b>Personal real:</b> la situación laboral y la cuenta de acceso son conceptos separados. Un trabajador puede existir sin tener todavía una cuenta de Supabase Auth.</div><div id="v72StaffBody">${loading('Consultando personal...')}</div>`;
    q('#v72StaffBranch').value='Todas las sedes';
    let timer;
    const update=async()=>{
      const body=q('#v72StaffBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        staffRows=await NovaAPI.staffMembers({search:q('#v72StaffSearch').value.trim(),branch:q('#v72StaffBranch').value,role:q('#v72StaffRole').value,status:q('#v72StaffStatus').value,limit:800});
        const counts={ACTIVO:0,VACACIONES:0,LICENCIA:0,INACTIVO:0,BAJA:0};staffRows.forEach(x=>counts[x.work_status]=(counts[x.work_status]||0)+1);
        body.innerHTML=`<div class="v72-kpis"><div class="v72-kpi"><span>Personal visible</span><strong>${staffRows.length}</strong></div><div class="v72-kpi"><span>Activos</span><strong>${counts.ACTIVO||0}</strong></div><div class="v72-kpi"><span>Vacaciones</span><strong>${counts.VACACIONES||0}</strong></div><div class="v72-kpi"><span>Licencias</span><strong>${counts.LICENCIA||0}</strong></div><div class="v72-kpi"><span>Sin Auth vinculado</span><strong>${staffRows.filter(x=>x.auth_status!=='VINCULADO').length}</strong></div></div>${staffRows.length?rowTable(['Código','Personal','DNI','Rol','Especialidad / función','Sede','Estado laboral','Cuenta','Correo','Acciones'],staffRows.map(x=>[
          esc(x.code),esc(x.name),esc(x.dni),esc(roleLabel(x.role)),esc(x.specialty_function),esc(x.branch),statusBadge(x.work_status),`<div class="v72-account">${accountBadge(x.account_status,x.auth_status)}</div>`,esc(x.email||'—'),`<div class="v72-actions"><button class="btn btn-outline btn-sm" data-v72-status="${esc(x.code)}">Estado</button></div>`
        ])):'<div class="notice">No hay personal que coincida con los filtros.</div>'}`;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v72StaffSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};q('#v72StaffBranch').onchange=update;q('#v72StaffRole').onchange=update;q('#v72StaffStatus').onchange=update;await update();
  }

  function openNewStaffReal(){
    if(!['gerencia','sistemas'].includes(state.role))return showToast('Acceso denegado');
    modal(`<span class="eyebrow">Personal PostgreSQL</span><h2>Registrar personal</h2><form id="v72StaffForm"><div class="formgrid"><label>DNI<input name="dni" maxlength="8" pattern="[0-9]{8}" required></label><label>Nombres<input name="first" required></label><label>Apellidos<input name="last" required></label><label>Teléfono<input name="phone"></label><label>Correo de acceso (opcional)<input name="email" type="email" placeholder="usuario@novasalud.demo"></label><label>Rol<select name="role"><option value="MEDICO">Médico</option><option value="ENFERMERIA">Enfermería</option><option value="LABORATORIO">Laboratorio</option><option value="RECEPCION">Recepción</option><option value="CAJA">Caja</option><option value="ALMACEN">Almacén</option><option value="SISTEMAS">Sistemas</option></select></label><label>Especialidad / función<input name="specialtyFunction" placeholder="Ej. Pediatría / Admisión"></label><label>Sede<select name="branch">${branchOptions()}</select></label><label>Estado laboral<select name="workStatus"><option value="ACTIVO">Activo</option><option value="VACACIONES">Vacaciones</option><option value="LICENCIA">Licencia</option><option value="DESCANSO">Descanso</option><option value="INACTIVO">Inactivo</option></select></label></div><div class="v72-form-note">No se solicita contraseña aquí. Si ingresas correo, se prepara una cuenta interna en estado pendiente; Supabase Auth se vincula posteriormente de forma segura.</div><button class="btn btn-primary" style="margin-top:12px">Registrar en PostgreSQL</button></form>`);
    q('#v72StaffForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Guardando…';try{const x=await NovaAPI.createStaffMember({dni:fd.get('dni'),first:fd.get('first'),last:fd.get('last'),phone:fd.get('phone'),email:fd.get('email'),role:fd.get('role'),specialtyFunction:fd.get('specialtyFunction'),branch:fd.get('branch'),workStatus:fd.get('workStatus')});closeModal();showToast(`Personal registrado · ${x.code}`);go('staff')}catch(err){showToast(err.message||String(err));btn.disabled=false;btn.textContent='Registrar en PostgreSQL'}};
  }

  function openStatus(code){
    const row=staffRows.find(x=>x.code===code);if(!row)return showToast('Actualiza la lista');
    modal(`<span class="eyebrow">Situación laboral</span><h2>${esc(row.name)}</h2><p class="muted">${esc(row.code)} · Estado actual: ${esc(statusLabel(row.work_status))}</p><form id="v72StatusForm"><div class="formgrid"><label>Nuevo estado<select name="status"><option value="ACTIVO">Activo</option><option value="VACACIONES">Vacaciones</option><option value="LICENCIA">Licencia</option><option value="DESCANSO">Descanso</option><option value="INACTIVO">Inactivo</option><option value="BAJA">Baja</option></select></label><label>Hasta (opcional)<input name="until" type="date"></label></div><label style="margin-top:10px">Observación<textarea name="observation" placeholder="Motivo o detalle"></textarea></label><div class="v72-form-note">Este cambio no activa ni desactiva automáticamente la cuenta de acceso; la situación laboral se mantiene separada de Auth.</div><button class="btn btn-primary" style="margin-top:12px">Guardar estado</button></form>`);
    q('#v72StatusForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{await NovaAPI.changeStaffStatus({code,status:fd.get('status'),until:fd.get('until'),observation:fd.get('observation')});closeModal();showToast('Situación laboral actualizada');go('staff')}catch(err){showToast(err.message||String(err));btn.disabled=false}};
  }

  async function renderBranchesReal(c){
    if(!remoteOk())return window.__novaLocalRenderBranchesV72?.(c);
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v72BranchSearch" placeholder="Buscar sede, código o dirección"></div><div class="right"><span class="badge ok">PostgreSQL real</span></div></div><div class="v72-note"><b>Sedes reales:</b> las métricas se calculan directamente con pacientes, personal, citas, validaciones, emergencias e inventario de PostgreSQL.</div><div id="v72BranchBody">${loading('Consultando sedes...')}</div>`;
    let timer;
    const update=async()=>{const body=q('#v72BranchBody');body.innerHTML=loading('Calculando métricas por sede...');try{const rows=await NovaAPI.realBranches(q('#v72BranchSearch').value.trim());body.innerHTML=rows.length?`<div class="v72-branch-grid">${rows.map(x=>`<div class="v72-branch-card"><span class="badge info">${esc(x.branch_code)}</span><h3>${esc(x.nombre)}</h3><p class="muted">${esc(x.address||'—')}<br>${esc(x.phone||'—')}</p><div class="v72-metrics"><div class="v72-metric"><small>Total de pacientes activos</small><b>${Number(x.active_patients||0).toLocaleString('es-PE')}</b></div><div class="v72-metric"><small>Personal activo</small><b>${Number(x.active_staff||0)}</b></div><div class="v72-metric"><small>Médicos activos</small><b>${Number(x.active_doctors||0)}</b></div><div class="v72-metric"><small>Citas hoy</small><b>${Number(x.appointments_today||0)}</b></div><div class="v72-metric"><small>Validaciones pendientes</small><b>${Number(x.pending_validations||0)}</b></div><div class="v72-metric"><small>Emergencias abiertas</small><b>${Number(x.open_emergencies||0)}</b></div><div class="v72-metric"><small>Unidades en stock</small><b>${Number(x.stock_units||0).toLocaleString('es-PE')}</b></div><div class="v72-metric"><small>Stock crítico</small><b>${Number(x.critical_stock||0)}</b></div></div><p><b>Consultas:</b> ${esc(x.consult_hours||'—')}<br><b>Farmacia:</b> ${esc(x.pharmacy_hours||'—')}<br><b>Almacén:</b> ${esc(x.warehouse_code||'—')}<br><b>Emergencia 24h:</b> ${x.emergency_24h?'Sí':'No'}</p></div>`).join('')}</div>`:'<div class="notice">No hay sedes coincidentes.</div>'}catch(e){body.innerHTML=errBox(e)}};
    q('#v72BranchSearch').oninput=()=>{clearTimeout(timer);timer=setTimeout(update,250)};await update();
  }

  window.__novaLocalRenderStaffV72=window.renderStaff;window.renderStaff=renderStaffReal;
  window.__novaLocalRenderBranchesV72=window.renderBranches;window.renderBranches=renderBranchesReal;
  window.openNewStaff=openNewStaffReal;

  document.addEventListener('click',e=>{
    const n=e.target.closest('[data-v72-new-staff]');if(n){e.preventDefault();e.stopImmediatePropagation();return openNewStaffReal()}
    const st=e.target.closest('[data-v72-status]');if(st){e.preventDefault();e.stopImmediatePropagation();return openStatus(st.dataset.v72Status)}
  },true);
})();
;

/* ===== nova-v73-support-maintenance · extracted from index.html ===== */
// Nova Salud v7.3 · Soporte y mantenimiento reales.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const label=s=>String(s||'—').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  const statusBadge=s=>`<span class="badge ${['RESUELTO','CERRADO'].includes(s)?'ok':s==='ABIERTO'?'warn':'info'}">${esc(label(s))}</span>`;
  const priorityBadge=s=>`<span class="badge ${s==='ALTA'?'danger':s==='MEDIA'?'warn':'info'}">${esc(label(s))}</span>`;
  let ticketRows=[];

  async function renderSupportReal(c){
    if(!remoteOk())return c.innerHTML=errBox('Supabase no está conectado');
    if(!['gerencia','sistemas'].includes(state.role))return c.innerHTML=errBox('Acceso restringido a Gerencia y Sistemas');
    c.innerHTML=`<div class="toolbar"><div class="left"><input id="v73Search" placeholder="Ticket, usuario o descripción"><select id="v73Branch">${branchOptions(true)}</select><select id="v73Status"><option value="">Todos los estados</option><option value="ABIERTO">Abierto</option><option value="EN_PROCESO">En proceso</option><option value="RESUELTO">Resuelto</option><option value="CERRADO">Cerrado</option></select><select id="v73Priority"><option value="">Todas las prioridades</option><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></div><div class="right"><span class="badge ok">PostgreSQL real</span><button class="btn btn-primary" data-v73-new-ticket>+ Nuevo ticket</button></div></div><div class="v73-note"><b>Soporte real:</b> tickets, estados y mantenimiento se guardan en PostgreSQL y dejan trazabilidad en Auditoría.</div><div class="v73-grid"><div class="v73-card"><h3>Tickets de soporte</h3><div id="v73TicketBody">${loading('Consultando tickets...')}</div></div><div class="v73-card"><h3>Mantenimiento público</h3><div id="v73MaintBody">${loading('Consultando mantenimiento...')}</div></div></div>`;
    q('#v73Branch').value='Todas las sedes';
    let timer;
    const updateTickets=async()=>{
      const box=q('#v73TicketBody');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        ticketRows=await NovaAPI.supportTickets({search:q('#v73Search').value.trim(),branch:q('#v73Branch').value,status:q('#v73Status').value,priority:q('#v73Priority').value,limit:500});
        const rows=ticketRows;
        const open=rows.filter(x=>x.status==='ABIERTO').length,progress=rows.filter(x=>x.status==='EN_PROCESO').length,resolved=rows.filter(x=>['RESUELTO','CERRADO'].includes(x.status)).length;
        box.innerHTML=`<div class="v73-kpis"><div class="v73-kpi"><span>Tickets</span><strong>${rows.length}</strong></div><div class="v73-kpi"><span>Abiertos</span><strong>${open}</strong></div><div class="v73-kpi"><span>En proceso</span><strong>${progress}</strong></div><div class="v73-kpi"><span>Resueltos/cerrados</span><strong>${resolved}</strong></div></div>${rows.length?rowTable(['Ticket','Fecha','Prioridad','Estado','Sede','Reporta','Descripción','Acciones'],rows.map(x=>[
          esc(x.ticket_code),esc(x.reported_at),priorityBadge(x.priority),statusBadge(x.status),esc(x.branch),`${esc(x.reporter)}<br><small>${esc(x.reporter_code)}</small>`,esc(x.description),`<div class="v73-actions">${x.status==='ABIERTO'?`<button class="btn btn-primary btn-sm" data-v73-ticket-status="EN_PROCESO" data-ticket="${esc(x.ticket_code)}">Tomar</button>`:''}${x.status==='EN_PROCESO'?`<button class="btn btn-primary btn-sm" data-v73-ticket-status="RESUELTO" data-ticket="${esc(x.ticket_code)}">Resolver</button>`:''}${x.status==='RESUELTO'?`<button class="btn btn-outline btn-sm" data-v73-ticket-status="CERRADO" data-ticket="${esc(x.ticket_code)}">Cerrar</button>`:''}</div>`
        ])):'<div class="notice">No hay tickets con esos filtros.</div>'}`;
      }catch(e){box.innerHTML=errBox(e)}
    };
    const updateMaint=async()=>{
      const box=q('#v73MaintBody');box.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const [m,h]=await Promise.all([NovaAPI.publicMaintenance(),NovaAPI.maintenanceHistory(12)]);
        const active=!!m.active;
        box.innerHTML=`<div class="v73-maint-status"><div><span class="badge ${active?'warn':'ok'}">${active?'Mantenimiento activo':'Sitio disponible'}</span>${active?`<p><b>Hasta:</b> ${esc(String(m.ends_at||'').replace('T',' ').slice(0,16))}</p><p>${esc(m.message||'')}</p>`:'<p class="muted">El portal público está disponible.</p>'}</div></div><form id="v73MaintForm"><label>Mensaje<textarea name="message" required>Estamos realizando mejoras para brindarte una experiencia más estable y segura. Estaremos de vuelta muy pronto.</textarea></label><label>Minutos estimados<input name="minutes" type="number" min="1" max="240" value="20" required></label><div class="v73-actions" style="margin-top:10px"><button class="btn btn-primary">Activar / actualizar</button>${active?'<button type="button" class="btn btn-outline" data-v73-finish-maint>Finalizar</button>':''}</div></form><div class="v73-maint-history"><h4>Historial reciente</h4>${h.length?rowTable(['Inicio','Fin estimado','Estado','Configuró'],h.slice(0,6).map(x=>[esc(x.starts_at),esc(x.ends_at),statusBadge(x.status),esc(x.configured_by)])):'<div class="notice">Sin historial.</div>'}</div>`;
        q('#v73MaintForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{await NovaAPI.activateMaintenance(fd.get('message'),fd.get('minutes'));showToast('Mantenimiento activado en PostgreSQL');await updateMaint();await window.v73CheckPublicMaintenance()}catch(err){showToast(err.message||String(err));btn.disabled=false}};
      }catch(e){box.innerHTML=errBox(e)}
    };
    q('#v73Search').oninput=()=>{clearTimeout(timer);timer=setTimeout(updateTickets,250)};q('#v73Branch').onchange=updateTickets;q('#v73Status').onchange=updateTickets;q('#v73Priority').onchange=updateTickets;
    await Promise.all([updateTickets(),updateMaint()]);
  }

  function openNewTicketReal(){
    modal(`<span class="eyebrow">Soporte PostgreSQL</span><h2>Nuevo ticket</h2><form id="v73TicketForm"><div class="formgrid"><label>Prioridad<select name="priority"><option value="ALTA">Alta</option><option value="MEDIA" selected>Media</option><option value="BAJA">Baja</option></select></label><label>Sede<select name="branch">${branchOptions()}</select></label></div><label style="margin-top:10px">Descripción<textarea name="description" required placeholder="Describe la incidencia"></textarea></label><button class="btn btn-primary" style="margin-top:12px">Crear ticket</button></form>`);
    q('#v73TicketForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;try{const x=await NovaAPI.createSupportTicket({priority:fd.get('priority'),branch:fd.get('branch'),description:fd.get('description')});closeModal();showToast(`Ticket creado · ${x.ticket_code}`);go('support')}catch(err){showToast(err.message||String(err));btn.disabled=false}};
  }

  document.addEventListener('click',async e=>{
    const n=e.target.closest('[data-v73-new-ticket]');if(n){e.preventDefault();e.stopImmediatePropagation();return openNewTicketReal()}
    const st=e.target.closest('[data-v73-ticket-status]');if(st){e.preventDefault();e.stopImmediatePropagation();try{await NovaAPI.changeSupportStatus(st.dataset.ticket,st.dataset.v73TicketStatus);showToast(`Ticket actualizado · ${label(st.dataset.v73TicketStatus)}`);go('support')}catch(err){showToast(err.message||String(err))}return}
    const fm=e.target.closest('[data-v73-finish-maint]');if(fm){e.preventDefault();e.stopImmediatePropagation();try{await NovaAPI.finishMaintenance();showToast('Mantenimiento finalizado');go('support');await window.v73CheckPublicMaintenance()}catch(err){showToast(err.message||String(err))}return}
  },true);

  const oldSupport=window.renderSupport;
  window.renderSupport=function(c){if(remoteOk()&&['gerencia','sistemas'].includes(state.role))return renderSupportReal(c);return oldSupport(c)};

  let maintTimer=null;
  function ensureView(){let v=document.getElementById('maintenanceView');if(!v){v=document.createElement('section');v.id='maintenanceView';v.className='hidden';document.body.appendChild(v)}return v}
  function renderPublicMaint(m){
    const v=ensureView();if(!m?.active||state.role){v.classList.add('hidden');return}
    v.classList.remove('hidden');v.innerHTML=`<div class="maintenance-shell"><div class="maintenance-card"><div class="maintenance-logo">${document.querySelector('.brand-logo')?.innerHTML||''}</div><span class="eyebrow">Mantenimiento programado</span><h1>Estamos poniendo todo a punto.</h1><p>${esc(m.message||'Estamos realizando mejoras.')}</p><div class="countdown"><div><strong id="v73MaintMin">--</strong><small>minutos</small></div><div><strong id="v73MaintSec">--</strong><small>segundos</small></div><div><strong>●</strong><small>PostgreSQL</small></div></div><p class="muted">El portal se habilitará automáticamente al finalizar.</p><div class="maintenance-help"><b>¿Necesitas atención urgente?</b><br>Emergencias Nova Salud: (01) 000-0101 · Ambulancia: (01) 000-0202<br><small>Números ficticios para la demostración académica.</small></div><div class="maintenance-staff"><button class="btn btn-outline" data-action="staff-login">Acceso del personal</button></div></div></div>`;
    if(maintTimer)clearInterval(maintTimer);
    const tick=()=>{const end=new Date(m.ends_at).getTime(),left=Math.max(0,end-Date.now()),mi=Math.floor(left/60000),se=Math.floor((left%60000)/1000);if(q('#v73MaintMin'))q('#v73MaintMin').textContent=String(mi).padStart(2,'0');if(q('#v73MaintSec'))q('#v73MaintSec').textContent=String(se).padStart(2,'0');if(left<=0){clearInterval(maintTimer);window.v73CheckPublicMaintenance()}};tick();maintTimer=setInterval(tick,1000);
  }
  window.v73CheckPublicMaintenance=async function(){if(!remoteOk())return;try{const m=await NovaAPI.publicMaintenance();renderPublicMaint(m)}catch(e){console.warn('[Nova mantenimiento]',e)}};
  const oldLogout=window.logout;window.logout=function(){const r=oldLogout();setTimeout(()=>window.v73CheckPublicMaintenance(),400);return r};
  setTimeout(()=>window.v73CheckPublicMaintenance(),1200);
})();
;

/* ===== nova-v74-role-dashboards · extracted from index.html ===== */
// Nova Salud v7.4 · Dashboards reales por rol: Médico, Recepción y Sistemas.
(function(){
  const q=s=>document.querySelector(s);
  const remoteOk=()=>!!(window.NovaAPI&&NovaAPI.enabled&&NovaAPI.client);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const loading=msg=>`<div class="panel"><p class="muted">⏳ ${esc(msg)}</p></div>`;
  const errBox=e=>`<div class="coverage-alert"><b>⚠ No se pudo consultar PostgreSQL</b><div>${esc(e?.message||e)}</div></div>`;
  const label=s=>String(s||'—').replaceAll('_',' ').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
  const badge=s=>`<span class="badge ${['REALIZADA','VALIDADO','RESULTADO_LISTO','ENTREGADO','RESUELTO','CERRADO'].includes(s)?'ok':['CANCELADA','RECHAZADO'].includes(s)?'danger':'warn'}">${esc(label(s))}</span>`;
  const localDate=()=>{const d=new Date(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`};
  const minusDays=n=>{const d=new Date();d.setDate(d.getDate()-n);const m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`};
  const kpis=items=>`<div class="v74-kpis">${items.map(x=>`<div class="v74-kpi"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong>${x.sub?`<small class="muted">${esc(x.sub)}</small>`:''}</div>`).join('')}</div>`;
  const oldRenderDashboardV74=window.renderDashboard;

  async function doctorDashboard(c){
    const addDaysISO=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);const m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${d.getFullYear()}-${m}-${day}`};
    const dayLabel=iso=>new Date(iso+'T12:00:00').toLocaleDateString('es-PE',{weekday:'short',day:'2-digit',month:'2-digit'});
    const doctorStatus=s=>{const u=String(s||'').toUpperCase();return `<span class="badge ${u==='REALIZADA'?'ok':u==='CANCELADA'?'danger':'warn'}">${esc(label(u))}</span>`};
    const today=localDate(), weekEnd=addDaysISO(today,6);
    c.innerHTML=loading('Cargando dashboard médico real...');
    try{
      const d=await NovaAPI.doctorDashboard(today),p=d.profile||{},k=d.kpis||{},next=d.next_appointment||null,labs=d.lab_results||[];
      c.innerHTML=`<div class="workflow-toolbar"><div><h3 style="margin:0">${esc(p.name||state.user.name)}</h3><div class="muted">${esc(p.specialty||'Médico')} · ${esc(p.branch||userBranch())} · ${esc(label(p.work_status))}</div></div><div class="v74-actions"><span class="badge ok">PostgreSQL real</span><button class="btn btn-primary" data-page="appointments">Mi agenda completa</button><button class="btn btn-outline" data-page="history">Historial clínico</button></div></div><div class="v74-note"><b>Dashboard Médico real:</b> la agenda consulta únicamente las citas del médico autenticado. Usa los botones rápidos o elige un rango.</div>${kpis([{label:'Citas hoy',value:k.appointments_today||0},{label:'Atendidas hoy',value:k.attended_today||0},{label:'Consultas del mes',value:k.consultations_month||0},{label:'Pacientes del mes',value:k.patients_month||0},{label:'Resultados Lab.',value:k.lab_ready||0}])}<div class="v74-card" style="margin-bottom:14px"><div class="workflow-toolbar"><div class="left"><div class="v75-quickranges"><button class="btn btn-outline btn-sm" data-doc-range="today">Hoy</button><button class="btn btn-outline btn-sm" data-doc-range="tomorrow">Mañana</button><button class="btn btn-primary btn-sm" data-doc-range="7d">Próximos 7 días</button></div><label>Desde<input id="docAgendaFrom" type="date" value="${today}"></label><label>Hasta<input id="docAgendaTo" type="date" value="${weekEnd}"></label></div><div class="right"><span id="docAgendaCount" class="badge info">Consultando…</span></div></div><div id="docWeekAgenda">${loading('Consultando agenda...')}</div></div><div class="v74-grid"><div class="v74-card"><h3>Próxima atención</h3>${next?`<div class="v74-item"><b>${esc(next.fecha)} · ${esc(next.time)}</b><small>${esc(next.patient)} · ${esc(next.reason||'Consulta')}</small></div>`:'<div class="notice">Sin citas pendientes.</div>'}</div><div class="v74-card"><h3>Laboratorio listo</h3><div class="v74-stack">${labs.length?labs.slice(0,6).map(x=>`<div class="v74-item"><b>${esc(x.patient)} · ${esc(x.test)}</b><small>${esc(x.occurred_at)} · ${esc(label(x.status))}</small></div>`).join(''):'<div class="notice">Sin resultados listos.</div>'}</div></div></div>`;

      const renderRange=async()=>{
        const from=q('#docAgendaFrom')?.value||today,to=q('#docAgendaTo')?.value||weekEnd,box=q('#docWeekAgenda'),count=q('#docAgendaCount');
        if(!box)return;
        if(to<from){box.innerHTML='<div class="notice">La fecha Hasta no puede ser anterior a Desde.</div>';return}
        box.innerHTML=loading('Consultando tus citas en PostgreSQL...');
        try{
          const rows=await NovaAPI.staffAppointments({doctor:state.user.staffCode,from,to,limit:1000});
          if(count)count.textContent=`${rows.length.toLocaleString('es-PE')} cita(s)`;
          const days=[];let cur=from,guard=0;while(cur<=to&&guard<31){days.push(cur);cur=addDaysISO(cur,1);guard++}
          if(days.length<=14){
            box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(${days.length},minmax(210px,1fr));gap:10px;overflow-x:auto;padding-bottom:8px">${days.map(day=>{const dr=rows.filter(a=>String(a.fecha)===day).sort((a,b)=>String(a.hora).localeCompare(String(b.hora)));return `<div class="v74-card" style="padding:12px;min-height:180px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px"><b style="text-transform:capitalize">${esc(dayLabel(day))}</b><span class="badge info">${dr.length}</span></div><div style="display:flex;flex-direction:column;gap:7px;max-height:360px;overflow:auto">${dr.length?dr.map(a=>`<div class="v74-item"><b>${esc(a.hora)} · ${esc(a.patient)}</b><small>DNI ${esc(a.patient_dni)} · ${esc(a.reason||'Consulta')}</small><div style="margin-top:5px">${doctorStatus(a.status)}</div></div>`).join(''):'<small class="muted">Sin citas</small>'}</div></div>`}).join('')}</div>`;
          }else{
            box.innerHTML=rows.length?rowTable(['Fecha','Hora','Paciente','DNI','Motivo','Estado'],rows.sort((a,b)=>(String(a.fecha)+String(a.hora)).localeCompare(String(b.fecha)+String(b.hora))).map(a=>[esc(a.fecha),esc(a.hora),esc(a.patient),esc(a.patient_dni),esc(a.reason||'—'),doctorStatus(a.status)])):'<div class="notice">No hay citas en el rango seleccionado.</div>';
          }
        }catch(e){box.innerHTML=errBox(e);if(count)count.textContent='Error'}
      };

      q('#docAgendaFrom').onchange=renderRange;q('#docAgendaTo').onchange=renderRange;
      c.querySelectorAll('[data-doc-range]').forEach(btn=>btn.onclick=()=>{
        const mode=btn.dataset.docRange;
        if(mode==='today'){q('#docAgendaFrom').value=today;q('#docAgendaTo').value=today}
        if(mode==='tomorrow'){const t=addDaysISO(today,1);q('#docAgendaFrom').value=t;q('#docAgendaTo').value=t}
        if(mode==='7d'){q('#docAgendaFrom').value=today;q('#docAgendaTo').value=weekEnd}
        c.querySelectorAll('[data-doc-range]').forEach(b=>b.classList.remove('btn-primary'));c.querySelectorAll('[data-doc-range]').forEach(b=>b.classList.add('btn-outline'));btn.classList.remove('btn-outline');btn.classList.add('btn-primary');renderRange();
      });
      await renderRange();
    }catch(e){c.innerHTML=errBox(e)}
  }

  async function receptionDashboard(c){
    c.innerHTML=loading('Cargando dashboard de recepción real...');
    try{
      const d=await NovaAPI.receptionDashboard(localDate()),k=d.kpis||{},ap=d.appointments||[],val=d.validations||[],emg=d.emergencies||[];
      c.innerHTML=`<div class="workflow-toolbar"><div><h3 style="margin:0">Recepción · ${esc(d.branch||userBranch())}</h3><div class="muted">Admisión, citas, validaciones y emergencias</div></div><div class="v74-actions"><span class="badge ok">PostgreSQL real</span><button class="btn btn-outline" data-page="validations">Validaciones</button><button class="btn btn-primary" data-page="emergencies">Emergencias</button></div></div><div class="v74-note"><b>Dashboard Recepción real:</b> todos los indicadores están limitados automáticamente a la sede del usuario autenticado.</div>${kpis([{label:'Citas hoy',value:k.appointments_today||0},{label:'Por confirmar',value:k.to_confirm||0},{label:'Validaciones pendientes',value:k.validations_pending||0},{label:'Emergencias hoy',value:k.emergencies_today||0},{label:'Identidades pendientes',value:k.identity_pending||0}])}<div class="v74-grid"><div class="v74-card"><h3>Agenda de hoy</h3>${ap.length?rowTable(['Hora','Paciente','DNI','Médico','Estado','Motivo'],ap.map(x=>[esc(x.time),esc(x.patient),esc(x.dni),esc(x.doctor),badge(x.status),esc(x.reason||'—')])):'<div class="notice">No hay citas para hoy.</div>'}</div><div><div class="v74-card"><h3>Validaciones pendientes</h3><div class="v74-stack">${val.length?val.map(x=>`<div class="v74-item"><b>${esc(x.patient)} · DNI ${esc(x.dni)}</b><small>${esc(x.requested_at)} · ${esc(label(x.status))}</small></div>`).join(''):'<div class="notice">Sin validaciones pendientes.</div>'}</div></div><div class="v74-card" style="margin-top:14px"><h3>Emergencias de hoy</h3><div class="v74-stack">${emg.length?emg.map(x=>`<div class="v74-item"><b>${esc(x.patient)} · ${esc(label(x.triage))}</b><small>${esc(x.occurred_at)} · ${esc(label(x.status))} · ${esc(label(x.identity_status))}</small></div>`).join(''):'<div class="notice">Sin emergencias registradas hoy.</div>'}</div></div></div></div>`;
    }catch(e){c.innerHTML=errBox(e)}
  }

  async function systemsDashboard(c){
    c.innerHTML=`<div class="toolbar"><div class="left"><label>Desde<input id="v74SysFrom" type="date" value="${minusDays(6)}"></label><label>Hasta<input id="v74SysTo" type="date" value="${localDate()}"></label></div><div class="right"><span class="badge ok">PostgreSQL real</span></div></div><div class="v74-note"><b>Dashboard Sistemas real:</b> estado de cuentas, soporte, mantenimiento y trazabilidad se consultan directamente en PostgreSQL/Supabase.</div><div id="v74SysBody">${loading('Calculando indicadores...')}</div>`;
    const update=async()=>{
      const body=q('#v74SysBody');body.innerHTML=loading('Consultando PostgreSQL...');
      try{
        const d=await NovaAPI.systemsDashboard({from:q('#v74SysFrom').value,to:q('#v74SysTo').value}),k=d.kpis||{},tickets=d.support||[],audit=d.audit||[],maint=d.maintenance||{active:false};
        body.innerHTML=`${kpis([{label:'Personal',value:k.staff_total||0},{label:'Cuentas internas',value:k.accounts_total||0},{label:'Auth vinculado',value:k.auth_linked||0},{label:'Auth pendiente',value:k.auth_pending||0},{label:'Tickets abiertos',value:k.support_open||0}])}<div class="v74-grid"><div class="v74-card"><div class="workflow-toolbar"><h3>Eventos de auditoría · ${esc(k.audit_events||0)}</h3><button class="btn btn-outline btn-sm" data-page="audit">Abrir Auditoría</button></div>${audit.length?rowTable(['Fecha','Actor','Acción','Entidad','Registro'],audit.map(x=>[esc(x.occurred_at),esc(x.actor),badge(x.action),esc(x.entity),esc(x.record_id)])):'<div class="notice">Sin eventos para el rango.</div>'}</div><div><div class="v74-card"><div class="workflow-toolbar"><h3>Soporte reciente</h3><button class="btn btn-outline btn-sm" data-page="support">Abrir Soporte</button></div><div class="v74-stack">${tickets.length?tickets.map(x=>`<div class="v74-item"><b>${esc(x.ticket_code)} · ${esc(label(x.priority))}</b><small>${esc(x.reported_at)} · ${esc(x.branch)} · ${esc(label(x.status))}</small></div>`).join(''):'<div class="notice">Sin tickets.</div>'}</div></div><div class="v74-card" style="margin-top:14px"><h3>Estado de plataforma</h3><div class="v74-item"><b>${maint.active?'<span class="v74-maint-on">Mantenimiento activo</span>':'<span class="v74-maint-off">Portal disponible</span>'}</b><small>${maint.active?esc(maint.message||'Mantenimiento programado'):`${esc(k.branches_active||0)} sedes activas · operación normal`}</small></div></div></div></div>`;
      }catch(e){body.innerHTML=errBox(e)}
    };
    q('#v74SysFrom').onchange=update;q('#v74SysTo').onchange=update;await update();
  }

  window.renderDashboard=function(c){
    if(remoteOk()&&state.role==='medico')return doctorDashboard(c);
    if(remoteOk()&&state.role==='recepcion')return receptionDashboard(c);
    if(remoteOk()&&state.role==='sistemas')return systemsDashboard(c);
    return oldRenderDashboardV74(c);
  };
})();
;