import Image from "next/image";
import Button from "./Button";
import { GOLD, TEXT_SECONDARY } from "./ClosingInvitation";

// Shared Google Photos album the guests upload into. The QR image in
// `public/images/` encodes this exact URL, so the two must be changed
// together — a QR pointing somewhere the button doesn't is worse than no QR.
const ALBUM_URL = "https://photos.app.goo.gl/pB3jaJX2hYYFdAFn6";

// Inline SVGs rather than emoji: emoji render as a different glyph on every
// platform (and often in full color), which would fight the button's single
// accent color. These inherit `currentColor`, so they follow the label
// through Button's hover color swap.
function PhotoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.1em] w-[1.1em] shrink-0"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M3.5 17l4.8-4.8a2 2 0 0 1 2.8 0l6.4 6.4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[0.95em] w-[0.95em] shrink-0"
    >
      <path d="M12 20.7l-1.4-1.3C5.5 14.8 2.5 12 2.5 8.6A4.6 4.6 0 0 1 7.1 4c1.7 0 3.3.8 4.3 2.1L12 6.7l.6-.6A5.3 5.3 0 0 1 16.9 4a4.6 4.6 0 0 1 4.6 4.6c0 3.4-3 6.2-8.1 10.8L12 20.7z" />
    </svg>
  );
}

// Sits directly after GallerySection in the page flow (see page.tsx): the
// gallery shows what's already been captured, this invites guests to add to
// it. The background is a gradient (.upload-photos-bg in globals.css) that
// starts on GallerySection's own CREAM_ALT and eases into CREAM, so the two
// adjacent sections blend instead of meeting at a hard horizontal line.
export default function UploadPhotos() {
  return (
    <section className="section-fade-to-cloud relative w-full py-20 sm:py-28 overflow-hidden text-center">
      {/* .section-shell (globals.css) — shared desktop measure/gutter across
          every section below the 3D experience. */}
      <div className="section-shell">
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Compartí tus fotos
        </p>

        <div className="mt-10 flex flex-col items-center gap-6">
          {/* The QR already carries its own soft blob-shaped backdrop baked
            into the artwork, so it needs no frame or border here. `priority`
            is deliberately NOT set — this sits well below the fold. */}
          <Image
            src="/images/qr-subir-fotos.webp"
            alt={`Código QR para subir fotos al álbum compartido: ${ALBUM_URL}`}
            width={828}
            height={766}
            sizes="(max-width: 640px) 70vw, 320px"
            className="h-auto w-[min(70vw,320px)]"
          />

          <p
            className="font-[family-name:var(--font-cormorant)] italic tracking-wide"
            style={{
              color: TEXT_SECONDARY,
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
            }}
          >
            Escaneá el QR o tocá el botón para subir tus fotos
          </p>

          <Button
            href={ALBUM_URL}
            variant="outline"
            size="md"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Button wraps its children in a plain <span> (its own flex box is
              on the outer element), so the icons need their own flex context
              here or they baseline-align against the text instead of
              centering on it. */}
            <span className="inline-flex items-center gap-2">
              <PhotoIcon />
              Subir fotos
              <HeartIcon />
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
