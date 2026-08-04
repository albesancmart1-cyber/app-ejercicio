-- Esquema de Ritmo en Supabase.
--
-- Una fila por cuenta con el JSON entero. La app fusiona en el dispositivo
-- (src/domain/merge.ts) y sube el resultado ya resuelto, así que la base de
-- datos no necesita saber nada de sesiones, mediciones ni check-ins: solo
-- guardar y devolver lo que le den, y asegurarse de que cada uno solo toca lo
-- suyo.
--
-- Se ejecuta una vez, desde el editor SQL del panel de Supabase.

create table if not exists public.ritmo_datos (
  user_id uuid primary key references auth.users on delete cascade,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

-- El dueño de la fila es siempre quien la escribe. Sin esto, la política de
-- abajo no tendría con qué comparar en un INSERT.
alter table public.ritmo_datos
  alter column user_id set default auth.uid();

-- Aislamiento por filas: es lo que hace que la clave pública que va en la app
-- sea inofensiva. Sin sesión iniciada no se ve ni una fila, y con sesión solo
-- se ve la propia.
alter table public.ritmo_datos enable row level security;

drop policy if exists "cada cuenta ve y escribe solo lo suyo" on public.ritmo_datos;
create policy "cada cuenta ve y escribe solo lo suyo"
  on public.ritmo_datos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
