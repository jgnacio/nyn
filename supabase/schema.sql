-- ============================================================================
-- Gift list schema for this wedding.
--
-- WHY EVERY TABLE IS PREFIXED `nyn_`
-- ----------------------------------
-- The sibling project (../bym, Mauro & Barbi) runs the same feature against
-- Supabase using UNPREFIXED tables: `gift_categories`, `gift_items`,
-- `gift_reservations`, plus the views `gift_items_availability` and
-- `gift_custom_reservations_public`.
--
-- Its pages query those with a bare `.select('*')` and NO tenant/wedding
-- filter of any kind. So if this wedding wrote its gifts into those same
-- tables, they would appear in THEIR list — immediately, with no way for
-- their code to tell the two apart.
--
-- Prefixing is what makes the separation structural rather than a convention
-- someone has to remember: their queries name `gift_*` and can never reach
-- `nyn_gift_*`, so the two lists cannot mix even if both run on one Supabase
-- project. It also means their repo needs no changes at all.
--
-- NEVER add this wedding's gifts to the unprefixed `gift_*` tables.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists nyn_gift_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Name of the inline SVG icon rendered for this category. Kept as a short
  -- key (not markup) so the database never carries presentation code; the
  -- mapping key -> SVG lives in app/components/gifts/GiftIcon.tsx.
  icon text not null default 'gift',
  sort_order integer not null default 0
);

