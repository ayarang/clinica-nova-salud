-- CLÍNICA NOVA SALUD v8.0 · TURNOS Y SOLICITUDES DE INSUMOS
-- MIGRACIÓN ADITIVA. Revisar y ejecutar manualmente en Supabase SQL Editor
-- tras el esquema clínico existente. NO se ejecuta al publicar GitHub Pages.
-- Probar primero en staging. Respaldar antes. No usar registros de pacientes reales en demo.
BEGIN;

CREATE TABLE IF NOT EXISTS public.nova_v80_turno (
  id_turno BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cita BIGINT NOT NULL UNIQUE REFERENCES public.cita(id_cita) ON DELETE RESTRICT,
  estado TEXT NOT NULL DEFAULT 'EN_ESPERA'
    CHECK (estado IN ('EN_ESPERA','EN_ATENCION','FINALIZADO','ANULADO')),
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_auth UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nova_v80_turno_fecha ON public.nova_v80_turno(fecha_registro DESC);

CREATE TABLE IF NOT EXISTS public.nova_v80_solicitud_insumo (
  id_solicitud BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitante_auth UUID NOT NULL,
  sede TEXT NOT NULL,
  producto TEXT NOT NULL CHECK (length(trim(producto)) BETWEEN 3 AND 120),
  cantidad INT NOT NULL CHECK (cantidad BETWEEN 1 AND 1000),
  nota TEXT NOT NULL DEFAULT '' CHECK (length(nota) <= 350),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','ENTREGADA')),
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_revision TIMESTAMPTZ,
  revisor_auth UUID,
  fecha_entrega TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_nova_v80_solicitud_sede_estado
  ON public.nova_v80_solicitud_insumo(sede,estado,fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_nova_v80_solicitud_solicitante
  ON public.nova_v80_solicitud_insumo(solicitante_auth);

ALTER TABLE public.nova_v80_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nova_v80_solicitud_insumo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nova_v80_turno, public.nova_v80_solicitud_insumo FROM PUBLIC,anon,authenticated;
-- Las dos tablas SOLO se operan mediante RPC con comprobación de rol/sede.

CREATE OR REPLACE FUNCTION public.nova_v80_staff_context()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public,auth
AS $f$
DECLARE v_profile JSONB;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
 v_profile := to_jsonb(public.mi_perfil_staff());
 IF v_profile IS NULL OR v_profile->>'kind' IS DISTINCT FROM 'staff'
    OR COALESCE(v_profile->>'role','') NOT IN
     ('gerencia','recepcion','medico','enfermeria','almacen') THEN
    RAISE EXCEPTION 'Tu perfil no tiene permisos para esta función';
 END IF;
 RETURN v_profile;
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_turnos_listar()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v_rol TEXT; v_sede TEXT; v_medico TEXT; v_patient BIGINT; v_result JSONB;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida'; END IF;
 v_patient:=public.nova_current_paciente_id();
 IF v_patient IS NULL THEN
   SELECT x->>'role',x->>'branch',x->>'staffCode' INTO v_rol,v_sede,v_medico
   FROM (SELECT public.nova_v80_staff_context() x) s;
 END IF;
 IF v_patient IS NULL AND v_rol NOT IN ('recepcion','medico','enfermeria','gerencia') THEN
   RAISE EXCEPTION 'No autorizado para consultar turnos';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
     'id',t.id_turno,'codigo','A-'||lpad(t.id_turno::text,4,'0'),
     'cita',c.codigo_cita,'fecha',c.fecha,'hora',c.hora,
     'sede',s.nombre,'estado',t.estado,'registrado',t.fecha_registro)
     ORDER BY t.fecha_registro DESC),'[]'::jsonb) INTO v_result
 FROM public.nova_v80_turno t
 JOIN public.cita c ON c.id_cita=t.id_cita
 JOIN public.sede s ON s.id_sede=c.id_sede
 WHERE c.fecha=(now() AT TIME ZONE 'America/Lima')::date
   AND ( (v_patient IS NOT NULL AND c.id_paciente=v_patient)
      OR (v_patient IS NULL AND
       (v_rol='gerencia' OR (s.nombre=v_sede OR s.distrito=v_sede))
       AND (v_rol<>'medico' OR EXISTS(
        SELECT 1 FROM public.personal p WHERE p.id_personal=c.id_medico
          AND p.codigo_personal=v_medico))
      )
   );
 RETURN v_result;
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_turno_registrar(p_codigo_cita TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v JSONB; v_rol TEXT; v_sede TEXT; v_cita public.cita%ROWTYPE; v_name TEXT; v_dist TEXT; v_id BIGINT;
BEGIN
 v:=public.nova_v80_staff_context();v_rol:=v->>'role';v_sede:=v->>'branch';
 IF v_rol NOT IN ('gerencia','recepcion') THEN RAISE EXCEPTION 'Solo Recepción o Gerencia registran llegadas'; END IF;
 SELECT * INTO v_cita FROM public.cita WHERE codigo_cita=trim(p_codigo_cita) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró la cita'; END IF;
 SELECT nombre,distrito INTO v_name,v_dist FROM public.sede WHERE id_sede=v_cita.id_sede;
 IF v_rol<>'gerencia' AND NOT (COALESCE(v_sede=v_name,false) OR COALESCE(v_sede=v_dist,false)) THEN RAISE EXCEPTION 'Cita de otra sede'; END IF;
 IF v_cita.fecha<>(now() AT TIME ZONE 'America/Lima')::date THEN
  RAISE EXCEPTION 'Solo se registran llegadas para citas de hoy';
 END IF;
 IF v_cita.estado NOT IN ('PROGRAMADA','CONFIRMADA') THEN
  RAISE EXCEPTION 'La cita no está habilitada para admisión';
 END IF;
 INSERT INTO public.nova_v80_turno(id_cita,actor_auth)
 VALUES (v_cita.id_cita,auth.uid()) ON CONFLICT(id_cita) DO NOTHING
 RETURNING id_turno INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Esta cita ya tiene turno registrado'; END IF;
 RETURN jsonb_build_object('id',v_id,'codigo','A-'||lpad(v_id::text,4,'0'),'estado','EN_ESPERA');
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_turno_estado(p_id BIGINT,p_estado TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v JSONB;v_rol TEXT;v_sede TEXT;v_staff TEXT;v_actual TEXT;v_turno public.nova_v80_turno%ROWTYPE;
 v_fecha DATE;v_name TEXT;v_dist TEXT;v_med BIGINT;
BEGIN
 v:=public.nova_v80_staff_context();
 v_rol:=v->>'role';v_sede:=v->>'branch';v_staff:=v->>'staffCode';
 IF v_rol NOT IN ('gerencia','recepcion','medico') THEN RAISE EXCEPTION 'Rol no autorizado'; END IF;
 SELECT * INTO v_turno FROM public.nova_v80_turno WHERE id_turno=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
 SELECT c.fecha,s.nombre,s.distrito,c.id_medico INTO v_fecha,v_name,v_dist,v_med
 FROM public.cita c JOIN public.sede s ON s.id_sede=c.id_sede WHERE c.id_cita=v_turno.id_cita;
 IF v_fecha<>(now() AT TIME ZONE 'America/Lima')::date THEN RAISE EXCEPTION 'Solo se gestiona la atención de hoy'; END IF;
 IF v_rol<>'gerencia' AND NOT (COALESCE(v_sede=v_name,false) OR COALESCE(v_sede=v_dist,false)) THEN RAISE EXCEPTION 'Turno de otra sede'; END IF;
 IF v_rol='medico' AND NOT EXISTS(
   SELECT 1 FROM public.personal WHERE id_personal=v_med AND codigo_personal=v_staff
 ) THEN RAISE EXCEPTION 'El turno pertenece a otro médico'; END IF;
 v_actual:=v_turno.estado;
 IF NOT ((v_actual='EN_ESPERA' AND p_estado IN ('EN_ATENCION','ANULADO'))
   OR(v_actual='EN_ATENCION' AND p_estado='FINALIZADO')) THEN
   RAISE EXCEPTION 'Transición de turno no permitida';
 END IF;
 UPDATE public.nova_v80_turno SET estado=p_estado,fecha_actualizacion=now() WHERE id_turno=p_id;
 RETURN jsonb_build_object('ok',true,'id',p_id,'estado',p_estado);
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_solicitudes_listar()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v JSONB;v_rol TEXT;v_sede TEXT;v_result JSONB;
BEGIN
 v:=public.nova_v80_staff_context();v_rol:=v->>'role';v_sede:=v->>'branch';
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',id_solicitud,'producto',producto,'cantidad',cantidad,'sede',sede,
  'estado',estado,'fecha',fecha_solicitud,'nota',nota) ORDER BY fecha_solicitud DESC),'[]'::jsonb)
 INTO v_result FROM public.nova_v80_solicitud_insumo x
 WHERE (v_rol='gerencia' OR (v_rol='almacen' AND x.sede=v_sede)
    OR (v_rol IN ('medico','enfermeria') AND x.solicitante_auth=auth.uid()));
 RETURN v_result;
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_solicitud_crear(
 p_producto TEXT,p_cantidad INT,p_nota TEXT DEFAULT ''
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v JSONB;v_rol TEXT;v_sede TEXT;v_id BIGINT;
BEGIN
 v:=public.nova_v80_staff_context();v_rol:=v->>'role';v_sede:=v->>'branch';
 IF v_rol NOT IN ('medico','enfermeria','gerencia') THEN RAISE EXCEPTION 'No puedes solicitar insumos'; END IF;
 IF length(trim(COALESCE(p_producto,''))) NOT BETWEEN 3 AND 120
  OR p_cantidad NOT BETWEEN 1 AND 1000
  OR length(COALESCE(p_nota,''))>350 THEN RAISE EXCEPTION 'Verifica producto, cantidad y nota'; END IF;
 IF v_sede IS NULL OR v_sede='' THEN RAISE EXCEPTION 'La cuenta no tiene sede'; END IF;
 INSERT INTO public.nova_v80_solicitud_insumo(solicitante_auth,sede,producto,cantidad,nota)
 VALUES(auth.uid(),v_sede,trim(p_producto),p_cantidad,COALESCE(p_nota,''))
 RETURNING id_solicitud INTO v_id;
 RETURN jsonb_build_object('id',v_id,'estado','PENDIENTE','ok',true);
END $f$;

CREATE OR REPLACE FUNCTION public.api_v80_solicitud_estado(p_id BIGINT,p_estado TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth
AS $f$
DECLARE v JSONB;v_rol TEXT;v_sede TEXT;v_row public.nova_v80_solicitud_insumo%ROWTYPE;
BEGIN
 v:=public.nova_v80_staff_context();v_rol:=v->>'role';v_sede:=v->>'branch';
 IF v_rol NOT IN ('almacen','gerencia') THEN RAISE EXCEPTION 'Solo Almacén o Gerencia revisan solicitudes'; END IF;
 SELECT * INTO v_row FROM public.nova_v80_solicitud_insumo WHERE id_solicitud=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
 IF v_rol<>'gerencia' AND NOT COALESCE(v_sede=v_row.sede,false) THEN RAISE EXCEPTION 'Solicitud de otra sede'; END IF;
 IF NOT ((v_row.estado='PENDIENTE' AND p_estado IN('APROBADA','RECHAZADA'))
  OR (v_row.estado='APROBADA' AND p_estado='ENTREGADA')) THEN
    RAISE EXCEPTION 'Transición de solicitud no permitida';
 END IF;
 UPDATE public.nova_v80_solicitud_insumo SET estado=p_estado,revisor_auth=auth.uid(),
  fecha_revision=now(),fecha_entrega=CASE WHEN p_estado='ENTREGADA' THEN now() ELSE fecha_entrega END
  WHERE id_solicitud=p_id;
 -- IMPORTANTE: marcar entregada NO descuenta stock automáticamente.
 -- Registrar salida por separado en el módulo de movimientos de inventario.
 RETURN jsonb_build_object('ok',true,'id',p_id,'estado',p_estado);
END $f$;

REVOKE ALL ON FUNCTION public.nova_v80_staff_context() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.api_v80_turnos_listar() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_v80_turno_registrar(TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_v80_turno_estado(BIGINT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_v80_solicitudes_listar() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_v80_solicitud_crear(TEXT,INT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.api_v80_solicitud_estado(BIGINT,TEXT) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.api_v80_turnos_listar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v80_turno_registrar(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v80_turno_estado(BIGINT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v80_solicitudes_listar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v80_solicitud_crear(TEXT,INT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_v80_solicitud_estado(BIGINT,TEXT) TO authenticated;
COMMIT;
