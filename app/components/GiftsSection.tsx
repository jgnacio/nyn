import Button from "./Button";
import GiftIcon from "./gifts/GiftIcon";
import { GOLD, TEXT_SECONDARY } from "./ClosingInvitation";

// Entry point to /regalos, sitting after UploadPhotos in the page flow. Same
// gradient trick as .upload-photos-bg: it opens on the Cloud Dancer that
// UploadPhotos ends on and eases into Lino, so consecutive sections keep
// alternating tone without ever meeting at a hard horizontal line.
export default function GiftsSection() {
  return (
    <section className="section-fade-to-lino relative w-full overflow-hidden py-20 text-center sm:py-28">
      {/* .section-shell (globals.css) — shared desktop measure/gutter across
          every section below the 3D experience. */}
      <div className="section-shell">
        <span className="inline-flex" style={{ color: GOLD }}>
          <GiftIcon name="gift" className="h-10 w-10" />
        </span>

        <p
          className="mt-3 font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
        >
          Regalos
        </p>
        <p
          className="mx-auto mt-2 max-w-lg font-[family-name:var(--font-cormorant)] italic tracking-wide"
          style={{
            color: TEXT_SECONDARY,
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
          }}
        >
          Lo más importante para nosotros es que puedan estar presentes este día
          tan importante. Cualquier detalle de su parte será bienvenido con
          mucha gratitud.
        </p>

        <div className="mt-10 flex flex-col items-center">
          <Button href="/regalos" variant="outline" size="lg">
            Ver nuestra lista de regalos
          </Button>
        </div>
      </div>
    </section>
  );
}