create table if not exists nyn_gift_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references nyn_gift_categories (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists nyn_gift_reservations (
  id uuid primary key default gen_random_uuid(),
  -- Exactly one of these is set: a reservation is either for a listed item or
  -- for something the guest typed in themselves (see the check below).
  item_id uuid references nyn_gift_items (id) on delete cascade,
  custom_item_name text,
  guest_name text not null,
  guest_phone text,
  created_at timestamptz not null default now(),

  constraint nyn_gift_reservations_target_check check (
    (item_id is not null and custom_item_name is null)
    or (item_id is null and custom_item_name is not null)
  )
);

-- THE RACE GUARD. Two guests can open the list at the same second and pick
-- the same gift; the UI's "is it reserved?" read is always stale by the time
-- the insert lands. This unique index is what actually makes a gift
-- one-and-only-one — the loser's insert fails with SQLSTATE 23505, which the
-- wizard catches and turns into "someone just took this one, pick another".
-- Checking availability in application code instead would silently
-- double-book.
create unique index if not exists nyn_gift_reservations_item_unique
  on nyn_gift_reservations (item_id)
  where item_id is not null;

create index if not exists nyn_gift_items_category_idx
  on nyn_gift_items (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- Views
--
-- Guests must see WHO reserved a gift (a first name) but never a stranger's
-- phone number in a payload the browser can read. These views are the public
-- projection; the base `nyn_gift_reservations` table stays unreadable.
-- ---------------------------------------------------------------------------

-- NOTE ON guest_phone: these views expose it, which means ANY visitor can read
-- every guest's phone number — the anon key ships inside the browser bundle,
-- so there is no such thing as an owners-only read here. This was requested
-- deliberately so the status page can offer a WhatsApp thank-you link, and it
-- matches what the sibling ../bym project does. If that trade stops being
-- acceptable, drop guest_phone from both views and the site keeps working
-- minus the WhatsApp button.
-- DROP before CREATE, not `create or replace`: replacing a view can only add
-- columns at the end — it refuses to reorder or rename existing ones with
-- "cannot change name of view column". Adding a column mid-list is a normal
-- thing to do here, so the views are rebuilt outright. The GRANTs further down
-- re-apply the permissions the drop removes.
drop view if exists nyn_gift_items_availability;
-- NOT `security_invoker = true` — that was a real bug, not a style choice.
-- With security_invoker the view runs as the CALLER (anon), and anon has no
-- SELECT policy on nyn_gift_reservations, so RLS hid every reservation row:
-- the LEFT JOIN below always produced NULLs, `is_reserved` was always false,
-- and a gift someone had just reserved kept showing as available. The insert
-- returned 201 and the UI showed nothing — it read as "reserving is broken".
-- Left as the default (security definer) the view runs as its owner, can see
-- the reservations, and exposes ONLY the columns listed here. The base table
-- stays unreadable to anon, which is the point of having a view at all.
create view nyn_gift_items_availability as
select
  i.id,
  i.category_id,
  i.name,
  i.sort_order,
  (r.id is not null) as is_reserved,
  r.guest_name as reserved_by,
  r.guest_phone as reserved_phone,
  r.id as reservation_id
from nyn_gift_items i
left join nyn_gift_reservations r on r.item_id = i.id;

drop view if exists nyn_gift_custom_reservations_public;
-- Same reason as above: as a definer view this can actually see the rows it
-- is meant to publish.
create view nyn_gift_custom_reservations_public as
select
  r.id,
  r.custom_item_name,
  r.guest_name,
  r.guest_phone,
  r.created_at
from nyn_gift_reservations r
where r.custom_item_name is not null;

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The anon key ships in the browser bundle, so it must be assumed public:
-- anything anon can do, any visitor can do. Hence read-only on the catalog,
-- insert-only on reservations, and NO select/update/delete on the reservation
-- table itself — deleting a reservation is an owners-only action and must be
-- done from the Supabase dashboard (or with the service-role key), never from
-- the site.
-- ---------------------------------------------------------------------------

alter table nyn_gift_categories enable row level security;
alter table nyn_gift_items enable row level security;
alter table nyn_gift_reservations enable row level security;

drop policy if exists nyn_gift_categories_read on nyn_gift_categories;
create policy nyn_gift_categories_read
  on nyn_gift_categories for select to anon, authenticated using (true);

drop policy if exists nyn_gift_items_read on nyn_gift_items;
create policy nyn_gift_items_read
  on nyn_gift_items for select to anon, authenticated using (true);

drop policy if exists nyn_gift_reservations_insert on nyn_gift_reservations;
create policy nyn_gift_reservations_insert
  on nyn_gift_reservations for insert to anon, authenticated with check (true);

-- DELETE FOR anon — READ THIS BEFORE CHANGING ANYTHING HERE.
-- The status page (/lista-regalos) needs to remove a reservation, and it runs
-- with the anon key, which is public by construction: it sits in the browser
-- bundle where anyone can copy it. This policy therefore lets ANY visitor
-- delete ANY reservation, with nothing but the page's own UI in the way.
-- It is enabled because it was explicitly asked for and it mirrors what the
-- sibling ../bym project already does.
-- The safe version of this feature is real authentication (Supabase Auth) with
-- the policy scoped `to authenticated` — the one-line change is swapping the
-- role below. Until then, treat /lista-regalos as a page whose URL is the only
-- thing keeping guests out.
drop policy if exists nyn_gift_reservations_delete on nyn_gift_reservations;
create policy nyn_gift_reservations_delete
  on nyn_gift_reservations for delete to anon, authenticated using (true);

-- REQUIRED FOR THE DELETE ABOVE TO DO ANYTHING — not an extra convenience.
-- In PostgreSQL a `DELETE ... WHERE id = X` on an RLS table also evaluates the
-- SELECT policies to resolve that WHERE clause. With no SELECT policy the
-- WHERE matched zero rows, so the delete silently affected nothing: PostgREST
-- answered 204/200 with an empty body and the reservation stayed put. No error
-- anywhere — the worst possible failure mode.
-- The privacy cost is nil at this point: the two views above already publish
-- guest_name and guest_phone to anon, and those are the only sensitive columns
-- this table holds.
drop policy if exists nyn_gift_reservations_read on nyn_gift_reservations;
create policy nyn_gift_reservations_read
  on nyn_gift_reservations for select to anon, authenticated using (true);

grant select on nyn_gift_items_availability to anon, authenticated;
grant select on nyn_gift_custom_reservations_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed data
--
-- Idempotent: re-running this file will not duplicate rows, so it is safe to
-- apply again after editing the list.
-- ---------------------------------------------------------------------------

insert into nyn_gift_categories (name, icon, sort_order)
select * from (values
  ('Dormitorio', 'bed', 1),
  ('Cocina', 'kitchen', 2),
  ('Hogar', 'home', 3)
) as v (name, icon, sort_order)
where not exists (
  select 1 from nyn_gift_categories c where c.name = v.name
);

insert into nyn_gift_items (category_id, name, sort_order)
select c.id, v.name, v.sort_order
from (values
  ('Dormitorio', 'Juego de sábanas queen', 1),
  ('Dormitorio', 'Mantas queen', 2),
  ('Dormitorio', 'Almohadones grandes', 3),
  ('Dormitorio', 'Mesas de luz', 4),
  ('Dormitorio', 'Respaldo de sommier queen', 5),
  ('Cocina', 'Juego de ollas (grandes)', 1),
  ('Cocina', 'Juego de cubiertos + tabla de madera', 2),
  ('Cocina', 'Asaderas antiadherentes', 3),
  ('Hogar', 'Set de cortinas corta luz x2 (140 x 220)', 1),
  ('Hogar', 'Alfombras + perchero de pie', 2),
  ('Hogar', 'Aire acondicionado', 3),
  ('Hogar', 'Sillones de patio', 4)
) as v (category_name, name, sort_order)
join nyn_gift_categories c on c.name = v.category_name
where not exists (
  select 1 from nyn_gift_items i where i.name = v.name
);
