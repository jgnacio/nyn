"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "../Button";
import GiftIcon from "./GiftIcon";
import {
  getSupabase,
  TABLES,
  UNIQUE_VIOLATION,
  type GiftCategory,
  type GiftItem,
} from "../../lib/supabase";
import { BLUE, BROWN_LIGHT, CREAM, GOLD, TEXT, TEXT_SECONDARY } from "../ClosingInvitation";

type Step = "categories" | "items" | "custom" | "guest" | "done";
type Selection = { kind: "item"; item: GiftItem } | { kind: "custom"; name: string };

const CARD_CLASS =
  "rounded-2xl border transition-colors duration-300 font-[family-name:var(--font-cormorant)]";

const INPUT_CLASS =
  "w-full rounded-xl border px-4 py-3 font-[family-name:var(--font-cormorant)] text-[1.05rem] outline-none transition-colors duration-300 focus:border-[color:var(--accent)]";

function BackLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 font-[family-name:var(--font-cormorant)] italic text-[1rem] transition-opacity duration-300 hover:opacity-70"
      style={{ color: TEXT_SECONDARY }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M13 8H3M7 4L3 8l4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </button>
  );
}

function Spinner() {
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

export default function GiftWizard() {
  const [step, setStep] = useState<Step>("categories");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [category, setCategory] = useState<GiftCategory | null>(null);
  const [items, setItems] = useState<GiftItem[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [customName, setCustomName] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getSupabase()
        .from(TABLES.categories)
        .select("*")
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        setLoadError("No pudimos cargar la lista de regalos. Probá de nuevo en un rato.");
      } else {
        setCategories(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Always re-fetched on entering the item step (never cached from a previous
  // visit): availability is the whole point of this screen, and a stale list
  // sends a guest down the path of claiming something already taken.
  const loadItems = useCallback(async (cat: GiftCategory) => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await getSupabase()
      .from(TABLES.itemsAvailability)
      .select("*")
      .eq("category_id", cat.id)
      .order("sort_order", { ascending: true });
    if (error) {
      setLoadError("No pudimos cargar los regalos de esta categoría.");
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  async function pickCategory(cat: GiftCategory) {
    setCategory(cat);
    setStep("items");
    await loadItems(cat);
  }

  async function submit() {
    // Reaching this step without a selection is not possible through the UI,
    // but narrowing here is what lets the payload below be a single concrete
    // type instead of a union — which `insert()` rejects.
    if (!selection) return;
    if (!guestName.trim()) {
      setError("Contanos tu nombre para poder agradecerte.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Matches nyn_gift_reservations_target_check in supabase/schema.sql:
    // exactly one of item_id / custom_item_name is ever set.
    const payload: {
      item_id: string | null;
      custom_item_name: string | null;
      guest_name: string;
      guest_phone: string | null;
    } = {
      item_id: selection.kind === "item" ? selection.item.id : null,
      custom_item_name: selection.kind === "custom" ? selection.name : null,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim() || null,
    };

    // try/catch/finally, not a bare await: `getSupabase()` throws when the env
    // vars are missing, and the fetch itself throws on a network failure or a
    // blocked request. Neither comes back as `{ error }`. Without this the
    // exception escaped, `setSubmitting(false)` never ran, and the button sat
    // on "Guardando..." forever with no message — which reads as "the reserve
    // button does nothing".
    let error: { code?: string; message?: string } | null = null;
    try {
      const res = await getSupabase().from(TABLES.reservations).insert(payload);
      error = res.error;
    } catch (thrown) {
      error = {
        message: thrown instanceof Error ? thrown.message : String(thrown),
      };
    } finally {
      setSubmitting(false);
    }

    if (error) {
      // Always surfaced: a silent failure here costs a real gift reservation,
      // so the actual cause needs to be reachable from the browser console.
      console.error("[regalos] falló la reserva:", error);
      // The unique index did its job: someone claimed this gift between the
      // moment this guest saw it as available and the moment they confirmed.
      // Send them back to a FRESHLY loaded list rather than showing a generic
      // failure over a list that is now known to be wrong.
      if (error.code === UNIQUE_VIOLATION) {
        setError(null);
        setSelection(null);
        if (category) {
          setStep("items");
          await loadItems(category);
          setLoadError("Uy, justo alguien más reservó ese regalo. Elegí otro de la lista.");
        } else {
          setStep("categories");
        }
        return;
      }
      // The technical detail rides along with the friendly line. Guests do not
      // read it, but it is the difference between "no anda" and a report you
      // can act on when someone sends a screenshot.
      setError(
        `Algo falló al guardar tu reserva. Probá de nuevo.${
          error.message ? ` (${error.message})` : ""
        }`
      );
      return;
    }

    setStep("done");
  }

  if (loadError && step === "categories" && !categories.length) {
    return (
      <p
        className="py-16 text-center font-[family-name:var(--font-cormorant)] italic"
        style={{ color: TEXT_SECONDARY }}
      >
        {loadError}
      </p>
    );
  }

  if (loading && step === "categories") return <Spinner />;

  if (step === "done") {
    const label = selection?.kind === "item" ? selection.item.name : selection?.name ?? "";
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mb-4 h-12 w-12"
          style={{ color: GOLD }}
          aria-hidden
        >
          <path d="M12 20.7l-1.4-1.3C5.5 14.8 2.5 12 2.5 8.6A4.6 4.6 0 0 1 7.1 4c1.7 0 3.3.8 4.3 2.1L12 6.7l.6-.6A5.3 5.3 0 0 1 16.9 4a4.6 4.6 0 0 1 4.6 4.6c0 3.4-3 6.2-8.1 10.8L12 20.7z" />
        </svg>
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2rem, 5vw, 2.75rem)" }}
        >
          ¡Gracias!
        </p>
        <p
          className="mt-3 max-w-sm font-[family-name:var(--font-cormorant)] italic text-[1.1rem]"
          style={{ color: TEXT_SECONDARY }}
        >
          Quedó reservado <span style={{ color: TEXT }}>{label}</span>. Significa muchísimo para
          nosotros, de verdad.
        </p>
        <Button href="/" variant="outline" size="md" className="mt-8">
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (step === "categories") {
    return (
      <>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => pickCategory(cat)}
              className={`${CARD_CLASS} flex flex-col items-center gap-2.5 p-6 hover:bg-[color:var(--accent)]/5`}
              style={{ borderColor: `${GOLD}55`, color: GOLD, backgroundColor: CREAM }}
            >
              <GiftIcon name={cat.icon} />
              <span className="italic text-[1.05rem]" style={{ color: TEXT }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStep("custom")}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed px-6 py-3.5 font-[family-name:var(--font-cormorant)] italic text-[1.05rem] transition-colors duration-300 hover:bg-[color:var(--accent)]/5"
          style={{ borderColor: `${GOLD}88`, color: TEXT_SECONDARY }}
        >
          No encuentro lo que busco, quiero regalar otra cosa
        </button>
      </>
    );
  }

  if (step === "items") {
    if (loading) return <Spinner />;
    return (
      <>
        <BackLink onClick={() => setStep("categories")}>Cambiar categoría</BackLink>
        <p
          className="mb-5 font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(1.6rem, 4vw, 2.25rem)" }}
        >
          {category?.name}
        </p>
        {loadError && (
          <p
            className="mb-4 font-[family-name:var(--font-cormorant)] italic text-[1rem]"
            style={{ color: BLUE }}
          >
            {loadError}
          </p>
        )}
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.is_reserved}
              onClick={() => {
                setSelection({ kind: "item", item });
                setStep("guest");
              }}
              className={`${CARD_CLASS} flex items-center justify-between gap-3 px-5 py-4 text-left ${
                item.is_reserved
                  ? "cursor-not-allowed"
                  : "hover:bg-[color:var(--accent)]/5 hover:border-[color:var(--accent)]"
              }`}
              style={{
                borderColor: item.is_reserved ? `${BROWN_LIGHT}66` : `${GOLD}55`,
                backgroundColor: item.is_reserved ? "transparent" : CREAM,
                color: item.is_reserved ? BROWN_LIGHT : TEXT,
              }}
            >
              <span className="italic text-[1.05rem]">{item.name}</span>
              {item.is_reserved && (
                <span
                  className="shrink-0 text-[0.8rem] uppercase tracking-wide"
                  style={{ color: BROWN_LIGHT }}
                >
                  Reservado por {item.reserved_by ?? "alguien"}
                </span>
              )}
            </button>
          ))}
        </div>
      </>
    );
  }

  if (step === "custom") {
    return (
      <>
        <BackLink onClick={() => setStep("categories")}>Volver</BackLink>
        <p
          className="mb-5 font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(1.6rem, 4vw, 2.25rem)" }}
        >
          Contanos qué querés regalarnos
        </p>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Ej: Set de toallas"
          className={`${INPUT_CLASS} mb-5`}
          style={{ borderColor: `${GOLD}55`, backgroundColor: CREAM, color: TEXT }}
        />
        <Button
          variant="outline"
          size="md"
          className="w-full"
          onClick={() => {
            if (!customName.trim()) return;
            setSelection({ kind: "custom", name: customName.trim() });
            setStep("guest");
          }}
        >
          Continuar
        </Button>
      </>
    );
  }

  const label = selection?.kind === "item" ? selection.item.name : selection?.name ?? "";
  return (
    <>
      <BackLink
        onClick={() => {
          setError(null);
          if (selection?.kind === "item" && category) {
            setStep("items");
            void loadItems(category);
          } else {
            setStep("custom");
          }
        }}
      >
        Elegir otro regalo
      </BackLink>

      <div
        className={`${CARD_CLASS} mb-7 px-5 py-4`}
        style={{ borderColor: `${GOLD}55`, backgroundColor: CREAM }}
      >
        <span className="text-[0.78rem] uppercase tracking-[0.15em]" style={{ color: GOLD }}>
          Vas a regalar
        </span>
        <p className="mt-1 italic text-[1.15rem]" style={{ color: TEXT }}>
          {label}
        </p>
      </div>

      <label
        className="mb-1.5 block font-[family-name:var(--font-cormorant)] italic text-[1rem]"
        style={{ color: TEXT_SECONDARY }}
      >
        Tu nombre *
      </label>
      <input
        type="text"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Nombre y apellido"
        className={`${INPUT_CLASS} mb-5`}
        style={{ borderColor: `${GOLD}55`, backgroundColor: CREAM, color: TEXT }}
      />

      <label
        className="mb-1.5 block font-[family-name:var(--font-cormorant)] italic text-[1rem]"
        style={{ color: TEXT_SECONDARY }}
      >
        WhatsApp (opcional)
      </label>
      <input
        type="tel"
        value={guestPhone}
        onChange={(e) => setGuestPhone(e.target.value)}
        placeholder="099 123 456"
        className={INPUT_CLASS}
        style={{ borderColor: `${GOLD}55`, backgroundColor: CREAM, color: TEXT }}
      />

      {error && (
        <p
          className="mt-3 font-[family-name:var(--font-cormorant)] italic text-[1rem]"
          style={{ color: BLUE }}
        >
          {error}
        </p>
      )}

      <Button
        variant="solid"
        size="md"
        className="mt-7 w-full"
        disabled={submitting}
        onClick={submit}
      >
        {submitting ? "Guardando..." : "Confirmar regalo"}
      </Button>
    </>
  );
}
