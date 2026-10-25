# Clínica Nova Salud v8.0 — Turnos, solicitudes y modo exposición

## Alcance agregado

- **🎫 Turnos de atención:** Recepción y Gerencia pueden registrar la llegada de una cita confirmada de hoy. El sistema genera un turno A-0001, A-0002, etc.; los pacientes ven solo sus turnos, y el personal consulta según rol, sede y médico asignado. Los estados siguen `EN_ESPERA → EN_ATENCION → FINALIZADO`, con anulación desde `EN_ESPERA`.
- **📦 Solicitudes internas:** Médico, Enfermería y Gerencia crean solicitudes de productos y cantidad; Almacén y Gerencia aprueban, rechazan y registran la entrega administrativa. Solo se muestran solicitudes permitidas por la sesión.
- **🎓 Modo exposición:** En la página pública, botón «Ver recorrido». Presenta seis escenas ficticias del flujo Paciente → Recepción → Médico → Enfermería → Almacén → Paciente. Los datos del recorrido no se almacenan en Supabase ni se mezclan con datos reales.
- **Diseño:** Los botones 🎫, 📦 y 🎓 aparecen en la barra del panel según el rol. Drawer adaptable a celular, controles para cerrar, navegación y mensajes de estado.

## Importante: activar Supabase

**GitHub Pages NO ejecuta scripts SQL ni instala RPCs en tu proyecto Supabase.**

1. Con respaldo y en una base de prueba, revisa el script `sql/49_Turnos_Solicitudes_v80.sql`.
2. Verifica que los esquemas `public.cita`, `public.personal`, `public.sede` y los helpers `public.mi_perfil_staff()` y `public.nova_current_paciente_id()` coincidan con la versión real de la base de datos.
3. Verifica que `mi_perfil_staff()` devuelve los campos `kind`, `role`, `branch` y `staffCode`, necesarios para la política por rol y sede. **No ejecutar sin verificar estos campos.**
4. Ejecuta `49_Turnos_Solicitudes_v80.sql` con el SQL Editor de Supabase. Asegura que se aplique por completo y que se revise la seguridad. No se requiere introducir llaves de servicio en frontend.
5. Prueba las RPCs con usuarios **ficticios y autorizados**, especialmente que las solicitudes de otra sede y los turnos de otro médico sean rechazados.

Sin este SQL, los botones reales mostrarán un mensaje claro sobre la migración pendiente. El **modo exposición sí funciona** sin migración.

La migración **48** sigue siendo un paso independiente para cancelar/reprogramar citas; la v8.0 no la aplica.

## Permisos esperados

| Rol | Turnos | Solicitudes |
|---|---|---|
| Paciente | Ver sus turnos de hoy | No disponible |
| Recepción | Registrar llegadas y actualizar turnos de su sede | No disponible |
| Médico | Ver sus turnos asignados, iniciar/finalizar; no registrar llegadas | Solicitar productos y consultar sus propias solicitudes |
| Enfermería | Consultar turnos autorizados de la sede | Solicitar productos y consultar sus propias solicitudes |
| Almacén | No disponible | Revisar y actualizar solicitudes de su sede |
| Gerencia | Gestión de turnos global | Crear y revisar solicitudes |
| Caja/Sistemas | No disponible | No disponible |

**IMPORTANTE:** marcar una solicitud como ENTREGADA **no descuenta stock**. Almacén debe ir a Inventario y registrar un movimiento de salida con su propio procedimiento existente (producto, lote, cantidad, almacén). Esto evita producir disminuciones contables sin información verificada.

## Prueba de aceptación recomendada

- Desde la portada pública, pulsa «🎓 Ver recorrido». Recorre los 6 pasos, vuelve al inicio y cierra el panel.
- Desde celular entra con usuario de prueba paciente, revisa que exista 🎫 «Turnos» y que no se muestren turnos de otros pacientes.
- Inicia sesión con cuenta ficticia Recepción, registra llegada de una cita de **hoy** (realizada para la prueba), confirma que aparece «En espera»; prueba que una cita de mañana se rechace.
- Inicia sesión con Médico asignado a la cita de prueba: inicia y finaliza la atención. Verifica que un médico diferente no pueda modificar el turno.
- Con Enfermería de prueba crea solicitud de 3 cajas de guantes sin datos clínicos, luego accede a Almacén de esa sede para aprobar y marcar entregada. Comprueba que el stock **no disminuye** automáticamente y registra la salida en Inventario.
- Comprueba que Caja y Sistemas no accedan a los nuevos botones.
- Verifica que Registro de pacientes, Acceso del personal, Asistente Nova y los módulos de v7.8 sigan funcionando.

## Limitaciones

- No se realizan mensajes reales de WhatsApp, notificaciones push, diagnósticos ni tratamientos.
- El modo exposición es una **simulación aislada** para mostrar la secuencia al profesor. No equivale a ejecutar una transacción en base de datos.
- La nueva migración debe revisarse contra el esquema de Supabase actual. No se ha ejecutado en la base real desde GitHub.
- Para ambientes reales se recomienda agregar log de auditoría detallado para cambios de estado, y revisar permisos, retención de datos, pruebas de concurrencia y políticas institucionales.
