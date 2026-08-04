-- Esquema de Ritmo en Supabase.
--
-- Una fila por cuenta con el JSON entero. La app fusiona en el dispositivo
-- (src/domain/merge.ts) y sube el resultado ya resuelto, así que la base de
-- datos no necesita saber nada de sesiones, mediciones ni check-ins: solo
-- guardar y devolver lo que le den, y asegurarse de que cada uno solo toca lo
-- suyo.
--
-- Se ejecuta una vez, desde el editor SQL del panel de Supabase. Se puede pegar
-- entero y darle a «Run», o pegar bloque a bloque si algo falla, para ver cuál
-- es el que se queja. Ejecutarlo dos veces no rompe nada.


-- ── 1. La tabla ───────────────────────────────────────────
-- `user_id` se rellena solo con quien esté escribiendo, así que la app nunca
-- manda ese campo y no puede equivocarse de dueño.
--
-- A propósito NO hay clave foránea contra `auth.users`: lo único que daría es
-- borrar la fila si algún día se borra la cuenta, y a cambio es la sentencia
-- con más papeletas de chocar con los permisos del proyecto. El aislamiento de
-- abajo es lo que de verdad protege los datos.
create table if not exists public.ritmo_datos (
  user_id uuid primary key default auth.uid(),
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);


-- ── 2. Aislamiento por filas ──────────────────────────────
-- Esto es lo que hace que la clave pública que viaja dentro de la app sea
-- inofensiva: sin sesión iniciada no se ve ni una fila.
alter table public.ritmo_datos enable row level security;


-- ── 3. La única regla ─────────────────────────────────────
-- Cada cuenta ve y escribe solo lo suyo, tanto al leer como al insertar y al
-- actualizar (`for all` cubre los cuatro verbos).
drop policy if exists ritmo_datos_solo_lo_mio on public.ritmo_datos;

create policy ritmo_datos_solo_lo_mio
  on public.ritmo_datos
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── 4. Comprobación ───────────────────────────────────────
-- Al terminar debe devolver una fila: ritmo_datos, con el aislamiento activado
-- y una política. Si sale eso, el paso está hecho.
select
  c.relname as tabla,
  c.relrowsecurity as aislamiento_activado,
  count(p.polname) as politicas
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relname = 'ritmo_datos'
group by c.relname, c.relrowsecurity;
