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

## SQL de control
Las consultas para verificar últimas ventas, citas, pacientes, consultas e inventario están en `sql/consultas_control.sql`.
