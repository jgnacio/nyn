import GallerySection from "./components/GallerySection";
import SaveTheDate from "./components/SaveTheDate";
import SpiralGallery from "./components/SpiralGallery";

export default function Home() {
  return (
    <main className="bg-background">
      <SpiralGallery />
      <SaveTheDate />
      <GallerySection />
    </main>
  );
}
