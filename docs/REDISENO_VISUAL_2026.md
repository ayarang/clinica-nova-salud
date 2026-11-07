# Renovación visual de Clínica Nova Salud (noviembre de 2026)

## Alcance
- Se mantiene `index.html` y la aplicación existente (GitHub Pages, Supabase Auth, PostgreSQL, RPC, Data Mart y módulos de negocio).
- Se añade una **hoja de estilos complementaria** `nova-refresh-2026.css`, cargada después de `nova-styles-v81.css`.
- No se alteran JavaScript, SQL, credenciales, roles ni reglas de acceso.
- La imagen del encabezado es ilustrativa y se carga de Unsplash por URL pública. El prototipo sigue siendo **académico y ficticio**, no representa una instalación real de Clínica Nova Salud.
- Si el recurso externo no carga, queda el color de fondo del encabezado como alternativa. Antes de producción conviene alojar imágenes autorizadas y optimizadas en el propio proyecto.

## Cambios visibles
1. Portada: fotografía médica ilustrativa, superposición para contraste, texto más compacto, botones y tarjeta de atención refinados.
2. Área pública: títulos menos grandes, tarjetas de servicios y especialidades con bordes y espacios coherentes.
3. Panel interno: barra lateral **blanca**, acentos turquesa, opción activa reconocible, jerarquía tipográfica moderada.
4. Dashboard, tablas y formularios: tarjetas claras, sombras discretas, controles con foco visible y estados legibles.
5. Responsive: ajustes adicionales para pantallas de 900, 620 y 380 px y respeto a `prefers-reduced-motion`.

## Verificación sugerida antes de fusionar
- [ ] Abrir la portada sin iniciar sesión en desktop y móvil. Verificar foto, títulos, navegación, botones de citas y portal.
- [ ] Probar el flujo de inicio de sesión con cuentas de prueba autorizadas; verificar sesión y cierre de sesión.
- [ ] Entrar con cada rol y revisar permisos, menús y pantalla de inicio; la apariencia no debe habilitar acciones.
- [ ] Registrar y consultar una cita ficticia; verificar consulta, caja, boleta e inventario de prueba.
- [ ] Revisar tablas grandes en móvil (especialmente laboratorio): conservar el scroll horizontal.
- [ ] Confirmar que no hay errores nuevos de consola ni peticiones fallidas a Supabase.
- [ ] Comprobar navegación con teclado, foco visible y preferencia de movimiento reducido.

## Reversión rápida
Eliminar de `index.html` la línea:

```html
<link rel="stylesheet" href="./nova-refresh-2026.css?v=1.0.0">
```

El CSS original sigue intacto y la lógica funcional no se modifica.

## Foto ilustrativa
Se usa una fotografía alojada por Unsplash (URL incluida en el CSS). **No usar imágenes de pacientes ni datos clínicos reales** sin autorización y medidas de privacidad adecuadas.
