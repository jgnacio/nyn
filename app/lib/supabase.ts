import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// `NEXT_PUBLIC_` (not Astro's `PUBLIC_`, which is what the sibling ../bym
// project uses) is what Next.js inlines into the browser bundle. Without the
// prefix these read as `undefined` on the client and every query fails.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// LAZY ON PURPOSE — do not hoist this back to a module-level `createClient`.
// The gift pages are Client Components, but Next.js still evaluates their
// modules on the server while prerendering. A top-level `createClient` (or a
// top-level throw on missing env) therefore runs at BUILD time, where these
// variables may legitimately be absent, and takes the whole build down —
// including the pages that have nothing to do with Supabase. Deferring to
// first call keeps the failure where it belongs: at query time, in the
// browser, with a message that names the missing variables.
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }
  client = createClient(supabaseUrl, supabaseAnonKey, {
    // No login anywhere on this site, so there is no session to persist or
    // refresh. Leaving these on makes the client write to localStorage and
    // keep a refresh timer alive for a session that never exists.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Every table here is prefixed `nyn_` on purpose — see the long comment at the
// top of supabase/schema.sql. The unprefixed `gift_*` tables belong to the
// other wedding (../bym) and must never be read or written from this app.
export const TABLES = {
  categories: "nyn_gift_categories",
  items: "nyn_gift_items",
  reservations: "nyn_gift_reservations",
  itemsAvailability: "nyn_gift_items_availability",
  customReservations: "nyn_gift_custom_reservations_public",
} as const;

export interface GiftCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

// Shape of the `nyn_gift_items_availability` view. `reserved_phone` is
// readable by anyone who loads the site — see the note above the view in
// supabase/schema.sql. It exists so /lista-regalos can offer a WhatsApp
// thank-you link; the reservation wizard never reads it.
export interface GiftItem {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_reserved: boolean;
  reserved_by: string | null;
  reserved_phone: string | null;
  reservation_id: string | null;
}

export interface CustomReservation {
  id: string;
  custom_item_name: string;
  guest_name: string;
  guest_phone: string | null;
  created_at: string;
}

// Postgres unique_violation. Raised by nyn_gift_reservations_item_unique when
// two guests claim the same gift at the same moment — the whole point of
// enforcing single-claim in the database instead of in the UI.
export const UNIQUE_VIOLATION = "23505";
