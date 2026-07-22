"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { GalleryImage } from "./gallery-types";

// Adapted from Originkit's "Image Gallery" component
// (https://www.originkit.dev/components/imagegallery), ported from its
// Framer/CDN-script original to this project's stack: gsap imported from the
// npm package already installed here (package.json) instead of injecting a
// second copy via a <script src="cdnjs..."> tag, and typed instead of
// @ts-nocheck. Behavior (the spiral/scatter spawn-and-fade tile animation)
// is unchanged from the original.

const ZONES = [
  { cx: 18, cy: 18 },
  { cx: 82, cy: 18 },
  { cx: 18, cy: 82 },
  { cx: 82, cy: 82 },
  { cx: 32, cy: 14 },
  { cx: 50, cy: 12 },
  { cx: 68, cy: 14 },
  { cx: 32, cy: 86 },
  { cx: 50, cy: 88 },
  { cx: 68, cy: 86 },
  { cx: 14, cy: 35 },
  { cx: 14, cy: 55 },
  { cx: 14, cy: 72 },
  { cx: 86, cy: 35 },
  { cx: 86, cy: 55 },
  { cx: 86, cy: 72 },
  { cx: 28, cy: 28 },
  { cx: 72, cy: 28 },
  { cx: 28, cy: 72 },
  { cx: 72, cy: 72 },
  { cx: 42, cy: 16 },
  { cx: 58, cy: 16 },
  { cx: 42, cy: 84 },
  { cx: 58, cy: 84 },
  { cx: 16, cy: 45 },
  { cx: 84, cy: 45 },
  // Center + horizontal-band zones — the original set above skews entirely
  // toward corners/edges, with nothing near dead-center or along a pure
  // horizontal line. Combined with the fact that spawn RADIUS used to be a
  // single fixed value (see the radiusJitter fix in spawnTile), tiles never
  // landed anywhere near the middle of the frame.
  { cx: 50, cy: 50 },
  { cx: 40, cy: 50 },
  { cx: 60, cy: 50 },
  { cx: 50, cy: 40 },
  { cx: 50, cy: 60 },
  { cx: 30, cy: 50 },
  { cx: 70, cy: 50 },
  { cx: 40, cy: 60 },
  { cx: 60, cy: 40 },
];

// 20 spiral path templates. Each: random start angle, spin direction, turns.
const SPIRAL_PATHS = Array.from({ length: 20 }, () => ({
  startAngle: Math.random() * Math.PI * 2,
  spinDir: Math.random() < 0.5 ? 1 : -1,
  turns: 1.2 + Math.random() * 0.8,
}));

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type EaseName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "anticipate"
  | "bounceIn"
  | "bounceOut";

// Maps Framer's transition ease values to GSAP equivalents.
function framerEaseToGsap(ease?: EaseName | number[]): string {
  if (!ease || ease === "linear") return "none";
  if (Array.isArray(ease)) return `cubic-bezier(${ease[0]},${ease[1]},${ease[2]},${ease[3]})`;
  const map: Record<string, string> = {
    easeIn: "power2.in",
    easeOut: "power2.out",
    easeInOut: "power2.inOut",
    circIn: "circ.in",
    circOut: "circ.out",
    circInOut: "circ.inOut",
    backIn: "back.in",
    backOut: "back.out",
    backInOut: "back.inOut",
    anticipate: "back.inOut(1.7)",
    bounceIn: "bounce.in",
    bounceOut: "bounce.out",
  };
  return map[ease] ?? "power2.out";
}

interface PhaseConfig {
  style?: "inToOut" | "outToIn";
  ease?: { duration?: number; delay?: number; ease?: EaseName; fadeOut?: number };
  fadeOut?: number;
}

export interface ImageGalleryProps {
  background?: string;
  images: GalleryImage[];
  imageScale?: number; // 1..20 slider, remapped to 0.125x..5x
  imageWidth?: number;
  imageHeight?: number;
  rounded?: number; // tile corner radius in px
  blankArea?: number; // 0..100, spawn radius / spiral midpoint radius
  crowdDensity?: number; // roughly how many tiles alive at once
  crowdDelay?: number; // seconds between batches (0 = continuous flow)
  type?: "straight" | "spiral";
  direction?: "both" | "clockwise" | "anticlockwise";
  appear?: PhaseConfig;
  disappear?: PhaseConfig;
  className?: string;
}

