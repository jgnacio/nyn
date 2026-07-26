"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CREAM_ALT, GOLD, TEXT_SECONDARY } from "./ClosingInvitation";
import {
  HERO_TITLE,
  HERO_VERSE,
  HERO_VERSE_TRACK_EM,
} from "./hero-wordmark";

// Total curtain time once the animation actually starts, in seconds. Kept
// short on purpose: a splash that outstays its welcome is a bounce.
const HOLD_AFTER_DRAW = 0.35;
const FADE_OUT = 0.7;

// Per-letter wipe, expressed as clip-path insets (top right bottom left).
//
// The bleed is NOT decorative slack. `clip-path` clips against the element's
// border box, and Parisienne's glyphs paint well outside theirs — the entry and
// exit strokes overhang sideways, the ascenders and the capital's flourish
// overhang upward. Clipping to `inset(0 0% 0 0)` would therefore shave those
// strokes off permanently, even at the end of the animation. Negative insets
// push the clip box outside the border box so the finished state clips nothing
// at all, and the wipe still starts fully closed because a 100% right inset
// collapses the box regardless.
const LETTER_HIDDEN = "inset(-35% 100% -35% -35%)";
const LETTER_SHOWN = "inset(-35% -35% -35% -35%)";

// Hard ceiling on how long we'll wait for the webfont before starting anyway.
// Without it a slow/failed font fetch would leave guests staring at a blank
// cream rectangle indefinitely.
const FONT_WAIT_MS = 1600;

export default function SplashScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const verseRef = useRef<HTMLSpanElement>(null);
  // Unmounts the overlay entirely once it has faded — leaving a transparent
  // fixed layer over the page would keep intercepting nothing but still cost a
  // compositor layer for the rest of the session.
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const title = titleRef.current;
    if (!root || !title) return;

    // The splash sits ON TOP of SpiralGallery, which is already live behind it
    // — scrolling now would burn through the intro unseen. Block the input
    // events rather than setting `overflow: hidden` on html/body: a non-visible
    // overflow turns those into scroll containers, which breaks the canvas's
    // `position: sticky` and the scroller ScrollTrigger/Lenis measure against.
    // See the NO-DO comment in globals.css.
    const blockScroll = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const letters = Array.from(title.querySelectorAll<HTMLElement>("[data-letter]"));

    const finish = () => {
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      setDone(true);
    };

    let timeline: gsap.core.Timeline | null = null;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;

      if (reduced) {
        // Respect the preference: show the wordmark, skip the per-letter draw,
        // get out of the way quickly.
        gsap.set([letters, ruleRef.current, verseRef.current], {
          opacity: 1,
          clipPath: LETTER_SHOWN,
          scaleX: 1,
          y: 0,
        });
        timeline = gsap
          .timeline({ onComplete: finish })
          .to(root, { opacity: 0, duration: 0.4, delay: 0.6, ease: "power2.in" });
        return;
      }

      timeline = gsap.timeline({ onComplete: finish });

      // "Drawn" letter by letter: each glyph is wiped in left-to-right via
      // clip-path rather than simply faded, which reads like a stroke being
      // laid down instead of text popping in. The overlapping stagger keeps it
      // continuous — the next letter starts before the previous one lands.
      timeline.to(letters, {
        clipPath: LETTER_SHOWN,
        opacity: 1,
        duration: 0.42,
        ease: "power2.out",
        stagger: 0.055,
      });

      // Gold rule draws outward from the left, same gesture, one beat later.
      timeline.to(
        ruleRef.current,
        { scaleX: 1, duration: 0.5, ease: "power2.out" },
        "-=0.25"
      );

      timeline.to(
        verseRef.current,
        { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" },
        "-=0.2"
      );

      // Fades to reveal the canvas underneath. The overlay background is the
      // exact same Lino as `scene.background` in SpiralGallery, so this reads
      // as the wordmark dissolving rather than a panel lifting off.
      timeline.to(root, {
        opacity: 0,
        duration: FADE_OUT,
        ease: "power2.inOut",
        delay: HOLD_AFTER_DRAW,
      });
    };

    // Start only once the real script face is available — measuring/animating
    // per-letter boxes on the fallback family makes every glyph shift sideways
    // the moment the swap lands.
    let started = false;
    let timeoutId = 0;
    const startOnce = () => {
      if (started || cancelled) return;
      started = true;
      window.clearTimeout(timeoutId);
      start();
    };

    timeoutId = window.setTimeout(startOnce, FONT_WAIT_MS);
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(startOnce);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      timeline?.kill();
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      // `fixed`, never a scroll container: see the blockScroll comment above.
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: CREAM_ALT }}
      role="status"
      aria-label={`${HERO_TITLE} — ${HERO_VERSE}`}
    >
      {/* Parisienne script, matching the in-canvas hero title and the Footer's
          closing wordmark. Cased as written, not uppercased — a script face
          set in caps loses its connecting strokes entirely. */}
      <span
        ref={titleRef}
        aria-hidden
        // `block` + a viewport-relative cap so a long wordmark wraps instead
        // of running off the edge on a narrow phone; the per-letter spans wrap
        // between themselves naturally.
        className="block max-w-[90vw] text-center font-[family-name:var(--font-parisienne)] leading-[1.25]"
        style={{
          color: GOLD,
          fontSize: "clamp(2.5rem, 10vw, 6rem)",
        }}
      >
        {Array.from(HERO_TITLE).map((ch, i) => (
          <span
            // Index keys are correct here: the string is a fixed constant, so
            // the list never reorders.
            key={i}
            data-letter
            className="inline-block"
            style={{
              opacity: 0,
              clipPath: LETTER_HIDDEN,
              // Spaces collapse to zero width as inline-block, which would eat
              // the gap between the two names.
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        ))}
      </span>

      <span
        ref={ruleRef}
        aria-hidden
        className="mt-5 block h-px w-16 origin-left"
        style={{ backgroundColor: GOLD, transform: "scaleX(0)" }}
      />

      <span
        ref={verseRef}
        aria-hidden
        className="mt-5 max-w-[90vw] text-center font-[family-name:var(--font-cormorant)] italic"
        style={{
          color: TEXT_SECONDARY,
          opacity: 0,
          transform: "translateY(6px)",
          fontSize: "clamp(0.8rem, 2vw, 1.05rem)",
          letterSpacing: `${HERO_VERSE_TRACK_EM}em`,
          // The tracking adds a trailing gap after the last glyph; pull it back
          // so the line is optically centred, not mathematically centred.
          marginRight: `-${HERO_VERSE_TRACK_EM}em`,
        }}
      >
        {HERO_VERSE}
      </span>
    </div>
  );
}
