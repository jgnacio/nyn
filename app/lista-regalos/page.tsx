import Button from "../components/Button";
import GiftOverview from "../components/gifts/GiftOverview";
import { GOLD, TEXT_SECONDARY } from "../components/ClosingInvitation";

export const metadata = {
  title: "Estado de los regalos",
};

export default function ListaRegalosPage() {
  return (
    <main className="relative min-h-screen w-full bg-background px-6 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-xl">
        <Button href="/" variant="ghost" size="sm" className="mb-8">
          Volver al inicio
        </Button>

        <h1
          className="text-center font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.25rem, 6vw, 3.5rem)" }}
        >
          Estado de los regalos
        </h1>
        <p
          className="mx-auto mt-3 mb-10 max-w-md text-center font-[family-name:var(--font-cormorant)] italic tracking-wide"
          style={{ color: TEXT_SECONDARY, fontSize: "clamp(1rem, 2vw, 1.2rem)" }}
        >
          Quién ya nos regaló qué.
        </p>

        <GiftOverview />
      </div>
    </main>
  );
}
