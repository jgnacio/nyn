import type { CSSProperties } from "react";

export const GOLD = "#b08d57"; // Bronce viejo
export const BLUE = "#1b3a5c"; // Marino vintage
export const CREAM = "#f1f0ec"; // Cloud Dancer
export const CREAM_ALT = "#e4dfd4"; // Lino envejecido
export const TEXT = "#3a3733"; // Grafito cálido
export const TEXT_SECONDARY = "#6b6659"; // Gris topo
export const BLUE_SOFT = "#8fa5ae"; // Azul polvoriento
export const BROWN_LIGHT = "#c9b79c"; // Camel apagado

function Flourish({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 12H96" stroke={GOLD} strokeWidth="0.75" />
      <path d="M144 12H240" stroke={GOLD} strokeWidth="0.75" />
      <path
        d="M108 12L120 4L132 12L120 20Z"
        stroke={GOLD}
        strokeWidth="0.9"
      />
      <circle cx="120" cy="12" r="1.6" fill={GOLD} stroke="none" />
      <circle cx="100" cy="12" r="1.1" fill={GOLD} stroke="none" />
      <circle cx="140" cy="12" r="1.1" fill={GOLD} stroke="none" />
    </svg>
  );
}

export function CornerSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 8C34 20 46 40 52 66C58 92 70 112 96 128"
        stroke={BLUE}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M20 14C34 26 40 42 44 58"
        stroke={BLUE}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <g stroke={GOLD} strokeWidth="1.1" strokeLinecap="round">
        <circle cx="52" cy="66" r="5.5" fill="none" />
        <circle cx="52" cy="66" r="1.4" fill={GOLD} stroke="none" />
        <path d="M52 60.5C50 56 50 52 52 48" />
        <path d="M57.5 66C62 64 65 61 66.5 57" />
        <path d="M52 71.5C50 76 50 80 52 84" />
      </g>
      <g stroke={BLUE} strokeWidth="1" strokeLinecap="round">
        <circle cx="30" cy="30" r="3.2" />
        <path d="M30 27C29 24 29 22 30 20" />
      </g>
      <g stroke={GOLD} strokeWidth="1" strokeLinecap="round">
        <circle cx="78" cy="100" r="4" />
        <path d="M78 96.4C77 92.8 78 90 80 87.5" />
        <path d="M81.6 100C85 99 87.5 97 89 94" />
      </g>
      <path
        d="M14 10C10 16 8 24 10 32"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

// A plain, static HTML section — no canvas, no CSS3D, no scroll-driven
// animation. This used to be mounted inside SpiralGallery's CSS3DObject: a
// fixed-pixel DOM box positioned in 3D space that expanded to cover the
// viewport at the end of the spiral. That coupling made the card's box depend
// on the 3D camera rather than on the document, which fought the page layout
// (and forced the whole closing dwell/expand machinery in SpiralGallery), so
// it now sits in the normal document flow right after the canvas — see
// page.tsx.
//
// It opens on Lino (--background-alt), the exact color the canvas above
// releases on, and the invitation itself is a Cloud Dancer card floating on
// it — so the canvas→HTML handoff is a continuous surface, no seam.
// Sizes are viewport-relative (`vw` clamps) like every other section below the
// 3D experience, not the container-query units the fixed-pixel 3D card needed.
export default function ClosingInvitation() {
  return (
    <section
      className="relative w-full overflow-hidden py-16 sm:py-24"
      style={{ backgroundColor: CREAM_ALT }}
    >
      <div className="section-shell">
        <div
          className="relative mx-auto max-w-3xl px-[13%] py-[16%] sm:px-[11%] sm:py-[11%]"
          style={{ backgroundColor: CREAM }}
        >
          {/* Sized off the card's WIDTH and kept narrower than its horizontal
              padding, so the sprigs stay in the corners instead of sweeping
              into the text. In the 3D card they were a percentage of a fixed,
              near-square box; this section is tall and text-driven, so the
              same 18% reached well past the measure. */}
          <CornerSprig className="pointer-events-none absolute top-0 left-0 w-[9%] max-w-[72px] h-auto" />
          <CornerSprig className="pointer-events-none absolute top-0 right-0 w-[9%] max-w-[72px] h-auto -scale-x-100" />
          <CornerSprig className="pointer-events-none absolute bottom-0 left-0 w-[9%] max-w-[72px] h-auto -scale-y-100" />
          <CornerSprig className="pointer-events-none absolute bottom-0 right-0 w-[9%] max-w-[72px] h-auto -scale-x-100 -scale-y-100" />

          <div
            className="pointer-events-none absolute inset-[6%] border"
            style={{ borderColor: `${GOLD}55`, borderWidth: "1.5px" }}
          />
          <div
            className="pointer-events-none absolute inset-[7.4%] border"
            style={{ borderColor: `${GOLD}33`, borderWidth: "0.75px" }}
          />

          <div className="relative text-center">
            <p
              className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
              style={{
                color: TEXT,
                fontSize: "clamp(1.1rem, 2.4vw, 1.6rem)",
                lineHeight: 1.5,
              }}
            >
              Con mucha alegría y con un corazón agradecido a Dios por todo lo
              que hemos vivido, queremos compartir contigo uno de los momentos
              más importantes de nuestras vidas.
              <br />
              <br />
              Él nos permitió crecer como amigos, caminar juntos como novios y
              hoy nos regala la bendición de comenzar una nueva etapa.
              <br />
              <br />
              Tu presencia hará que este día sea aún más especial, y nos
              llenaría de felicidad que nos acompañes a celebrar el amor que
              Dios ha escrito para nosotros.
            </p>

            <Flourish
              className="mx-auto mt-8"
              style={{ width: "min(60%, 220px)", height: "auto" }}
            />

            <p
              className="font-[family-name:var(--font-parisienne)] mt-5"
              style={{ color: GOLD, fontSize: "clamp(2.5rem, 7vw, 4.5rem)" }}
            >
              ¡Nos casamos!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
