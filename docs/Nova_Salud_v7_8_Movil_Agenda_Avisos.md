# Clínica Nova Salud v7.8 — Mejoras de experiencia y alertas

## Alcance implementado

1. **Celular:** el panel lateral anterior deja de ocupar espacio en pantallas de 900 px o menos; pasa a ser un menú que se abre con ☰, se cierra con × o tocando fuera y admite gestos horizontales. Se recuperan los textos del menú (en vez de solo íconos). Se ajustan las tablas y las tarjetas para pantallas estrechas.
2. **Agenda médica:** botón 📅 en la cabecera para Paciente, Recepción, Médico, Enfermería y Gerencia. Calendario mensual con selector de días y citas devueltas por las RPC ya instaladas, con control de acceso en Supabase. Vista de **solo lectura**: para registrar o reprogramar se abre el módulo habitual.
3. **Centro de avisos:** botón 🔔 en la cabecera. Paciente: notificaciones existentes de `notificacion_paciente`; Almacén/Gerencia: estado crítico, agotado y vencimientos mediante `api_staff_listar_inventario`; otros roles de agenda: resumen de citas futuras de su sesión autorizada.
4. **Avisos periódicos:** consultas en primer inicio de sesión y al abrir el panel, más actualización cada 120 segundos mientras la página está abierta y visible. No son alertas push ni se ejecutan si la pestaña está cerrada; no implican envíos de SMS o WhatsApp.
5. **Protecciones:** sin cambios a tablas ni políticas, sin credenciales administrativas en el navegador, sin nuevas dependencias, sin exportar historiales clínicos, sin almacenar mensajes del chatbot ni el contenido de alertas fuera de la sesión en memoria.

## Cómo probar

- En Android, abrir el sitio, entrar como paciente, pulsar **☰** en la parte superior y deslizar hacia la izquierda para cerrar. La vista principal debe ocupar todo el ancho sin columna lateral blanca.
- Abrir **📅** y comprobar el calendario del mes, seleccionar días y consultar las citas existentes del propio paciente. Pulsar «Abrir módulo de citas» para regresar al portal.
- Abrir **🔔** y comprobar notificaciones del usuario. Si el proyecto Supabase no permite leerlas, se mostrará un estado de error en vez de inventar avisos.
- Ingresar con una cuenta ficticia de Almacén: comprobar el contador rojo de avisos en **🔔** para stock crítico/agotado; abrir inventario desde el panel.
- Comprobar que se mantienen el registro, la autenticación, el Asistente Nova y el botón de WhatsApp de demostración.

## Limitaciones y tareas posteriores

- Los controles de modificación/cancelación requieren ejecutar previamente **SQL 48** (preparado en la versión 7.6) en Supabase; GitHub Pages por sí solo no aplica cambios de base.
- La agenda depende de las RPC existentes de citas; no instala una RPC nueva ni permite bloquear reservas por sí sola.
- Los avisos funcionan solo con sesión y navegador abiertos, no sustituyen al sistema de monitorización del servidor.
- Se pospone QR de llegada hasta definir un flujo autenticado de check-in, validación de recepción y prevención de uso/reutilización de códigos.
- WhatsApp automático se mantiene pendiente de plataforma Meta Business, plantillas y consentimiento verificable.
- Las pruebas funcionales reales requieren cuentas ficticias con los perfiles adecuados y revisar la RLS correspondiente.

**No se modifican registros clínicos, facturas, inventario ni esquemas SQL desde estos archivos.**
