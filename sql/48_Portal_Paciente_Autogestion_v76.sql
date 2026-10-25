-- CLÍNICA NOVA SALUD · v7.6 · MIGRACIÓN OPCIONAL Y ADITIVA
-- EJECUTAR UNA SOLA VEZ en Supabase SQL Editor DESPUÉS de los scripts 01–47.
-- NO se ejecuta automáticamente al publicar GitHub Pages.
-- Recomendado: exportar respaldo y probar primero en una base de staging.
-- Atención: altera la restricción UNIQUE de horarios para permitir reutilizar un turno cancelado.
BEGIN;

-- El modelo v11 tenía UNIQUE(id_medico,fecha,hora), que impedía liberar
-- cupos cancelados. Se sustituye por un índice único de citas NO CANCELADAS.
DO $m$
DECLARE v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT conname FROM pg_constraint
     WHERE conrelid='public.cita'::regclass
       AND contype='u'
       AND pg_get_constraintdef(oid)='UNIQUE (id_medico, fecha, hora)'
  LOOP
    EXECUTE format('ALTER TABLE public.cita DROP CONSTRAINT %I',v_constraint);
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='public.cita'::regclass
      AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (id_medico, fecha, hora)'
  ) THEN
    RAISE EXCEPTION 'Revisar la restricción de horario de cita antes de continuar';
  END IF;
END $m$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nova_cita_medico_horario_activo
  ON public.cita(id_medico,fecha,hora) WHERE estado <> 'CANCELADA';

