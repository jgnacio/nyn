import Button from "../components/Button";
import InfiniteGallery from "../components/InfiniteGallery";
import { GALLERY_IMAGES } from "../components/GallerySection";

export const metadata = {
  title: "Galería",
};

// Fullscreen version of the full photo set, reached via the "Ver fotos"
// button in GallerySection. Pan/drag + wheel-to-zoom, infinitely tiling.
export default function GaleriaPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background">
      <InfiniteGallery
        images={GALLERY_IMAGES}
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
