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


-- ══════════════════════════════════════════════════════════════════════
-- EL BUZÓN DE MEDIDAS
--
-- Para lo que se mide desde otro sitio que no es el móvil: el reloj, un atajo,
-- lo que venga.
--
-- Hace falta una tabla aparte y no vale la de arriba. `ritmo_datos` guarda el
-- JSON entero de la cuenta en una sola fila, y el móvil lo fusiona en el
-- dispositivo antes de subirlo; para escribir ahí desde el reloj habría que
-- bajarse todo, entender el esquema entero y volver a subirlo, y dos aparatos
-- escribiendo la misma fila acabarían pisándose.
--
-- Aquí en cambio solo se **añaden filas pequeñas**, que es lo único que un
-- reloj sabe hacer bien. El móvil las recoge al sincronizar, las mete donde van
-- (ver src/domain/buzon.ts) y las borra.
--
-- Se ejecuta después del bloque de arriba, en el mismo editor SQL. Ejecutarlo
-- dos veces no rompe nada.


-- ── 5. La tabla ───────────────────────────────────────────
-- El `id` lo pone quien escribe y no la base de datos, a propósito: ese mismo
-- id acaba siendo el del rato de sol o la sesión que se guarda en el móvil, y
-- es lo que permite que recoger dos veces no duplique nada. Si el reloj manda
-- la misma medida dos veces por un fallo de red, la segunda choca con la clave
-- primaria y no pasa nada.
create table if not exists public.ritmo_medidas (
  id text primary key,
  user_id uuid not null default auth.uid(),
  creado_en timestamptz not null default now(),

  -- Lo mínimo para reconstruir lo que estaba en marcha.
  tipo text not null,
  date text not null,
  desde int not null,
  -- Nulo mientras siga en marcha. El móvil no la recoge hasta que se cierra.
  hasta int,

  -- El contexto, si quien mide lo sabe. Un atajo del reloj puede no saberlo, y
  -- entonces se resuelve con lo mismo que usa la app cuando el usuario no lo
  -- dice.
  piel text,
  cielo text,
  filtro text,
  lampara_id text,
  zona text,
  distancia_cm int,

  -- Solo para poder decirlo: «reloj», «atajo».
  origen text
);

-- Para que el móvil pida solo lo suyo y lo más reciente sin recorrer la tabla.
create index if not exists ritmo_medidas_por_usuario
  on public.ritmo_medidas (user_id, creado_en);


-- ── 6. El mismo aislamiento ───────────────────────────────
-- Sin esto, la clave pública que viaja en la app dejaría leer las medidas de
-- cualquiera. Con esto, sin sesión iniciada no se ve ni una fila.
alter table public.ritmo_medidas enable row level security;

drop policy if exists ritmo_medidas_solo_lo_mio on public.ritmo_medidas;

create policy ritmo_medidas_solo_lo_mio
  on public.ritmo_medidas
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── 7. Comprobación ───────────────────────────────────────
-- Debe devolver dos filas —ritmo_datos y ritmo_medidas—, las dos con el
-- aislamiento activado y una política cada una.
select
  c.relname as tabla,
  c.relrowsecurity as aislamiento_activado,
  count(p.polname) as politicas
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relname in ('ritmo_datos', 'ritmo_medidas')
group by c.relname, c.relrowsecurity
order by c.relname;