export default function ImageGallery({
  background,
  images,
  imageScale,
  imageWidth,
  imageHeight,
  rounded,
  blankArea,
  crowdDensity,
  crowdDelay,
  type,
  direction,
  appear,
  disappear,
  className,
}: ImageGalleryProps) {
  const animType = type ?? "straight";
  const spiralDir = direction ?? "both";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const zIndexRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const activeCountRef = useRef(0);
  const recentImgsRef = useRef<string[]>([]);
  const imagePoolRef = useRef<GalleryImage[]>([]);
  const backgroundRef = useRef(background ?? "#000000");
  const imageScaleRef = useRef(imageScale ?? 5);
  const imageWidthRef = useRef(imageWidth ?? 240);
  const imageHeightRef = useRef(imageHeight ?? 240);
  const roundedRef = useRef(rounded ?? 0);
  const blankAreaRef = useRef(blankArea ?? 1);
  const crowdDensityRef = useRef(crowdDensity ?? 10);
  const crowdDelayRef = useRef(crowdDelay ?? 0);
  const typeRef = useRef(animType);
  const dirRef = useRef(spiralDir);
  const appearRef = useRef<PhaseConfig>(
    appear ?? { style: "inToOut", ease: { duration: 0.5, ease: "easeOut" } }
  );
  const disappearRef = useRef<PhaseConfig>(
    disappear ?? { style: "inToOut", ease: { duration: 0.67, ease: "easeIn" } }
  );
  // Refs are read from timer/GSAP callbacks that run outside React's render
  // cycle, so they need the latest prop values without forcing the whole
  // spawn effect to tear down and rebuild on every prop change. Syncing them
  // in an effect (not during render) keeps this off the render path per the
  // react-hooks/refs rule.
  useEffect(() => {
    backgroundRef.current = background ?? "#000000";
    imageScaleRef.current = imageScale ?? 5;
    imageWidthRef.current = imageWidth ?? 240;
    imageHeightRef.current = imageHeight ?? 240;
    roundedRef.current = rounded ?? 0;
    blankAreaRef.current = blankArea ?? 1;
    crowdDensityRef.current = crowdDensity ?? 10;
    crowdDelayRef.current = crowdDelay ?? 0;
    typeRef.current = animType;
    dirRef.current = spiralDir;
    appearRef.current = appear ?? { style: "inToOut", ease: { duration: 0.5, ease: "easeOut" } };
    disappearRef.current = disappear ?? {
      style: "inToOut",
      ease: { duration: 0.67, ease: "easeIn" },
    };
    imagePoolRef.current = images;
  });

  function getUniqueImage(): GalleryImage | null {
    const pool = imagePoolRef.current;
    if (pool.length === 0) return null;
    const recent = recentImgsRef.current;
    let available = pool.filter((img) => !recent.includes(img.src));
    if (available.length === 0) {
      recentImgsRef.current = [];
      available = pool;
    }
    const selected = pick(available);
    recentImgsRef.current.push(selected.src);
    if (recentImgsRef.current.length > Math.max(3, pool.length - 1)) {
      recentImgsRef.current.shift();
    }
    return selected;
  }

  useEffect(() => {
    recentImgsRef.current = [];
  }, [images]);

  useEffect(() => {
    images.forEach((img) => {
      const i = new window.Image();
      i.src = img.src;
    });
  }, [images]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        pausedRef.current = true;
        gsap.globalTimeline.pause();
        containerRef.current?.querySelectorAll("[data-tile]").forEach((el) => el.remove());
      } else {
        pausedRef.current = false;
        gsap.globalTimeline.resume();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function spawnTile() {
      if (pausedRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const imgSrc = getUniqueImage();
      if (!imgSrc) return;

      // Random pick, not round-robin: the ZONES array groups its entries by
      // region (corners first, center-ish ones appended at the tail), so
      // cycling through it in order produces visible BURSTS where several
      // simultaneously-alive tiles all land in the same region for a
      // stretch (e.g. a run through the center-biased tail) before moving on
      // to the next region. A random pick spreads regions evenly over time
      // instead of in sequential runs.
      const zone = pick(ZONES);

      const shape = { w: imageWidthRef.current, h: imageHeightRef.current };

      const containerW = containerRef.current?.offsetWidth || 800;
      const containerH = containerRef.current?.offsetHeight || 600;

      const userScale = 0.125 + ((imageScaleRef.current - 1) / 19) * 4.875;
      const maxByWidth = containerW / shape.w;
      const maxByHeight = containerH / shape.h;
      const effectiveScale = Math.min(userScale, maxByWidth, maxByHeight);
      const tileW = Math.round(shape.w * effectiveScale);
      const tileH = Math.round(shape.h * effectiveScale);

      const s0 = rand(0.1, 0.4);
      const s2 = rand(0.7, 1.1);
      const s3 = rand(3.0, 4.5);

      const centerX = containerW / 2;
      const centerY = containerH / 2;
      const zoneAngle = Math.atan2(zone.cy - 50, zone.cx - 50);
      const angleJitter = rand(-0.25, 0.25);
      const angle = zoneAngle + angleJitter + rand(-0.3, 0.3);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Resting (home) position each tile settles into. Scaled PER AXIS by the
      // container's own half-width/half-height (not a single isotropic
      // Math.hypot radius) — on a full-bleed section the container is much
      // wider than it is tall, so an isotropic radius pushed horizontal-zone
      // tiles' home position out past the container's actual left/right edge,
      // where `overflow: hidden` clipped them to a barely-visible sliver.
      // Also inset by half the tile's own footprint so the fully-opaque
      // resting tile is never itself straddling the edge.
      const isSpiralModeForSpawn = typeRef.current === "spiral";
      // `blankArea` used to be applied as a single FIXED radius fraction for
      // every tile — every tile landed at exactly the same distance from
      // center, just at different angles. That's why the center (and any ring
      // between "very close" and "at blankArea's radius") stayed empty: no
      // tile could ever land there. `radiusJitter` makes blankArea a MAX
      // instead of a constant, so tiles land anywhere from near-center out to
      // that max, per spawn.
      const radiusJitter = rand(0.08, 1);
      const radiusFrac = (blankAreaRef.current / 100) * 0.92 * radiusJitter;
      const maxRadiusX = Math.max(0, containerW / 2 - tileW / 2);
      const maxRadiusY = Math.max(0, containerH / 2 - tileH / 2);

      const spawnX_px = isSpiralModeForSpawn ? centerX : centerX + cosA * radiusFrac * maxRadiusX;
      const spawnY_px = isSpiralModeForSpawn ? centerY : centerY + sinA * radiusFrac * maxRadiusY;

      // Wrapped, not an unbounded counter: only ever needs to order the tiles
      // ALIVE right now (a handful, per crowdDensity) relative to each other,
      // but `crowdDelay`-less continuous spawning runs for as long as the
      // page stays open, so an ever-incrementing z-index eventually climbs
      // past any fixed value placed above it — including whatever z-index a
      // UI element like the "Ver fotos" button uses to sit above the
      // gallery. Wrapping to a bounded range keeps newest-on-top ordering
      // among the currently-alive tiles while guaranteeing tiles can never
      // out-climb a fixed overlay z-index.
      zIndexRef.current = (zIndexRef.current % 500) + 1;

      const el = document.createElement("div");
      el.setAttribute("data-tile", "1");
      el.style.cssText = `
        position: absolute;
        width: ${tileW}px;
        height: ${tileH}px;
        left: ${spawnX_px}px;
        top: ${spawnY_px}px;
        transform-origin: center center;
        border-radius: ${roundedRef.current}px;
        overflow: hidden;
        box-shadow: none;
        z-index: ${zIndexRef.current};
        pointer-events: none;
        will-change: transform, opacity;
        translate: -50% -50%;
        background: ${backgroundRef.current};
        opacity: 0;
      `;

      const imgEl = document.createElement("img");
      imgEl.alt = imgSrc.alt ?? "";
      imgEl.loading = "eager";
      imgEl.decoding = "async";
      imgEl.referrerPolicy = "no-referrer";
      imgEl.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";

      el.appendChild(imgEl);
      container.appendChild(el);
      activeCountRef.current++;

      function startAnimation() {
        if (pausedRef.current) {
          activeCountRef.current--;
          el.remove();
          return;
        }

        const appearDir = appearRef.current?.style ?? "inToOut";
        const disappearDir = disappearRef.current?.style ?? "inToOut";

        const entryDur = appearRef.current?.ease?.duration ?? 0.5;
        const holdDur = appearRef.current?.ease?.delay ?? 0;
        const zoopDur = disappearRef.current?.ease?.duration ?? 0.67;
        const entryEase = framerEaseToGsap(appearRef.current?.ease?.ease ?? "easeOut");
        const exitEase = framerEaseToGsap(disappearRef.current?.ease?.ease ?? "easeIn");

        const exitSign = disappearDir === "inToOut" ? 1 : -1;
        const exitScale = disappearDir === "inToOut" ? s3 : 0.08;
        const fadeOutPct = disappearRef.current?.fadeOut ?? 100;
        const fadeDur = zoopDur * (fadeOutPct / 100);

        const entryD = rand(80, 140);
        const exitD = rand(160, 260);

        const onDone = () => {
          gsap.set(el, { opacity: 0 });
          el.remove();
          activeCountRef.current--;
        };

        const isSpiral = typeRef.current === "spiral";

        if (isSpiral) {
          const path = SPIRAL_PATHS[Math.floor(Math.random() * SPIRAL_PATHS.length)];
          const R = Math.hypot(containerW / 2, containerH / 2) * 1.1;
          const startA = path.startAngle;
          const dirSetting = dirRef.current;
          const spinDir =
            dirSetting === "clockwise" ? 1 : dirSetting === "anticlockwise" ? -1 : path.spinDir;
          const turns = path.turns;

          const startR = appearDir === "inToOut" ? 0 : R;
          const endR = disappearDir === "inToOut" ? R : 0;
          const midR = R * (blankAreaRef.current / 100);

          const mid = pick([0.45, 0.5, 0.55]);
          const pathPos = (u: number): [number, number] => {
            const r =
              u <= mid ? startR + (midR - startR) * (u / mid) : midR + (endR - midR) * ((u - mid) / (1 - mid));
            const a = startA + spinDir * u * turns * Math.PI * 2;
            return [Math.cos(a) * r, Math.sin(a) * r];
          };

          const scaleAt = (u: number) => (appearDir === "inToOut" ? s2 * u : s2 * (1 - u));

          const [sx, sy] = pathPos(0);
          const tl = gsap.timeline({ onComplete: onDone });
          tl.set(el, { scale: scaleAt(0), opacity: 0, x: sx, y: sy, rotation: 0 });

          const totalDur = entryDur + holdDur + zoopDur;
          const appearEnd = entryDur;
          const driftEnd = entryDur + holdDur;
          const big = { t: 0 };
          tl.to(big, {
            t: 1,
            duration: totalDur,
            ease: "none",
            onUpdate: () => {
              const t = big.t;
              const realT = t * totalDur;
              const u = Math.max(0, Math.min(1, t + Math.sin(t * Math.PI * 2) * 0.12));
              let op: number;
              if (realT < appearEnd) {
                op = entryDur > 0 ? realT / entryDur : 1;
              } else if (realT < driftEnd) {
                op = 1;
              } else {
                const since = realT - driftEnd;
                op = fadeDur > 0 ? Math.max(0, 1 - since / fadeDur) : 0;
              }
              const [x, y] = pathPos(u);
              gsap.set(el, { x, y, opacity: op, scale: scaleAt(u) });
            },
          });
        } else if (appearDir === "inToOut") {
          const x1 = cosA * entryD;
          const y1 = sinA * entryD;
          const x2 = x1 + exitSign * cosA * exitD;
          const y2 = y1 + exitSign * sinA * exitD;
          const driftF = 0.15;
          const xD = x1 + (x2 - x1) * driftF;
          const yD = y1 + (y2 - y1) * driftF;
          const scaleD = s2 + (exitScale - s2) * driftF;

          const tl = gsap
            .timeline({ onComplete: onDone })
            .set(el, { scale: s0, opacity: 1, x: 0, y: 0, rotation: 0 })
            .to(el, { scale: s2, x: x1, y: y1, duration: entryDur, ease: entryEase });
          if (holdDur > 0) {
            tl.to(el, { scale: scaleD, x: xD, y: yD, duration: holdDur, ease: "none" });
          }
          tl.to(el, { scale: exitScale, x: x2, y: y2, duration: zoopDur, ease: exitEase }).to(
            el,
            { opacity: 0, duration: fadeDur, ease: exitEase },
            "<"
          );
        } else {
          const startX = cosA * entryD * 2.5;
          const startY = sinA * entryD * 2.5;
          const exitX = exitSign * cosA * exitD;
          const exitY = exitSign * sinA * exitD;
          const driftF = 0.15;
          const xD = (exitX - 0) * driftF;
          const yD = (exitY - 0) * driftF;
          const scaleD = s2 + (exitScale - s2) * driftF;

          const tl = gsap
            .timeline({ onComplete: onDone })
            .set(el, { scale: s3, opacity: 0, x: startX, y: startY, rotation: 0 })
            .to(el, { scale: s2, opacity: 1, x: 0, y: 0, duration: entryDur, ease: entryEase });
          if (holdDur > 0) {
            tl.to(el, { scale: scaleD, x: xD, y: yD, duration: holdDur, ease: "none" });
          }
          tl.to(el, { scale: exitScale, x: exitX, y: exitY, duration: zoopDur, ease: exitEase }).to(
            el,
            { opacity: 0, duration: fadeDur, ease: exitEase },
            "<"
          );
        }
      }

      imgEl.onerror = () => {
        activeCountRef.current--;
        el.remove();
      };
      imgEl.src = imgSrc.src;

      if (typeof imgEl.decode === "function") {
        imgEl
          .decode()
          .then(startAnimation)
          .catch(() => {
            activeCountRef.current--;
            el.remove();
          });
      } else if (imgEl.complete && imgEl.naturalWidth > 0) {
        startAnimation();
      } else {
        imgEl.onload = startAnimation;
      }
    }

    let lastSpawn = 0;
    let batchCount = 0;
    let nextBatchAt = 0;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const target = Math.max(1, Math.round(crowdDensityRef.current));
      const delaySec = Math.max(0, crowdDelayRef.current);
      const now = performance.now();

      if (delaySec === 0) {
        const entryDur = appearRef.current?.ease?.duration ?? 0.5;
        const holdDur = appearRef.current?.ease?.delay ?? 0;
        const zoopDur = disappearRef.current?.ease?.duration ?? 0.67;
        const lifetimeMs = (entryDur + holdDur + zoopDur) * 1000;
        const spawnInterval = Math.max(20, lifetimeMs / target);
        if (now - lastSpawn >= spawnInterval) {
          spawnTile();
          lastSpawn = now;
        }
        return;
      }

      if (now < nextBatchAt) return;
      if (batchCount < target) {
        if (now - lastSpawn >= 50) {
          spawnTile();
          batchCount++;
          lastSpawn = now;
          if (batchCount >= target) {
            nextBatchAt = now + delaySec * 1000;
            batchCount = 0;
          }
        }
      }
    }, 20);

    const container = containerRef.current;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        gsap.globalTimeline.clear();
      } catch {}
      container?.querySelectorAll("[data-tile]").forEach((el) => el.remove());
      activeCountRef.current = 0;
      zIndexRef.current = 1;
      recentImgsRef.current = [];
    };
  }, [
    images,
    background,
    imageScale,
    imageWidth,
    imageHeight,
    rounded,
    blankArea,
    crowdDensity,
    crowdDelay,
    animType,
    spiralDir,
    appear,
    disappear,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: background ?? "#000000",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
