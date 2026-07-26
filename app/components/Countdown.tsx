"use client";

import { useEffect, useState } from "react";
import {
  BROWN_LIGHT,
  BLUE,
  CREAM_ALT,
  GOLD,
  TEXT_SECONDARY,
} from "./ClosingInvitation";

// Ceremony start, with the UTC-3 offset written out explicitly. A bare
// "2026-10-24T18:30" would be parsed in the VISITOR's timezone, so a guest
// abroad — or anyone whose phone clock is set to another zone — would see a
// countdown that disagrees with the invitation by hours.
const TARGET = new Date("2026-10-24T18:30:00-03:00").getTime();

type Remaining = { days: number; hours: number; minutes: number } | null;

function remainingFrom(now: number): Remaining {
  const diff = TARGET - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-[family-name:var(--font-cormorant)] leading-none tabular-nums"
        style={{ color: BLUE, fontSize: "clamp(2.75rem, 9vw, 5rem)" }}
      >
        {value}
      </span>
      <span
        className="text-[0.68rem] uppercase tracking-[0.2em] sm:text-[0.75rem]"
        style={{ color: TEXT_SECONDARY }}
      >
        {label}
      </span>
    </div>
  );
}

export default function Countdown() {
  // Starts null and fills in from an effect, on purpose. Computing the
  // remaining time during render would produce different markup on the server
  // than in the browser (the clock moves between the two), which is exactly
  // the "server rendered HTML didn't match" hydration error.
  const [left, setLeft] = useState<Remaining>(null);

  useEffect(() => {
    setLeft(remainingFrom(Date.now()));
    // Minute resolution, so a minute tick is all that is needed. Re-syncs from
    // Date.now() each time rather than decrementing a counter, so it stays
    // correct after the tab has been backgrounded and the timer throttled.
    const id = setInterval(() => setLeft(remainingFrom(Date.now())), 60_000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      className="relative w-full overflow-hidden py-16 text-center sm:py-20"
      style={{ backgroundColor: CREAM_ALT }}
    >
      {/* .section-shell (globals.css) — shared desktop measure/gutter across
          every section below the 3D experience. */}
      <div className="section-shell">
        <p
          className="font-[family-name:var(--font-parisienne)]"
          style={{ color: GOLD, fontSize: "clamp(2.25rem, 5.5vw, 3.5rem)" }}
        >
          Nos vemos en
        </p>

        <div className="mt-8 flex items-start justify-center gap-5 sm:gap-10">
          <Unit value={left ? String(left.days) : "--"} label="Días" />
          <span
            className="font-[family-name:var(--font-cormorant)] leading-none"
            style={{ color: BROWN_LIGHT, fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
            aria-hidden
          >
            :
          </span>
          <Unit value={left ? pad(left.hours) : "--"} label="Horas" />
          <span
            className="font-[family-name:var(--font-cormorant)] leading-none"
            style={{ color: BROWN_LIGHT, fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
            aria-hidden
          >
            :
          </span>
          <Unit value={left ? pad(left.minutes) : "--"} label="Min" />
        </div>

        <p
          className="mt-8 mx-auto max-w-md font-[family-name:var(--font-cormorant)] italic tracking-wide"
          style={{
            color: TEXT_SECONDARY,
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
          }}
        >
          &ldquo;Y si alguno prevaleciere contra uno, dos le resistirán; y
          cordón de tres dobleces no se rompe pronto.&rdquo;
          <br />
          Eclesiastés 4:12
        </p>
      </div>
    </section>
  );
}
