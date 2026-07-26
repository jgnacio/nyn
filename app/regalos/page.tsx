import Button from "../components/Button";
import GiftWizard from "../components/gifts/GiftWizard";
import { GOLD, TEXT, TEXT_SECONDARY } from "../components/ClosingInvitation";

export const metadata = {
  title: "Lista de regalos",
};

export default function RegalosPage() {
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
          Lista de regalos
        </h1>
        <p
          className="mx-auto mt-3 mb-10 max-w-md text-center font-[family-name:var(--font-cormorant)] italic tracking-wide"
          style={{ color: TEXT_SECONDARY, fontSize: "clamp(1rem, 2vw, 1.2rem)" }}
        >
          Elegí algo con lo que quieras acompañarnos. Cada regalo solo puede reservarse una vez, así
          que lo que ves disponible acá está disponible de verdad.
        </p>

        <GiftWizard />

        <div
          className="mt-12 rounded-2xl border px-6 py-6 text-center font-[family-name:var(--font-cormorant)]"
          style={{ borderColor: `${GOLD}55`, backgroundColor: "var(--background-alt)" }}
        >
          <p className="italic text-[1.15rem]" style={{ color: GOLD }}>
            Transferencia bancaria
          </p>
          <p className="mx-auto mt-4 max-w-sm italic" style={{ color: TEXT_SECONDARY }}>
            Transferencias dentro de Santander
            <br />
            Cuenta:{" "}
            <span className="not-italic font-bold text-[1.3rem] tracking-wide" style={{ color: TEXT }}>
              1204336705
            </span>
            <br />
            Moneda: UYU
            <br />
            Sucursal: 74 - Paso Molino
          </p>
          <p className="mx-auto mt-5 max-w-sm italic" style={{ color: TEXT_SECONDARY }}>
            Transferencias desde otros bancos
            <br />
            Cuenta:{" "}
            <span className="not-italic font-bold text-[1.3rem] tracking-wide" style={{ color: TEXT }}>
              0074001204336705
            </span>
            <br />
            Moneda: UYU
          </p>
        </div>
      </div>
    </main>
  );
}
