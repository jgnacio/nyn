"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "../Button";
import {
  getSupabase,
  TABLES,
  type CustomReservation,
  type GiftCategory,
  type GiftItem,
} from "../../lib/supabase";
import { BLUE, BROWN_LIGHT, CREAM, GOLD, TEXT, TEXT_SECONDARY } from "../ClosingInvitation";

// Status board for the owners: which gifts are taken, by whom, with a
// WhatsApp thank-you link and the option to undo a reservation.
//
// SECURITY: the delete runs with the anon key, which is public by
// construction — it ships in the browser bundle. Any visitor who opens
// /lista-regalos can delete any reservation, and the phone numbers shown here
// are readable by anyone too. This mirrors the sibling ../bym project and was
// asked for explicitly. Making it genuinely owners-only means Supabase Auth
// plus scoping the policies in supabase/schema.sql `to authenticated`.
type Detail = {
  reservationId: string;
  guestName: string;
  phone: string | null;
  giftName: string;
};

// Uruguayan mobiles are written locally as 09X XXX XXX; wa.me wants the country
// code and no leading zero. Strip non-digits first so a number typed with
// spaces, dots or dashes still produces a valid link.
function whatsAppLink(phone: string, giftName: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const message = `¡Hola! Vimos que nos regalaste ${giftName}, ¡muchísimas gracias!`;
  return `https://wa.me/598${digits}?text=${encodeURIComponent(message)}`;
}

export default function GiftOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [custom, setCustom] = useState<CustomReservation[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const [cats, its, cust] = await Promise.all([
        sb.from(TABLES.categories).select("*").order("sort_order", { ascending: true }),
        sb.from(TABLES.itemsAvailability).select("*").order("sort_order", { ascending: true }),
        sb.from(TABLES.customReservations).select("*").order("created_at", { ascending: false }),
      ]);
      if (cats.error || its.error || cust.error) {
        throw cats.error ?? its.error ?? cust.error;
      }
      setCategories(cats.data ?? []);
      setItems(its.data ?? []);
      setCustom(cust.data ?? []);
    } catch (thrown) {
      console.error("[regalos] falló la carga del estado:", thrown);
      setError(thrown instanceof Error ? thrown.message : "No pudimos cargar el estado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    if (!detail) return;
    setDeleting(true);
    try {
      const { error } = await getSupabase()
        .from(TABLES.reservations)
        .delete()
        .eq("id", detail.reservationId);
      if (error) throw error;
      setDetail(null);
      // Refetch instead of splicing local state: deleting an item reservation
      // flips that item back to "Disponible" through a view we do not
      // recompute here, so the server's answer is the only reliable one.
      await load();
    } catch (thrown) {
      console.error("[regalos] falló al eliminar la reserva:", thrown);
      window.alert(`No se pudo eliminar. ${thrown instanceof Error ? thrown.message : ""}`.trim());
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent"
          style={{ color: GOLD }}
          role="status"
          aria-label="Cargando"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p
          className="font-[family-name:var(--font-cormorant)] italic"
          style={{ color: TEXT_SECONDARY }}
        >
          No pudimos cargar el estado de la lista.
        </p>
        <p className="mt-2 text-[0.85rem]" style={{ color: BROWN_LIGHT }}>
          {error}
        </p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const reservedCount = items.filter((i) => i.is_reserved).length + custom.length;
  const totalCount = items.length + custom.length;

  const row = (
    key: string,
    name: string,
    reservation: { id: string; guestName: string; phone: string | null } | null
  ) => (
    <li
      key={key}
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: CREAM }}
    >
      <span
        className="font-[family-name:var(--font-cormorant)] italic text-[1.05rem]"
        style={{ color: TEXT }}
      >
        {name}
      </span>
      {reservation ? (
        <button
          type="button"
          onClick={() =>
            setDetail({
              reservationId: reservation.id,
              guestName: reservation.guestName,
              phone: reservation.phone,
              giftName: name,
            })
          }
          className="shrink-0 font-[family-name:var(--font-cormorant)] text-[0.95rem] underline-offset-4 transition-opacity duration-300 hover:underline hover:opacity-80"
          style={{ color: GOLD }}
        >
          {reservation.guestName}
        </button>
      ) : (
        <span
          className="shrink-0 font-[family-name:var(--font-cormorant)] text-[0.95rem]"
          style={{ color: BROWN_LIGHT }}
        >
          Disponible
        </span>
      )}
    </li>
  );

  const groups = categories
    .map((cat) => ({ cat, list: items.filter((i) => i.category_id === cat.id) }))
    .filter((g) => g.list.length > 0);

  return (
    <>
      <p
        className="mb-8 font-[family-name:var(--font-cormorant)] italic text-[1.05rem]"
        style={{ color: TEXT_SECONDARY }}
      >
        {reservedCount} de {totalCount} regalos reservados · tocá un nombre para ver los detalles
      </p>

      {groups.map(({ cat, list }) => (
        <div key={cat.id} className="mb-7">
          <h3 className="mb-2.5 text-[0.78rem] uppercase tracking-[0.15em]" style={{ color: GOLD }}>
            {cat.name}
          </h3>
          <ul className="flex flex-col gap-2">
            {list.map((i) =>
              row(
                i.id,
                i.name,
                i.is_reserved && i.reservation_id
                  ? {
                      id: i.reservation_id,
                      guestName: i.reserved_by ?? "Reservado",
                      phone: i.reserved_phone,
                    }
                  : null
              )
            )}
          </ul>
        </div>
      ))}

      {custom.length > 0 && (
        <div className="mb-7">
          <h3 className="mb-2.5 text-[0.78rem] uppercase tracking-[0.15em]" style={{ color: GOLD }}>
            Otros regalos
          </h3>
          <ul className="flex flex-col gap-2">
            {custom.map((c) =>
              row(c.id, c.custom_item_name, {
                id: c.id,
                guestName: c.guest_name,
                phone: c.guest_phone,
              })
            )}
          </ul>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          role="dialog"
          aria-modal="true"
          // Backdrop click closes, but only when the click both started and
          // ended on the backdrop — without the target check, dragging a text
          // selection inside the panel and releasing outside dismisses it.
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: CREAM }}
          >
            <span className="text-[0.72rem] uppercase tracking-[0.15em]" style={{ color: GOLD }}>
              {detail.giftName}
            </span>
            <p
              className="mt-1 font-[family-name:var(--font-parisienne)]"
              style={{ color: GOLD, fontSize: "clamp(1.5rem, 5vw, 2rem)" }}
            >
              {detail.guestName}
            </p>
            <p
              className="mt-1 mb-6 font-[family-name:var(--font-cormorant)] italic text-[1rem]"
              style={{ color: TEXT_SECONDARY }}
            >
              {detail.phone ?? "Sin teléfono"}
            </p>

            <div className="flex flex-col gap-2.5">
              {detail.phone && (
                <Button
                  href={whatsAppLink(detail.phone, detail.giftName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="solid"
                  size="sm"
                  className="w-full"
                >
                  Enviar mensaje
                </Button>
              )}
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (window.confirm(`¿Eliminar la reserva de ${detail.guestName}?`)) void remove();
                }}
                className="w-full rounded-full border px-4 py-2.5 font-[family-name:var(--font-cormorant)] italic text-[1rem] transition-colors duration-300 disabled:opacity-50"
                style={{ borderColor: BLUE, color: BLUE }}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setDetail(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
