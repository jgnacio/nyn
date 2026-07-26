import Button from "./Button";
import {
  BLUE,
  BROWN_LIGHT,
  CornerSprig,
  GOLD,
  TEXT_SECONDARY,
} from "./ClosingInvitation";

type WeddingEvent = {
  day: string;
  month: string;
  label: string;
  place: string;
  time?: string;
  mapUrl?: string;
};

const EVENTS: WeddingEvent[] = [
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
    time: "18:30 h · llegada",
    mapUrl: "https://maps.app.goo.gl/jyxzUfVradng4tqu9",
  },
];

function PinIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

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
      // No horizontal padding here: the background and the corner sprigs are
      // full-bleed, the CONTENT is boxed by .section-shell below (globals.css)
      // so every section under the 3D experience shares one desktop measure.
      className="save-the-date-bg relative w-full py-20 sm:py-28 overflow-hidden"
    >
      <CornerSprig className="pointer-events-none absolute top-0 left-0 w-[16%] max-w-[150px] h-auto -translate-x-1/4 -translate-y-1/4 opacity-60" />
      <CornerSprig className="pointer-events-none absolute bottom-0 right-0 w-[16%] max-w-[150px] h-auto translate-x-1/4 translate-y-1/4 -scale-x-100 -scale-y-100 opacity-60" />

      <div className="section-shell relative text-center">
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Guardá la fecha
        </p>
        <p
          className="font-[family-name:var(--font-cormorant)] italic tracking-wide mt-2"
          style={{
            color: TEXT_SECONDARY,
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
          }}
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
                style={{
                  color: GOLD,
                  fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
                }}
              >
                {ev.month}
              </p>

              <div
                className="mx-auto mt-1.5 mb-3 w-10 h-px"
                style={{ backgroundColor: BROWN_LIGHT, opacity: 0.5 }}
              />

              <p
                className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
                style={{
                  color: TEXT_SECONDARY,
                  fontSize: "clamp(1.1rem, 2.2vw, 1.4rem)",
                }}
              >
                {ev.label}
              </p>
              <p
                className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
                style={{
                  color: BROWN_LIGHT,
                  fontSize: "clamp(0.95rem, 1.8vw, 1.15rem)",
                }}
              >
                {ev.place}
              </p>

              {ev.time && (
                <p
                  className="mt-1.5 font-[family-name:var(--font-cormorant)] tracking-[0.08em]"
                  style={{
                    color: BLUE,
                    fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
                  }}
                >
                  {ev.time}
                </p>
              )}

              {ev.mapUrl && (
                // No extra centering wrapper needed: Button renders an
                // inline-flex element, and the ancestor `.text-center` (see
                // the outer wrapper below) centers inline-level children on
                // its own.
                <Button
                  href={ev.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  {/* Button wraps its children in a plain <span> (its own
                      flex box is on the outer element), so the icon needs its
                      own flex context here or it baseline-aligns against the
                      text instead of centering on it — same pattern as
                      UploadPhotos.tsx / RSVPSection.tsx. */}
                  <span className="inline-flex items-center gap-2">
                    <PinIcon />
                    Ver la dirección
                  </span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
