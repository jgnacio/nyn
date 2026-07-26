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

// Sized entirely by its PARENT container (w-full h-full) rather than the
// viewport (no min-h-screen): this same component is mounted, unchanged,
// inside SpiralGallery's CSS3DObject card — a fixed-pixel DOM box positioned
// in 3D space alongside the photos — so it must fill whatever box it's
// dropped into instead of assuming it owns the whole page.
// `containerType: inline-size` turns this element into a container-query
// context, so the `cqw`/`cqh` units below are measured against ITS OWN
// rendered box (the fixed-pixel cardEl set up in SpiralGallery), not the
// real browser viewport. That matters because the card's intrinsic pixel
// density (SpiralGallery's CSS3D_PX_PER_UNIT) can change independently of
// how big the card ends up looking on screen — `vw` doesn't know about that
// and drifts out of proportion whenever the density knob is retuned, while
// `cqw` stays correct by construction since it scales with the same box.
// `portrait` only reshapes the frame's padding/measure for the tall mobile
// card — the TEXT SIZES stay identical to the (approved) landscape values in
// both orientations, deliberately not scaled up for portrait.
export default function ClosingInvitation({
  portrait = false,
}: {
  portrait?: boolean;
}) {
  const textMaxWidth = portrait ? "84%" : "62%";
  const framePadding = portrait ? "px-[9%] py-[12%]" : "px-[6%] py-[8%]";

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${framePadding}`}
      // `--closing-bg` is driven per-frame by SpiralGallery during the closing
      // dwell (landscape only) so this card rides the SAME Cloud Dancer -> Lino
      // handoff the canvas behind it performs. With a fixed CREAM here the card
      // stayed Cloud Dancer while the canvas faded to Lino underneath it —
      // and since the expanded card COVERS the canvas, the fade was invisible
      // and the join to SaveTheDate read as a hard horizontal line.
      // The fallback keeps this correct on its own in portrait, where
      // SpiralGallery leaves the property unset on purpose.
      style={{
        backgroundColor: `var(--closing-bg, ${CREAM})`,
        containerType: "inline-size",
      }}
    >
      <CornerSprig className="pointer-events-none absolute top-0 left-0 w-[18%] h-[18%]" />
      <CornerSprig className="pointer-events-none absolute top-0 right-0 w-[18%] h-[18%] -scale-x-100" />
      <CornerSprig className="pointer-events-none absolute bottom-0 left-0 w-[18%] h-[18%] -scale-y-100" />
      <CornerSprig className="pointer-events-none absolute bottom-0 right-0 w-[18%] h-[18%] -scale-x-100 -scale-y-100" />

      <div
        className="pointer-events-none absolute inset-[6%] border"
        style={{ borderColor: `${GOLD}55`, borderWidth: "1.5px" }}
      />
      <div
        className="pointer-events-none absolute inset-[7.4%] border"
        style={{ borderColor: `${GOLD}33`, borderWidth: "0.75px" }}
      />

      <div className="relative text-center" style={{ maxWidth: textMaxWidth }}>
        <p
          className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
          style={{
            color: TEXT,
            fontSize: "clamp(1.5rem, 4.4cqw, 2.9rem)",
            lineHeight: 1.35,
          }}
        >
          Con mucha alegría y con un corazón agradecido a Dios por todo lo que
          hemos vivido, queremos compartir contigo uno de los momentos más
          importantes de nuestras vidas.
          <br />
          <br />
          Él nos permitió crecer como amigos, caminar juntos como novios y hoy
          nos regala la bendición de comenzar una nueva etapa.
          <br />
          <br />
          Tu presencia hará que este día sea aún más especial, y nos llenaría
          de felicidad que nos acompañes a celebrar el amor que Dios ha
          escrito para nosotros.
        </p>

        <Flourish
          className="mx-auto mt-[7%]"
          style={{ width: "min(60cqw, 220px)", height: "auto" }}
        />

        <p
          className="font-[family-name:var(--font-parisienne)] mt-[5%]"
          style={{ color: GOLD, fontSize: "clamp(3.5rem, 10cqw, 7rem)" }}
        >
          ¡Nos casamos!
        </p>
      </div>
    </div>
  );
}
