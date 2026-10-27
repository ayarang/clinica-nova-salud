-- =====================================================================
-- CLÍNICA NOVA SALUD · OPTIMIZACIÓN DE CONCURRENCIA v8.6
-- PostgreSQL / Supabase
-- Gratis, idempotente y pensado para los filtros reales de la web.
--
-- IMPORTANTE:
-- - No borra datos.
-- - No cambia RLS, Auth, RPC ni permisos.
-- - Usa CREATE INDEX IF NOT EXISTS, por lo que se puede re-ejecutar.
-- - Ejecutar preferentemente cuando no haya una demo/escritura intensa.
-- =====================================================================

BEGIN;

-- 1) PACIENTES
-- La web filtra con frecuencia por sede preferida + estado.
CREATE INDEX IF NOT EXISTS idx_paciente_sede_estado_fecha_v86
ON public.paciente (id_sede_preferida, estado_registro, fecha_registro DESC);

-- 2) CITAS
-- Recepción/Gerencia filtran por sede, estado y rango de fechas.
CREATE INDEX IF NOT EXISTS idx_cita_sede_estado_fecha_v86
ON public.cita (id_sede, estado, fecha DESC, hora);

-- Médico filtra por su agenda + estado + fecha.
CREATE INDEX IF NOT EXISTS idx_cita_medico_estado_fecha_v86
ON public.cita (id_medico, estado, fecha DESC, hora);

-- 3) LABORATORIO
-- La web consulta órdenes por médico/estado y orden cronológico.
CREATE INDEX IF NOT EXISTS idx_orden_lab_medico_estado_fecha_v86
ON public.orden_laboratorio (id_medico, estado, fecha_hora DESC);

-- 4) FACTURACIÓN
-- Caja/Gerencia filtran por sede, estado y fecha.
CREATE INDEX IF NOT EXISTS idx_factura_sede_estado_fecha_v86
ON public.factura (id_sede, estado, fecha_emision DESC);

-- 5) INVENTARIO
-- Los movimientos se consultan por almacén, tipo y fecha.
CREATE INDEX IF NOT EXISTS idx_mov_inv_almacen_tipo_fecha_v86
ON public.movimiento_inventario (id_almacen, tipo, fecha_hora DESC);

-- 6) EMERGENCIAS
-- Recepción filtra por sede, estado de atención y fecha.
CREATE INDEX IF NOT EXISTS idx_emergencia_sede_estado_fecha_v86
ON public.emergencia (id_sede, estado_atencion, fecha_hora_ingreso DESC);

COMMIT;

-- Actualiza estadísticas para que el optimizador de PostgreSQL
-- pueda decidir mejor cuándo usar los nuevos índices.
ANALYZE public.paciente;
ANALYZE public.cita;
ANALYZE public.orden_laboratorio;
ANALYZE public.factura;
ANALYZE public.movimiento_inventario;
ANALYZE public.emergencia;

-- =====================================================================
-- VERIFICACIÓN
-- Deben aparecer 7 índices *_v86.
-- =====================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_v86'
ORDER BY tablename, indexname;

-- =====================================================================
-- DIAGNÓSTICO RÁPIDO DE VOLUMEN
-- Solo lectura.
-- =====================================================================
SELECT 'paciente' AS tabla, COUNT(*) AS filas FROM public.paciente
UNION ALL
SELECT 'cita', COUNT(*) FROM public.cita
UNION ALL
SELECT 'orden_laboratorio', COUNT(*) FROM public.orden_laboratorio
UNION ALL
SELECT 'factura', COUNT(*) FROM public.factura
UNION ALL
SELECT 'movimiento_inventario', COUNT(*) FROM public.movimiento_inventario
UNION ALL
SELECT 'emergencia', COUNT(*) FROM public.emergencia;
