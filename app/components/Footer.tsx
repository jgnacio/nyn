import Image from "next/image";
import { CREAM } from "./ClosingInvitation";

// Closes the page on the same photo SpiralGallery opens it with (index 0 of
// MEDIA_FILES, DSC_4522.webp) — the invitation starts and ends on the same
// image, on purpose, like a photo album closing its cover.
const HERO_PHOTO = "/images/DSC_4522.webp";

// Full-bleed photo section, last thing on the page.
export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden">
      {/* Fades in from the section above's Lino, so the photo doesn't start
          on a hard edge — same soft-handoff idea as the gradients chained
          through the rest of the page (see .upload-photos-bg etc. in
          globals.css), just done here as an overlay instead of a background
          gradient, since the layer below is a photo, not a solid color. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 sm:h-32"
        style={{
          background:
            "linear-gradient(to bottom, var(--background-alt), transparent)",
        }}
      />

      <div className="relative aspect-[3/4] w-full sm:aspect-[16/10] md:aspect-[16/9]">
        <Image
          src={HERO_PHOTO}
          alt="Ignacio y Nicol"
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "50% 30%" }}
        />

        {/* Bottom-weighted scrim: darkens where the names sit without
            flattening the whole photo, so the picture itself stays the
            focal point. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(20,17,14,0.72) 0%, rgba(20,17,14,0.32) 32%, rgba(20,17,14,0) 60%)",
          }}
        />

        {/* .section-shell (globals.css) supplies the gutter/measure; the
            absolute box still spans the full image so the block stays
            bottom-centered over it. */}
        <div className="section-shell absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-10 text-center sm:pb-14">
          <p
            className="font-[family-name:var(--font-parisienne)] leading-none"
            style={{ color: CREAM, fontSize: "clamp(3.5rem, 14vw, 8rem)" }}
          >
            Ignacio &amp; Nicol
          </p>
          <p
            className="font-[family-name:var(--font-cormorant)] italic tracking-[0.15em]"
            style={{
              color: `${CREAM}cc`,
              fontSize: "clamp(0.85rem, 1.6vw, 1.05rem)",
            }}
          >
            24 · 10 · 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
