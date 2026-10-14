-- ============================================================
--  Sistema de simulación de phishing (experimento educativo)
--  Esquema de base de datos para Supabase (PostgreSQL)
-- ============================================================
--  Ejecuta este script en el editor SQL de Supabase.
--  Crea las tablas: participantes, eventos, configuracion.
-- ============================================================

-- Extensión para generar UUIDs (normalmente ya está activa en Supabase)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabla: participantes
-- Un registro por cada participación en la simulación.
-- ------------------------------------------------------------
create table if not exists public.participantes (
  id             uuid primary key default gen_random_uuid(),
  -- correo y password quedan nulos al abrir la página (evento 'acceso')
  -- y se completan cuando el participante envía el formulario.
  correo         text,
  password       text,
  estado         text not null default 'iniciado'
                 check (estado in ('iniciado', 'finalizado')),
  fecha_registro timestamptz not null default now()
);

create index if not exists idx_participantes_fecha
  on public.participantes (fecha_registro desc);

create index if not exists idx_participantes_correo
  on public.participantes (lower(correo));

-- ------------------------------------------------------------
-- Tabla: eventos
-- Historial de interacciones ligadas a un participante.
--   tipo_evento: 'acceso' | 'credenciales' | 'continuacion' | 'finalizacion'
-- ------------------------------------------------------------
create table if not exists public.eventos (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid references public.participantes (id) on delete cascade,
  tipo_evento     text not null
                  check (tipo_evento in ('acceso', 'credenciales', 'continuacion', 'finalizacion')),
  fecha_evento    timestamptz not null default now()
);

create index if not exists idx_eventos_participante
  on public.eventos (participante_id);

create index if not exists idx_eventos_tipo
  on public.eventos (tipo_evento);

create index if not exists idx_eventos_fecha
  on public.eventos (fecha_evento desc);

-- ------------------------------------------------------------
-- Tabla: configuracion
-- Estado global de la actividad (una sola fila).
-- ------------------------------------------------------------
create table if not exists public.configuracion (
  id                  int primary key default 1,
  actividad_activa    boolean not null default true,
  fecha_actualizacion timestamptz not null default now(),
  constraint configuracion_fila_unica check (id = 1)
);

-- Fila inicial de configuración (actividad habilitada por defecto)
insert into public.configuracion (id, actividad_activa)
values (1, true)
on conflict (id) do nothing;

-- ============================================================
--  Seguridad (RLS)
-- ------------------------------------------------------------
--  El backend usa la SERVICE ROLE KEY, que ignora RLS. Por eso
--  activamos RLS y NO creamos políticas públicas: así, aunque
--  alguien obtenga la ANON KEY, no podrá leer ni escribir estas
--  tablas directamente. Todo pasa por el backend de Express.
-- ============================================================
alter table public.participantes enable row level security;
alter table public.eventos       enable row level security;
alter table public.configuracion enable row level security;
