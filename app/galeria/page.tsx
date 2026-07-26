import Button from "../components/Button";
import InfiniteGallery from "../components/InfiniteGallery";
import { GALLERY_MEDIA } from "../components/GallerySection";

export const metadata = {
  title: "Galería",
};

// Fullscreen version of the full media set — photos AND clips, unlike the
// stills-only teaser in GallerySection. Reached via the "Ver fotos" button
// there. Pan/drag + wheel-to-zoom, infinitely tiling.
//
// The root is `w-full`, not `w-screen`: `w-screen` is `100vw`, which
// overflows the document on iOS Safari — the same bug that left a pale strip
// down the right edge of the home page.
export default function GaleriaPage() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-background">
      <InfiniteGallery
        images={GALLERY_MEDIA}
        density={6}
        imageWidth={240}
        imageHeight={240}
        rounded={2}
        dragSpeed={20}
        driftAmount={6}
        friction={10}
        backgroundColor="var(--background-alt)"
      />

      <Button href="/" variant="solid" size="sm" className="fixed top-6 left-6 z-10">
        Volver
      </Button>
    </main>
  );
}
