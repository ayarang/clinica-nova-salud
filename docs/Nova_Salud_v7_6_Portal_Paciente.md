# Nova Salud v7.6 — Portal del paciente

**Proyecto académico con datos ficticios.** Esta actualización no modifica los scripts SQL 01–47 ni las vistas de Power BI.

## Publicación web en GitHub Pages
- `index.html`: estilo de portal renovado y carga de `nova-patient-v76.js`.
- `nova-patient-v76.js`: tarjetas de "Mis citas", cancelación y reprogramación, notificaciones recientes y preferencias de WhatsApp.
- `nova-api-v13.js`: nuevas llamadas RPC autenticadas; se conserva el resto del adaptador.
- `sql/48_Portal_Paciente_Autogestion_v76.sql`: **requiere ejecución separada en Supabase SQL Editor**.

La web se publica desde GitHub, pero GitHub Pages **no ejecuta archivos SQL**. Hasta aplicar el paso 48, los botones de autogestión pueden verse, pero las operaciones devolverán el aviso de función no instalada. No son cambios simulados sobre la base.

## Activación de cancelación y reprogramación
1. Hacer respaldo de la base Supabase y ensayar esta migración primero en un entorno de prueba.
2. Revisar la política real de cancelación de la clínica y cualquier devolución o cobro vinculado.
3. En Supabase > SQL Editor, ejecutar una sola vez `sql/48_Portal_Paciente_Autogestion_v76.sql`.
4. Entrar como paciente de prueba, reservar una cita futura, reprogramarla y después cancelarla.
5. Comprobar como personal de recepción el nuevo estado y la trazabilidad en `public.cita_autogestion_evento`.
6. Confirmar que el horario cancelado vuelve a estar disponible y que no pueden reservarse dos citas ACTIVAS al mismo médico/hora.

### Protección de datos y reglas
- El servidor comprueba la identidad del paciente con `nova_current_paciente_id()` y bloquea citas ajenas.
- Solo se admiten cambios de citas `PROGRAMADA` o `CONFIRMADA` aún futuras; no en atenciones completadas.
- Reprogramación válida de lunes a sábado, de 07:00 a 21:00, dentro de 180 días; mantiene la especialidad.
- El horario se vuelve a validar en la base al guardar, con índice único para citas NO canceladas.
- Cada modificación deja un evento de auditoría y una notificación interna.
- El sistema no ejecuta devoluciones, modifica facturas ni envía información clínica al cambiar una cita.
- Se usan tiempos de Lima (America/Lima) en las validaciones del servidor.

## WhatsApp: qué se implementó y qué NO
✅ Paciente puede guardar o retirar autorización específica para avisos operativos en formato `+519...`.
✅ La preferencia se almacena en Supabase mediante RPC restringida al propio paciente.
❌ **No se envía ningún WhatsApp automáticamente todavía**: no existe integración oficial de Meta ni credenciales de empresa aprobadas en este proyecto.
❌ Guardar la preferencia no prueba titularidad del número; se requerirá verificación/confirmación antes de envíos en producción.

Para habilitarlo en el futuro se necesita WhatsApp Business Platform, cuenta autorizada, plantillas de mensajes aprobadas y una función segura de servidor (por ejemplo Supabase Edge Functions) que proteja token y gestione entregas/reintentos. Nunca publicar el token de Meta en GitHub Pages ni enviarlo desde el navegador. Usar mensajes operativos mínimos y consentimiento trazable.

## Lista de comprobación antes de producción
- [ ] Migración SQL 48 aplicada y validada en staging.
- [ ] Pruebas de aislamiento: usuario A no puede modificar cita de usuario B.
- [ ] Pruebas de concurrencia y cancelación de cupos, también con citas realizadas.
- [ ] Validación de devoluciones y condiciones de reagendamiento por recepción.
- [ ] Verificación de la lectura de `notificacion_paciente` con RLS.
- [ ] Prueba en celular del portal, sin falsos "mensajes enviados".
- [ ] Sólo datos ficticios para la exposición; nunca exponer información clínica real.

## Reversión
El diseño web puede revertirse quitando `nova-patient-v76.js` del HTML y volviendo a la versión anterior del adaptador. La migración SQL **no debe revertirse a ciegas**: el nuevo índice parcial permite citas canceladas e inmediatamente reemplazadas; reinstalar el UNIQUE original podría fallar o bloquear registros válidos. Planificar una reversión de base tras comprobar datos y respaldos.
