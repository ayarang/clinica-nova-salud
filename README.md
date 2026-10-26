# Clínica Nova Salud

Proyecto académico de Big Data - Grupo 4.

## Arquitectura
- Frontend: HTML/CSS/JavaScript en GitHub Pages.
- Autenticación: Supabase Auth.
- Base transaccional: PostgreSQL / Supabase (`public`).
- Data Mart: esquema `analytics`.
- Visualización: Power BI.

## Importante
`nova-supabase-config.js` debe contener únicamente la URL del proyecto y la **publishable key**. Nunca subir `sb_secret_`, `service_role`, contraseñas de PostgreSQL ni archivos de credenciales.

## Despliegue
El archivo principal es `index.html`.

- El sistema real requiere Supabase Auth y las RPC instaladas en PostgreSQL. Si Supabase está configurado pero no disponible, **no** se sustituye la autenticación por cuentas demo.
- Los pacientes, recetas y notificaciones **ficticios** solo se guardan en memoria de la página; al recargar se pierden los cambios demo. Al abrir esta versión se borran tres claves antiguas del almacenamiento local que podían contener datos de prueba personales.
- La v8.0 restringe en la interfaz los turnos por perfil, pero **también es necesario aplicar** la versión revisada de `sql/49_Turnos_Solicitudes_v80.sql` en Supabase para proteger la RPC.
- Las migraciones SQL requieren revisión y ejecución manual; GitHub Pages no las aplica.

## SQL disponible
- `sql/48_Portal_Paciente_Autogestion_v76.sql` (cancelar/reprogramar citas).
- `sql/49_Turnos_Solicitudes_v80.sql` (turnos y solicitudes internas).

La documentación de validación está en `docs/Nova_Salud_v8_0_Turnos_Solicitudes_Expo.md`.
