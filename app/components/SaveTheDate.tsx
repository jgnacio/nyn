import { BLUE, BROWN_LIGHT, CornerSprig, GOLD, TEXT_SECONDARY } from "./ClosingInvitation";

const EVENTS = [
  {
    day: "23",
    month: "de Octubre",
    label: "Registro Civil",
    place: "Montevideo",
  },
  {
    day: "24",
    month: "de Octubre",
    label: "Ceremonia",
    place: "Portofino",
  },
];

// Plain DOM section — no canvas, no scroll-driven camera. Sits right after
// the spiral+closing-card experience in the normal document flow (see
// page.tsx), so it just scrolls in like any regular section.
export default function SaveTheDate() {
  return (
    <section
      // Background lives in .save-the-date-bg (globals.css) because the
      // canvas→HTML handoff color differs by ORIENTATION and inline styles
      // can't hold a media query: portrait receives Cloud Dancer with a
      // gradient down to Lino; landscape starts on solid Lino because the
      // canvas itself already faded to Lino across the closing dwell. See the
      // dwellState crossfade in SpiralGallery.tsx.
      className="save-the-date-bg relative w-full px-[6%] py-20 sm:py-28 overflow-hidden"
    >

      <CornerSprig className="pointer-events-none absolute top-0 left-0 w-[16%] max-w-[150px] h-auto -translate-x-1/4 -translate-y-1/4 opacity-60" />
      <CornerSprig className="pointer-events-none absolute bottom-0 right-0 w-[16%] max-w-[150px] h-auto translate-x-1/4 translate-y-1/4 -scale-x-100 -scale-y-100 opacity-60" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Guardá la fecha
        </p>
        <p
          className="font-[family-name:var(--font-cormorant)] italic tracking-wide mt-2"
          style={{ color: TEXT_SECONDARY, fontSize: "clamp(1rem, 2vw, 1.25rem)" }}
        >
          Dos días para celebrar con nosotros
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto">
          {EVENTS.map((ev, i) => (
            <div
              key={ev.day}
              className={
                i === 1
                  ? "pt-10 sm:pt-0 sm:pl-12 border-t sm:border-t-0 sm:border-l border-dashed"
                  : "pb-10 sm:pb-0 sm:pr-12"
              }
              style={i === 1 ? { borderColor: BLUE } : undefined}
            >
              <p
                className="font-[family-name:var(--font-cormorant)] leading-none"
                style={{ color: BLUE, fontSize: "clamp(3.75rem, 9vw, 6rem)" }}
              >
                {ev.day}
              </p>
              <p
                className="font-[family-name:var(--font-parisienne)] -mt-1"
                style={{ color: GOLD, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)" }}
              >
                {ev.month}
              </p>

              <div
                className="mx-auto mt-1.5 mb-3 w-10 h-px"
                style={{ backgroundColor: BROWN_LIGHT, opacity: 0.5 }}
              />

              <p
                className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
                style={{ color: TEXT_SECONDARY, fontSize: "clamp(1.1rem, 2.2vw, 1.4rem)" }}
              >
                {ev.label}
              </p>
              <p
                className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
                style={{ color: BROWN_LIGHT, fontSize: "clamp(0.95rem, 1.8vw, 1.15rem)" }}
              >
                {ev.place}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
