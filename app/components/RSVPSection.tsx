import Button from "./Button";
import {
  BROWN_LIGHT,
  GOLD,
  TEXT,
  TEXT_SECONDARY,
} from "./ClosingInvitation";

const CONTACTS = [
  { name: "Ignacio", phone: "096720423" },
  { name: "Nicol", phone: "094678611" },
];

const DRESS_CODE = "Semi formal";

// Prefilled WhatsApp message, taken from the sibling ../bym project so both
// invitations read the same way. The guest still gets to edit it before
// sending — wa.me only pre-populates the input.
function whatsAppLink({ name, phone }: { name: string; phone: string }) {
  // Local Uruguayan format is 09X XXX XXX; wa.me wants the country code and no
  // leading zero. Stripping non-digits first means a number written with
  // spaces or dashes still produces a valid link.
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const message =
    `¡Hola, ${name}!\n` +
    `Les confirmo con mucho gusto mi asistencia. Estoy muy feliz de poder ` +
    `acompañarlos en este día tan importante.\n` +
    `¡Nos vemos en la boda!`;
  return `https://wa.me/598${digits}?text=${encodeURIComponent(message)}`;
}

// Same glyph as ../bym uses (its Material Symbols set isn't loaded here, so
// the path is inlined). `currentColor` lets it follow the link's hover swap.
function WhatsAppIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.528 5.855L0 24l6.326-1.51A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.213-3.754.896.948-3.651-.234-.374A9.818 9.818 0 1112 21.818z" />
    </svg>
  );
}

// Closing section of the page: RSVP on the left, dress code on the right,
// split by a rule on desktop and by an ornamental "&" on mobile — same layout
// as ../bym's RSVPSection, rebuilt in this site's typography and palette.
export default function RSVPSection() {
  return (
    <section
      // Opens on the Lino GiftsSection ends on and eases into Cloud Dancer —
      // see the alternating chain in globals.css.
      className="section-fade-to-cloud relative w-full overflow-hidden py-20 sm:py-28"
    >
      {/* .section-shell (globals.css) — shared desktop measure/gutter across
          every section below the 3D experience. */}
      <div className="section-shell grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-0">
        <div
          className="flex flex-col items-center gap-3 text-center md:border-r md:pr-10"
          style={{ borderColor: `${GOLD}33` }}
        >
          <span
            className="text-[0.7rem] uppercase tracking-[0.25em]"
            style={{ color: BROWN_LIGHT }}
          >
            Confirmación
          </span>
          <p
            className="font-[family-name:var(--font-parisienne)] leading-tight"
            style={{ color: GOLD, fontSize: "clamp(2.25rem, 6vw, 3.25rem)" }}
          >
            Confirmá tu asistencia
          </p>

          <div className="mt-2 flex flex-col items-center gap-2.5">
            {CONTACTS.map((contact) => (
              <Button
                key={contact.phone}
                href={whatsAppLink(contact)}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="md"
              >
                {/* Button wraps its children in a plain <span> (its own flex
                    box is on the outer element), so the icon needs its own
                    flex context here or it baseline-aligns against the text
                    instead of centering on it — same pattern as
                    UploadPhotos.tsx. */}
                <span className="inline-flex items-center gap-2">
                  <WhatsAppIcon />
                  {contact.name}: {contact.phone}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile-only divider: the md:border-r above collapses when the grid
            stacks, leaving the two blocks running together. */}
        <div className="flex items-center justify-center gap-4 md:hidden">
          <div
            className="h-px flex-1"
            style={{ backgroundColor: `${GOLD}33` }}
          />
          <span
            className="font-[family-name:var(--font-parisienne)] text-2xl"
            style={{ color: BROWN_LIGHT }}
          >
            &amp;
          </span>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: `${GOLD}33` }}
          />
        </div>

        <div className="flex flex-col items-center gap-3 text-center md:pl-10">
          <span
            className="text-[0.7rem] uppercase tracking-[0.25em]"
            style={{ color: BROWN_LIGHT }}
          >
            Vestimenta
          </span>
          <p
            className="font-[family-name:var(--font-parisienne)] leading-tight"
            style={{ color: GOLD, fontSize: "clamp(2.25rem, 6vw, 3.25rem)" }}
          >
            Dress Code
          </p>
          <p
            className="mt-1 font-[family-name:var(--font-cormorant)] italic"
            style={{ color: TEXT, fontSize: "clamp(1.05rem, 2vw, 1.25rem)" }}
          >
            {DRESS_CODE}
          </p>
        </div>
      </div>

      <p
        className="mt-14 text-center font-[family-name:var(--font-cormorant)] italic"
        style={{
          color: TEXT_SECONDARY,
          fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
        }}
      >
        Nicol &amp; Ignacio · 24 de octubre de 2026
      </p>
    </section>
  );
}
