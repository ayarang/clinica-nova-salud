-- =====================================================================
-- CLÍNICA NOVA SALUD · SQL 51
-- Corrección de alcance clínico para Enfermería v8.8
--
-- Problema corregido:
-- Una enfermera podía ver una tarea asignada a su usuario y sede,
-- pero al abrir la ficha del paciente la función api_staff_ficha_clinica
-- no consideraba tarea_enfermeria como relación válida de atención.
--
-- Seguridad:
-- - NO elimina datos.
-- - NO cambia Auth ni RLS.
-- - NO da acceso global a Enfermería.
-- - Solo autoriza la ficha cuando existe una tarea NO CANCELADA
--   asignada al enfermero actual, en su sede actual, para ese paciente.
-- =====================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_tarea_enfermeria_scope_v88
ON public.tarea_enfermeria (id_paciente, id_sede, id_enfermero)
WHERE estado <> 'CANCELADA';

CREATE OR REPLACE FUNCTION public.api_staff_ficha_clinica(p_paciente_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_patient BIGINT;
  v_personal BIGINT := public.nova_current_personal_id();
  v_sede_actual BIGINT := public.nova_current_sede_id();
  v_es_gerencia BOOLEAN := public.nova_has_role('GERENCIA');
  v_es_medico BOOLEAN := public.nova_has_role('MEDICO');
  v_es_enfermeria BOOLEAN := public.nova_has_role('ENFERMERIA');
  v_result JSONB;
BEGIN
  IF NOT (v_es_gerencia OR v_es_medico OR v_es_enfermeria) THEN
    RAISE EXCEPTION 'Acceso denegado a la ficha clínica';
  END IF;

  SELECT p.id_paciente INTO v_patient
  FROM public.paciente p
  WHERE p.codigo_paciente=p_paciente_code;

  IF v_patient IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  -- Enfermería mantiene alcance restringido.
  -- Se acepta como relación válida:
  -- 1) sede preferida,
  -- 2) una cita en la sede actual,
  -- 3) una consulta en la sede actual,
  -- 4) una tarea de enfermería NO CANCELADA, asignada al enfermero actual
  --    y perteneciente a la sede actual.
  IF v_es_enfermeria AND NOT v_es_gerencia THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.paciente p
      WHERE p.id_paciente=v_patient
        AND (
          p.id_sede_preferida=v_sede_actual
          OR EXISTS (
            SELECT 1
            FROM public.cita ci
            WHERE ci.id_paciente=p.id_paciente
              AND ci.id_sede=v_sede_actual
          )
          OR EXISTS (
            SELECT 1
            FROM public.consulta co
            JOIN public.historial_clinico hh
              ON hh.id_historial=co.id_historial
            WHERE hh.id_paciente=p.id_paciente
              AND co.id_sede=v_sede_actual
          )
          OR EXISTS (
            SELECT 1
            FROM public.tarea_enfermeria te
            WHERE te.id_paciente=p.id_paciente
              AND te.id_sede=v_sede_actual
              AND te.id_enfermero=v_personal
              AND te.estado <> 'CANCELADA'
          )
        )
    ) THEN
      RAISE EXCEPTION 'Paciente fuera del alcance de sede';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'patient', jsonb_build_object(
      'id_paciente',p.id_paciente,
      'code',p.codigo_paciente,
      'dni',p.dni,
      'name',concat_ws(' ',p.nombres,p.apellidos),
      'phone',p.telefono,
      'email',p.correo,
      'branch',COALESCE(s.distrito,'Sin sede'),
      'insurance',COALESCE(sg.nombre_aseguradora,'Particular'),
      'status',initcap(lower(p.estado_registro)),
      'history_code',h.codigo_historial
    ),
    'allergies', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name',a.alergeno,
        'severity',a.severidad,
        'source',a.fuente,
        'active',a.activa,
        'product_code',pr.codigo_producto
      ) ORDER BY a.alergeno)
      FROM public.alergia_medicamento a
      LEFT JOIN public.producto pr ON pr.id_producto=a.id_producto
      WHERE a.id_paciente=p.id_paciente
        AND a.activa=TRUE
    ),'[]'::jsonb),
    'consultations', COALESCE((
      SELECT jsonb_agg(to_jsonb(q) ORDER BY q.fecha_hora DESC)
      FROM (
        SELECT
          c.codigo_consulta AS consultation_code,
          ci.codigo_cita AS appointment_code,
          pe.codigo_personal AS doctor_code,
          concat_ws(' ',pe.nombres,pe.apellidos) AS doctor,
          se.distrito AS branch,
          c.fecha_hora,
          to_char(c.fecha_hora AT TIME ZONE 'America/Lima','YYYY-MM-DD HH24:MI') AS fecha,
          c.diagnostico AS diagnosis,
          c.indicaciones AS indications,
          c.observaciones AS observations,
          initcap(lower(c.estado)) AS status
        FROM public.consulta c
        JOIN public.personal pe ON pe.id_personal=c.id_medico
        JOIN public.sede se ON se.id_sede=c.id_sede
        LEFT JOIN public.cita ci ON ci.id_cita=c.id_cita
        WHERE c.id_historial=h.id_historial
          AND c.estado<>'ANULADA'
        ORDER BY c.fecha_hora DESC
      ) q
    ),'[]'::jsonb),
    'prescriptions', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.fecha_hora DESC)
      FROM (
        SELECT
          pr.codigo_prescripcion AS prescription_code,
          c.codigo_consulta AS consultation_code,
          pe.codigo_personal AS doctor_code,
          concat_ws(' ',pe.nombres,pe.apellidos) AS doctor,
          se.distrito AS branch,
          pr.fecha_hora,
          to_char(pr.fecha_hora AT TIME ZONE 'America/Lima','YYYY-MM-DD HH24:MI') AS fecha,
          pd.id_prescripcion_detalle,
          COALESCE(prod.codigo_producto,'') AS product_code,
          pd.medicamento,
          pd.dosis,
          pd.frecuencia,
          pd.duracion,
          pd.instrucciones,
          initcap(lower(pd.estado)) AS status
        FROM public.prescripcion pr
        JOIN public.prescripcion_detalle pd
          ON pd.id_prescripcion=pr.id_prescripcion
        JOIN public.consulta c
          ON c.id_consulta=pr.id_consulta
        JOIN public.personal pe
          ON pe.id_personal=pr.id_medico
        JOIN public.sede se
          ON se.id_sede=c.id_sede
        LEFT JOIN public.producto prod
          ON prod.id_producto=pd.id_producto
        WHERE c.id_historial=h.id_historial
        ORDER BY pr.fecha_hora DESC
      ) r
    ),'[]'::jsonb)
  ) INTO v_result
  FROM public.paciente p
  JOIN public.historial_clinico h
    ON h.id_paciente=p.id_paciente
  LEFT JOIN public.sede s
    ON s.id_sede=p.id_sede_preferida
  LEFT JOIN public.seguro sg
    ON sg.id_seguro=p.id_seguro
  WHERE p.id_paciente=v_patient;

  RETURN v_result;
END;
$$;

COMMIT;

ANALYZE public.tarea_enfermeria;

-- Verificación técnica
SELECT
  p.proname AS funcion,
  CASE p.provolatile
    WHEN 'v' THEN 'VOLATILE'
    WHEN 's' THEN 'STABLE'
    WHEN 'i' THEN 'IMMUTABLE'
  END AS tipo
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname='api_staff_ficha_clinica';

SELECT indexname,indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND indexname='idx_tarea_enfermeria_scope_v88';