-- Preferencias específicas de WhatsApp, separadas del consentimiento comercial.
-- Este paso NO configura ni envía mensajes a WhatsApp.
CREATE TABLE IF NOT EXISTS public.paciente_whatsapp_preferencia (
  id_paciente BIGINT PRIMARY KEY REFERENCES public.paciente(id_paciente) ON DELETE CASCADE,
  numero_e164 VARCHAR(16),
  autorizado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_autorizacion TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nova_wa_numero_valido CHECK (
    numero_e164 IS NULL OR numero_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  CONSTRAINT nova_wa_sin_numero_sin_autorizacion CHECK (NOT autorizado OR numero_e164 IS NOT NULL)
);
ALTER TABLE public.paciente_whatsapp_preferencia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paciente_whatsapp_preferencia FROM PUBLIC, anon, authenticated;

-- Registro privado de acciones sobre citas (sin diagnósticos ni datos clínicos).
CREATE TABLE IF NOT EXISTS public.cita_autogestion_evento (
  id_evento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cita BIGINT NOT NULL REFERENCES public.cita(id_cita),
  id_paciente BIGINT NOT NULL REFERENCES public.paciente(id_paciente),
  actor_auth UUID NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('CANCELAR','REPROGRAMAR')),
  antes JSONB NOT NULL,
  despues JSONB NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cita_autogestion_evento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cita_autogestion_evento FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.api_paciente_cancelar_cita(p_cita_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $f$
DECLARE
  v_patient BIGINT := public.nova_current_paciente_id();
  v_cita public.cita%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_patient IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión como paciente para gestionar tus citas';
  END IF;
  SELECT * INTO v_cita FROM public.cita
   WHERE codigo_cita=trim(p_cita_code) AND id_paciente=v_patient FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada en tu cuenta'; END IF;
  IF v_cita.estado NOT IN ('PROGRAMADA','CONFIRMADA') THEN
    RAISE EXCEPTION 'Solo puedes cancelar citas programadas o confirmadas';
  END IF;
  IF (v_cita.fecha+v_cita.hora) <= (now() AT TIME ZONE 'America/Lima') THEN
    RAISE EXCEPTION 'La cita ya comenzó o pasó. Comunícate con recepción';
  END IF;

  UPDATE public.cita SET estado='CANCELADA' WHERE id_cita=v_cita.id_cita;
  INSERT INTO public.cita_autogestion_evento(id_cita,id_paciente,actor_auth,accion,antes,despues)
  VALUES (v_cita.id_cita,v_patient,auth.uid(),'CANCELAR',
     jsonb_build_object('estado',v_cita.estado,'fecha',v_cita.fecha,'hora',v_cita.hora),
     jsonb_build_object('estado','CANCELADA','fecha',v_cita.fecha,'hora',v_cita.hora));
  INSERT INTO public.notificacion_paciente(id_paciente,titulo,mensaje,tipo)
  VALUES(v_patient,'Cita cancelada',
    'Tu cita '||v_cita.codigo_cita||' fue cancelada desde el portal. Si tienes pagos relacionados, comunícate con recepción.','INFO');
  RETURN jsonb_build_object('ok',true,'id',v_cita.codigo_cita,'status','Cancelada');
END $f$;

CREATE OR REPLACE FUNCTION public.api_paciente_reprogramar_cita(
  p_cita_code TEXT, p_medico_code TEXT, p_sede TEXT, p_fecha DATE, p_hora TIME
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $f$
DECLARE
  v_patient BIGINT := public.nova_current_paciente_id();
  v_old public.cita%ROWTYPE;
  v_sede BIGINT;
  v_doctor BIGINT;
BEGIN
  IF auth.uid() IS NULL OR v_patient IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión como paciente para gestionar tus citas';
  END IF;
  SELECT * INTO v_old FROM public.cita
   WHERE codigo_cita=trim(p_cita_code) AND id_paciente=v_patient FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada en tu cuenta'; END IF;
  IF v_old.estado NOT IN ('PROGRAMADA','CONFIRMADA') THEN
    RAISE EXCEPTION 'Esta cita no se puede reprogramar';
  END IF;
  IF (v_old.fecha+v_old.hora) <= (now() AT TIME ZONE 'America/Lima') THEN
    RAISE EXCEPTION 'La cita original ya comenzó o pasó';
  END IF;
  IF p_fecha IS NULL OR p_hora IS NULL OR p_fecha < (now() AT TIME ZONE 'America/Lima')::date
     OR p_fecha > ((now() AT TIME ZONE 'America/Lima')::date+180)
     OR EXTRACT(ISODOW FROM p_fecha)=7
     OR p_hora < time '07:00' OR p_hora > time '21:00'
     OR (p_fecha+p_hora) <= (now() AT TIME ZONE 'America/Lima')
  THEN
    RAISE EXCEPTION 'Selecciona un horario futuro válido de lunes a sábado, 07:00 a 21:00, dentro de 180 días';
  END IF;

  SELECT s.id_sede INTO v_sede
    FROM public.sede s
   WHERE s.estado='ACTIVA' AND (s.distrito=p_sede OR s.nombre=p_sede OR s.codigo_sede=p_sede)
   LIMIT 1;
  IF v_sede IS NULL THEN RAISE EXCEPTION 'Sede no disponible'; END IF;
  SELECT pe.id_personal INTO v_doctor
    FROM public.personal pe
    JOIN public.medico m ON m.id_personal=pe.id_personal
    LEFT JOIN public.situacion_laboral sl
      ON sl.id_personal=pe.id_personal AND sl.es_actual=TRUE
   WHERE pe.codigo_personal=p_medico_code
     AND pe.id_sede=v_sede AND COALESCE(sl.estado_laboral,'ACTIVO')='ACTIVO'
   LIMIT 1;
  IF v_doctor IS NULL THEN RAISE EXCEPTION 'Médico no disponible en esa sede'; END IF;
  -- Una reprogramación no puede cambiar silenciosamente de especialidad.
  IF NOT EXISTS (
    SELECT 1 FROM public.medico origen JOIN public.medico destino
      ON destino.id_personal=v_doctor
    WHERE origen.id_personal=v_old.id_medico
      AND lower(trim(origen.especialidad))=lower(trim(destino.especialidad))
  ) THEN
    RAISE EXCEPTION 'Para cambiar de especialidad debes solicitar otra cita';
  END IF;
  IF v_doctor=v_old.id_medico AND v_sede=v_old.id_sede
     AND p_fecha=v_old.fecha AND p_hora=v_old.hora THEN
    RAISE EXCEPTION 'Selecciona una fecha, hora o médico diferente';
  END IF;

  BEGIN
    UPDATE public.cita SET id_medico=v_doctor,id_sede=v_sede,
      fecha=p_fecha,hora=p_hora,estado='PROGRAMADA'
    WHERE id_cita=v_old.id_cita;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'El médico ya tiene una cita en ese horario. Elige otro turno';
  END;

  INSERT INTO public.cita_autogestion_evento(id_cita,id_paciente,actor_auth,accion,antes,despues)
  VALUES(v_old.id_cita,v_patient,auth.uid(),'REPROGRAMAR',
    jsonb_build_object('fecha',v_old.fecha,'hora',v_old.hora,'id_medico',v_old.id_medico,'id_sede',v_old.id_sede),
    jsonb_build_object('fecha',p_fecha,'hora',p_hora,'id_medico',v_doctor,'id_sede',v_sede));
  INSERT INTO public.notificacion_paciente(id_paciente,titulo,mensaje,tipo)
  VALUES(v_patient,'Cita reprogramada',
    'Tu cita '||v_old.codigo_cita||' cambió de horario. Revísala en Mis citas.','OK');
  RETURN jsonb_build_object('ok',true,'id',v_old.codigo_cita,
     'status','Programada','fecha',p_fecha,'hora',to_char(p_hora,'HH24:MI'));
END $f$;

CREATE OR REPLACE FUNCTION public.api_paciente_whatsapp_preferencias()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth
AS $f$
DECLARE
  v_patient BIGINT := public.nova_current_paciente_id();
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR v_patient IS NULL THEN
    RAISE EXCEPTION 'Sesión de paciente requerida';
  END IF;
  SELECT jsonb_build_object('numero',numero_e164,'autorizado',autorizado)
    INTO v_result FROM public.paciente_whatsapp_preferencia
    WHERE id_paciente=v_patient;
  RETURN COALESCE(v_result, jsonb_build_object('numero','','autorizado',false));
END $f$;

CREATE OR REPLACE FUNCTION public.api_paciente_whatsapp_guardar(
  p_numero TEXT, p_autorizado BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $f$
DECLARE
  v_patient BIGINT := public.nova_current_paciente_id();
  v_numero TEXT := trim(COALESCE(p_numero,''));
  v_aut BOOLEAN := COALESCE(p_autorizado,false);
BEGIN
  IF auth.uid() IS NULL OR v_patient IS NULL THEN
    RAISE EXCEPTION 'Sesión de paciente requerida';
  END IF;
  IF v_aut AND v_numero !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Ingresa tu número con formato internacional, por ejemplo +51912345678';
  END IF;
  INSERT INTO public.paciente_whatsapp_preferencia
     (id_paciente,numero_e164,autorizado,fecha_autorizacion,actualizado_en)
  VALUES (v_patient,CASE WHEN v_aut THEN v_numero ELSE NULL END,
     v_aut,CASE WHEN v_aut THEN now() ELSE NULL END,now())
  ON CONFLICT (id_paciente) DO UPDATE SET
     numero_e164=EXCLUDED.numero_e164,autorizado=EXCLUDED.autorizado,
     fecha_autorizacion=EXCLUDED.fecha_autorizacion,actualizado_en=now();
  RETURN jsonb_build_object('numero',CASE WHEN v_aut THEN v_numero ELSE '' END,'autorizado',v_aut);
END $f$;

REVOKE ALL ON FUNCTION public.api_paciente_cancelar_cita(TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_paciente_reprogramar_cita(TEXT,TEXT,TEXT,DATE,TIME) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_paciente_whatsapp_preferencias() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_paciente_whatsapp_guardar(TEXT,BOOLEAN) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.api_paciente_cancelar_cita(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_paciente_reprogramar_cita(TEXT,TEXT,TEXT,DATE,TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_paciente_whatsapp_preferencias() TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_paciente_whatsapp_guardar(TEXT,BOOLEAN) TO authenticated;

COMMIT;
