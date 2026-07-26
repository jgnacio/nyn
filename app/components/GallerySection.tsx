import Button from "./Button";
import { CREAM_ALT, GOLD, TEXT_SECONDARY } from "./ClosingInvitation";
import ImageGallery from "./ImageGallery";
import type { GalleryImage, GalleryMedia } from "./gallery-types";

// Stills only. The first 16 are the same photos SpiralGallery uses
// (app/components/SpiralGallery.tsx); the `g*` ones are the second batch.
// This is what the teaser below renders, since ImageGallery cannot play
// video — the clips live in GALLERY_MEDIA instead.
export const GALLERY_IMAGES: GalleryImage[] = [
  "DSC_4522.webp",
  "DSC_4550.webp",
  "DSC_4553.webp",
  "DSC_4555.webp",
  "DSC_4558.webp",
  "DSC_4559.webp",
  "DSC_4570.webp",
  "DSC_4577.webp",
  "DSC_4584.webp",
  "DSC_4586.webp",
  "DSC_4590.webp",
  "DSC_4599.webp",
  "DSC_4609.webp",
  "DSC_4613.webp",
  "DSC_4625.webp",
  "DSC_4626.webp",
  "g01.webp",
  "g02.webp",
  "g03.webp",
  "g04.webp",
  "g05.webp",
  "g06.webp",
  "g07.webp",
  "g08.webp",
  "g09.webp",
  "g11.webp",
  "g12.webp",
  "g13.webp",
  "g14.webp",
  "g15.webp",
  "g16.webp",
  "g18.webp",
  "g19.webp",
  "g20.webp",
  "g21.webp",
  "g22.webp",
  "g24.webp",
  "g25.webp",
  "g26.webp",
  "g27.webp",
  "g28.webp",
  "g29.webp",
  "g30.webp",
  "g31.webp",
  "g32.webp",
  "g33.webp",
  "g34.webp",
  "g35.webp",
  "g36.webp",
  "g37.webp",
  "g38.webp",
  "g39.webp",
  "g40.webp",
  "g41.webp",
  "g42.webp",
  "g43.webp",
  "g45.webp",
  "g46.webp",
].map((f) => ({ src: `/images/${f}` }));

// Silent, looping clips. Numbered in the same sequence as the stills above —
// they're the gaps in the `g*` run (17, 23, 44, 47, 48).
const GALLERY_VIDEOS: GalleryMedia[] = ["g17", "g23", "g44", "g47", "g48"].map(
  (f) => ({
    src: `/videos/${f}.mp4`,
    poster: `/videos/${f}.poster.webp`,
    kind: "video" as const,
  }),
);

// Stills + clips, for the full-screen /galeria page. Only InfiniteGallery
// consumes this — it is the one gallery that can render video.
export const GALLERY_MEDIA: GalleryMedia[] = [
  ...GALLERY_IMAGES,
  ...GALLERY_VIDEOS,
];

// Plain DOM section, same as SaveTheDate — sits right after it in normal
// document flow (see page.tsx). Shows a small teaser crop of the animated
// gallery with a button through to the full /galeria page (same component,
// full photo set, fullscreen).
export default function GallerySection() {
  return (
    <section
      className="relative w-full py-20 sm:py-28 overflow-hidden text-center"
      style={{ backgroundColor: CREAM_ALT }}
    >
      {/* Heading only — the gallery strip below stays full-bleed on purpose.
          .section-shell (globals.css) keeps this copy on the same desktop
          measure as every other section under the 3D experience. */}
      <div className="section-shell">
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Nuestros momentos
        </p>
        <p
          className="font-[family-name:var(--font-cormorant)] italic tracking-wide mt-2"
          style={{
            color: TEXT_SECONDARY,
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
          }}
        >
          Un vistazo antes del gran día
        </p>
      </div>

      <div
        className="relative mt-12 w-full overflow-hidden"
        style={{ height: "min(80vh, 720px)" }}
      >
        <ImageGallery
          images={GALLERY_IMAGES}
          background="#00000000"
          // Originkit's actual "Image Gallery" default is type="straight" with
          // BOTH phases set to "outToIn" — NOT "spiral". In this branch each
          // tile spawns oversized and off in its zone's outward direction,
          // shrinks + fades IN to settle at its own zone position (the
          // "outToIn" appear), holds, then shrinks further toward a vanishing
          // point in the opposite direction while fading out (the "outToIn"
          // disappear). No orbiting/rotation at all — that was the spiral
          // branch, which is a different animation entirely.
          type="straight"
          crowdDensity={3}
          crowdDelay={0}
          imageWidth={160}
          imageHeight={160}
          imageScale={5}
          rounded={12}
          blankArea={45}
          appear={{
            style: "outToIn",
            ease: { duration: 2, delay: 1.2, ease: "easeInOut" },
          }}
          disappear={{
            style: "outToIn",
            ease: { duration: 1, ease: "easeInOut" },
            fadeOut: 100,
          }}
        />

        {/* Centered, above the gallery's own tiles. ImageGallery's root div
            is `position: relative` WITHOUT its own z-index, so it doesn't
            establish a stacking context — its tiles' z-index values (bounded
            to 1..500, see the wrap in ImageGallery.tsx) are compared directly
            against this wrapper's z-index in their shared parent context. 600
            stays safely above that bound no matter how long the gallery runs.
            The opaque backdrop is passed straight into Button's own style
            (not a separate wrapper element) — see the comment on `style`
            merging in Button.tsx for why a wrapper kept fighting the
            button's hover-lift transform and its rounded pill shape. */}
        <div className="absolute inset-0 z-[600] flex items-center justify-center pointer-events-none">
          <Button
            href="/galeria"
            variant="outline"
            size="lg"
            className="pointer-events-auto shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)]"
            style={{ backgroundColor: CREAM_ALT }}
          >
            Ver fotos
          </Button>
        </div>
      </div>
    </section>
  );
}
