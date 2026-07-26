# Supabase — lista de regalos

## 1. Setup

```zsh
./scripts/setup-supabase.sh
```

Pide la contraseña de Postgres (sin mostrarla) y la anon key, escribe
`.env.local` con permisos 600, aplica `supabase/schema.sql` y verifica que la
separación con la otra boda siga intacta.

La **anon key** sale de: Supabase Dashboard → Project Settings → API → `anon public`.

### Conexión: usar el POOLER, no el host directo

`db.<ref>.supabase.co` tiene **solo registro AAAA** — Supabase pasó las
conexiones directas a IPv6-only. En cualquier red sin ruta IPv6 hasta AWS falla
con un `Connection refused` pelado que parece contraseña equivocada. El script
usa el pooler, que es dual-stack:

```
postgresql://postgres.rrvicoesafbuwrzrvfaa:<PW>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

Dos detalles que rompen la conexión si se cambian:

- El usuario lleva el project ref pegado (`postgres.rrvicoesafbuwrzrvfaa`). Con
  `postgres` a secas el pooler no sabe qué tenant querés y rechaza el login.
- El prefijo es `aws-1-`, no `aws-0-`. Son endpoints distintos; `aws-0-sa-east-1`
  rechaza la conexión de este proyecto.

`DATABASE_URL` no lleva prefijo `NEXT_PUBLIC_` y nunca debe llevarlo: es la
contraseña de `postgres`, con permisos totales. Solo lo prefijado con
`NEXT_PUBLIC_` llega al navegador.

## 2. Verificar la separación con la otra boda

El proyecto hermano (`../bym`, Mauro & Barbi) usa las tablas **sin prefijo**:
`gift_categories`, `gift_items`, `gift_reservations`, más las vistas
`gift_items_availability` y `gift_custom_reservations_public`.

Sus páginas las consultan con un `.select('*')` pelado, **sin ningún filtro por
boda**. Por eso esta lista vive en tablas `nyn_gift_*` propias: la separación es
estructural, no una convención que alguien tenga que recordar. Sus consultas
nombran `gift_*` y nunca pueden alcanzar `nyn_gift_*`.

**Comparten la misma instancia** — verificado: `gift_*` y `nyn_gift_*` conviven
en el schema `public` del mismo proyecto. Por eso el prefijo no es cosmético.
El script corre esta verificación solo al final; a mano:

```zsh
psql "$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" -c \
  "select count(*) from gift_items_availability;"  -- 47: solo lo de ellos
psql "$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" -c \
  "select count(*) from nyn_gift_items;"           -- 12: solo lo nuestro
```

Ojo con comparar por NOMBRE: "Aire acondicionado" y "Mesas de luz" están en las
dos listas, pero son filas distintas con UUID distintos. Un join por `name` da
2 coincidencias y eso **no** es mezcla — comparar por `id`, como hace el script.

**Nunca** insertar regalos de esta boda en las tablas `gift_*`.

## Modelo

- `nyn_gift_categories` — Dormitorio, Cocina, Hogar.
- `nyn_gift_items` — los 12 regalos, con `category_id` y `sort_order`.
- `nyn_gift_reservations` — una fila por reserva. `item_id` **o**
  `custom_item_name`, nunca ambos (lo fuerza un CHECK).
- `nyn_gift_items_availability` (vista) — items + si están reservados y por quién.
- `nyn_gift_custom_reservations_public` (vista) — los regalos que un invitado
  escribió a mano.

El índice único parcial `nyn_gift_reservations_item_unique` es lo que hace que
un regalo se pueda reservar **una sola vez**. Si dos invitados confirman el
mismo regalo en el mismo instante, el segundo recibe un error `23505` y el
wizard lo manda de vuelta a la lista recargada. Chequear disponibilidad solo en
el frontend permitiría reservas dobles.
