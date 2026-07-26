import Countdown from "./components/Countdown";
import Footer from "./components/Footer";
import GallerySection from "./components/GallerySection";
import GiftsSection from "./components/GiftsSection";
import RSVPSection from "./components/RSVPSection";
import SaveTheDate from "./components/SaveTheDate";
import SpiralGallery from "./components/SpiralGallery";
import SplashScreen from "./components/SplashScreen";
import UploadPhotos from "./components/UploadPhotos";

export default function Home() {
  return (
    <main className="bg-background">
      {/* Fixed overlay that removes itself once the wordmark has drawn. First
          in the tree so it paints before anything else settles; it is NOT a
          wrapper, so it cannot become a scroll container and break the
          canvas's sticky positioning below. */}
      <SplashScreen />
      <SpiralGallery />
      <SaveTheDate />
      <GallerySection />
      <UploadPhotos />
      <GiftsSection />
      <RSVPSection />
      <Countdown />
      <Footer />
    </main>
  );
}
