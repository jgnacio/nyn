"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GOLD } from "./ClosingInvitation";
import {
  HERO_TITLE,
  HERO_VERSE,
  HT_PAD,
  HT_RULE_GAP,
  HT_TITLE_SIZE,
  HT_TITLE_TRACK,
  HT_VERSE_GAP,
  HT_VERSE_SIZE,
  HT_VERSE_TRACK,
} from "./hero-wordmark";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  DepthOfFieldEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
} from "postprocessing";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import ClosingInvitation from "./ClosingInvitation";

gsap.registerPlugin(ScrollTrigger);

const IMAGE_FILES = [
  "DSC_4522.webp",
  "DSC_4558.webp",
  "DSC_4550.webp",
  "DSC_4613.webp",
  "DSC_4625.webp",
  "DSC_4590.webp",
  "DSC_4570.webp",
  "DSC_4599.webp",
  "DSC_4559.webp",
  "DSC_4553.webp",
  "DSC_4584.webp",
  "DSC_4577.webp",
  "DSC_4586.webp",
  "DSC_4555.webp",
  "DSC_4609.webp",
  "DSC_4626.webp",
];

// --- Spiral (helix) geometry constants ---
// THIRD-PERSON MODEL: the camera is fully static, positioned outside the
// spiral looking at a fixed "stage" point (0,0,0). Every image's position is
// recomputed each frame from its continuous angle (see `angle_i(p)` /
// `helixPoint` below): the current angular position it occupies as scroll
// advances, driven by a non-uniform, edge-to-edge angular layout (see
// `theta`/`angularSpans` below) instead of a fixed per-image step.
// CONTINUOUS RIBBON MODEL (Dialect-style): images touching edge-to-edge so
// the spiral reads as one wrapped band around a cylinder instead of isolated
// floating photos, with no cropping — each image keeps its natural aspect
// ratio and claims exactly the angular footprint its own width implies.
const RADIUS = 24; // swing radius around the central stage axis: enlarged so each image's angular footprint (width_i / RADIUS) shrinks, which reduces both tangential/cylinder curvature and the per-vertex vertical shear within a single image, without shrinking the on-stage image (x=0,z=0 at angle=0 regardless of RADIUS)
const Y_STEP = 7; // vertical spacing "per calibration step" (see PITCH below): widened so consecutive spiral turns read as clearly separated instead of packed together
const DEPTH_PER_STEP = 1; // gentle recession "per calibration step" (see DEPTH_PITCH below) — keeps far turns readable instead of vanishing into blur
// Sign of the rotation direction. Verified visually with chrome-devtools
// screenshots: DIR_SIGN = 1 sweeps future images to the right / clockwise as
// seen by the camera. Flip to -1 if it reads counter-clockwise.
const DIR_SIGN = 1;

const PLANE_HEIGHT = 13; // fixed plane height in world units, same for every image; width is derived per-image from its natural aspect ratio (no cropping)

// Film-strip sprocket holes: world-unit spacing between hole centers along
// an image's width, so the pitch reads consistently across images of
// different aspect ratios instead of a fixed hole-count-per-image looking
// denser on wide images and sparser on narrow ones.
const FILM_HOLE_SPACING = 2.6;

// Sprocket band height, in world units, as EXTRA geometry stacked above and
// below each photo's own PLANE_HEIGHT — not carved out of it. This is the
// "option B" shape: the band is a real strip of its own curved geometry
// (matching the photo's curvature via the same yOffset-aware
// `computeCurvedPlanePositions`), so no photo pixels are ever covered or
// cropped by it.
const FILM_BAND_HEIGHT = 0.8;

// The closing invitation is authored, not photographed, so it has no natural
// image dimensions to derive a width from — these aspect ratios are picked by
// hand instead. It becomes the LAST slide in the same spiral sequence (see
// `CLOSING_INDEX` below), sized/positioned through the exact same
// helix/curvature math as every photo.
//
// Two ratios by orientation: on a wide (landscape) viewport the card is a
// landscape rectangle; on a narrow (portrait) phone that same landscape card,
// once expanded to cover the screen, becomes a short letterbox band with the
// text crammed into it — unreadable. So portrait viewports get a PORTRAIT card
// (taller than wide, ~2:3 like a real invitation) that fills a phone screen
// naturally. Chosen once at init from the load-time orientation (see
// `closingAspect` below).
const CLOSING_CARD_ASPECT_LANDSCAPE = 1.5;
const CLOSING_CARD_ASPECT_PORTRAIT = 0.66;

// CSS-pixel-per-world-unit scale used to size the closing card's real DOM
// element before CSS3DObject scales it back down into world units (see
// `CSS3DObject.scale.set` below) — arbitrary, only affects the DOM element's
// internal pixel density/crispness, not its final on-screen size.
const CSS3D_PX_PER_UNIT = 180;

// The closing card is a real DOM element positioned in 3D space via
// CSS3DRenderer, which has no fog/occlusion against the WebGL photos — a
// nearer photo can't visually hide it the way it would a WebGL mesh. So it's
// kept hidden until scroll is within this many "slide steps" of taking the
// stage (i.e. nothing else should be centered in front of it by then anyway),
// then revealed with a quick fade as it settles into place.
const CLOSING_REVEAL_STEPS = 1.1;

// The closing card's swing-in (via the normal helix/angleFor math, same as
// every photo) completes EXPAND_STEPS early — at
// (CLOSING_INDEX - EXPAND_STEPS) instead of riding all the way to
// CLOSING_INDEX. The remaining EXPAND_STEPS of scroll, with the card already
// parked dead-center, are spent scaling it up from its normal
// near-fullscreen "photo" framing to a true edge-to-edge fullscreen fill —
// same scroll-driven/reversible pattern as the intro hero pull-back, just
// mirrored at the tail end instead of the head.
const CLOSING_EXPAND_STEPS = 0.35;

// Extra scroll distance, in viewport-heights, held AFTER the closing card
// finishes expanding to fullscreen and BEFORE SaveTheDate is allowed to take
// over. Previously there was none — the ScrollTrigger's `end` and the
// container's height were the same point, so the sticky canvas released the
// instant expandEased hit 1, no pause. This decouples them: the container
// grows by this much extra height (keeping the sticky layers pinned, since
// they only release at the container's own bottom edge), while the
// ScrollTrigger `end` stays at the original (un-extended) distance so
// `progressState` simply holds at maxProgress — card frozen fullscreen,
// already white — for this stretch of scroll before the section releases.
const CLOSING_DWELL_VH = 180;

// Calibration constant only: the old fixed 72deg-per-image step (5 images
// per revolution) is no longer used for angular *spacing* (spacing is now
// non-uniform, driven by each image's own angular footprint — see
// `angularSpans`/`theta` below), but it is kept as the reference unit that
// ties vertical pitch and depth recession to "one old-style step" of angle,
// so the vertical/depth feel of the ribbon stays the same as before.
const ANGLE_STEP_REF = (Math.PI * 2) / 5;
const PITCH = Y_STEP / ANGLE_STEP_REF; // vertical world units per radian of angle
const DEPTH_PITCH = DEPTH_PER_STEP / ANGLE_STEP_REF; // depth-recession world units per radian of |angle|

// Static third-person camera: never moves, sits outside the spiral's radius,
// looking at the fixed stage point where the "current" image always sits.
// Pulled back and widened (vs the old single-row layout) so 2-3 full
// revolutions of the ribbon fit in frame simultaneously. Distance/FOV tuned
// so the rel=0 ("current") image, which always sits at x=0,z=0, still reads
// as near-fullscreen — its screen size depends only on PLANE_HEIGHT and this
// distance/FOV, not on RADIUS (rel=0 => z=0 regardless of radius).
const CAMERA_POSITION = { x: 0, y: 0.8, z: 19 };
const CAMERA_LOOK_AT = { x: 0, y: 0, z: 0 };
const CAMERA_FOV = 60;

// --- Scroll-driven camera pull-back ---
// The camera's Z distance is part of the scroll animation, not a one-time
// timed intro. At scroll progress 0 the camera sits at the "hero fit" distance
// so the flat hero image (index 0, pinned at world x=0,z=0) fits fully within
// the viewport; as scroll advances through the first image-step it RECEDES to
// the normal framing distance (CAMERA_POSITION.z). Driving this off `progress`
// (instead of a GSAP timeline) makes it fully reversible/scrubbable: scroll
// back up and the camera comes back in, hero returns to its fit framing. We
// move only camera.position.z — image 0 stays pinned at (x=0,z=0) — so this
// never fights the per-frame `updateSpiral` recompute of every mesh transform.
// The intro distance is COMPUTED at runtime (see `computeHeroFitZ`), not a
// hardcoded constant, so it adapts to the hero's real aspect ratio and the
// current viewport — a fixed value was too close and cropped the image.
const CAMERA_PULLBACK_STEPS = 1; // image-steps of scroll over which z goes heroFitZ -> CAMERA_POSITION.z (1 = completes as you scroll past the first image)
const HERO_FIT_ZOOM_OUT = 1; // >1 pushes the progress-0 camera slightly farther than an exact width-fill, so the hero sits a touch back with a little breathing margin (1 = exact edge-to-edge fill, no side margins)

// CAMERA_POSITION.z (19) was tuned by eye on a landscape desktop viewport. FOV
// is vertical, so visible WIDTH at a fixed z shrinks with the aspect ratio
// (visibleWidth = 2*z*tan(fov/2)*aspect) — on a narrow portrait phone the
// same z lets the (wider-than-tall) current photo overflow the sides of the
// screen, reading as zoomed-in/too close. This backs the camera off just far
// enough to width-fit a representative photo (reusing `computeHeroFitZ`'s
// exact-fit math), never closer than the desktop-tuned distance
// (`Math.max`), so wide/desktop viewports are completely unaffected.
function computeRestingCameraZ(
  heroWidth: number,
  viewportAspect: number,
  fovDeg: number
): number {
  return Math.max(
    CAMERA_POSITION.z,
    computeHeroFitZ(heroWidth, viewportAspect, fovDeg)
  );
}

// --- Scroll-driven curvature ramp ---
// Curvature is a GLOBAL, scroll-driven lerp (same factor for every mesh) from a
// flat rectangle (curveFactor 0, progress 0) to the full curved spiral panel
// (curveFactor 1). It MUST be global — flattening only the hero while its
// neighbor stayed curved would mismatch their shared seam edge and reopen a
// gap. A single factor keeps every image's curvature identical at any progress,
// so all shared edges stay matched throughout the transition. Ramped with a
// power3.out ease synchronized to the camera pull-back so the spiral visually
// "assembles" as the camera recedes.
const CURVE_IN_STEPS = 1; // scroll image-steps over which curvature ramps 0 (flat) -> 1 (full spiral curve); tune to taste

interface SpiralPoint {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

// Loads an image just to read its natural pixel dimensions. This must
// resolve BEFORE the ribbon layout (cumulative angular spans) can be
// computed, since layout is now non-uniform and depends on each image's
// aspect ratio. Cheap: the browser will reuse the cached response when
// THREE.TextureLoader requests the same URL right after.
function loadImageDimensions(file: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = `/images/${file}`;
  });
}

// TANGENTIAL ORIENTATION: images are treated as panels glued to the outside
// of an invisible cylinder, not billboards facing the camera. A plane's
// front-face normal is +Z; rotating it by `angle` around Y turns that normal
// into (sin(angle), 0, cos(angle)) — exactly the outward radial direction of
// the helix at that angle (matches how x/z are built below from the same
// angle). So rotationY = angle makes each image face directly outward from
// the cylinder's axis, tangent to the curve, and it visibly spins through
// front / edge-on / back as `angle` changes with scroll — no lookAt anywhere.
//
// `angle` is now a single CONTINUOUS parameter (an image's current angular
// position in the ribbon, relative to the stage) driving x, y, and z
// together, replacing the old step-function `rel`-based spiralPoint: this is
// what removes the vertical/depth seam between neighboring images, since
// consecutive images share the same continuous function evaluated at
// adjacent angles instead of jumping between discrete per-image constants.
function helixPoint(angle: number): SpiralPoint {
  const x = RADIUS * Math.sin(angle);
  const z = RADIUS * (Math.cos(angle) - 1) - Math.abs(angle) * DEPTH_PITCH;
  const y = -angle * PITCH;
  return { x, y, z, rotationY: angle };
}

// Camera Z distance at scroll progress 0, computed so the FLAT hero image
// (at curveFactor 0 it's a plain rectangle heroWidth x PLANE_HEIGHT centered
// at the origin, facing the camera) exactly fills the viewport WIDTH — edge to
// edge, left to right. The vertical axis is left free: it crops top/bottom
// when the image is taller-ratio than the viewport, or leaves the black
// background above/below when it's wider (e.g. a landscape hero on a portrait
// phone). three.js PerspectiveCamera FOV is VERTICAL, so:
//   visibleWidth(z) = 2 * z * tan(fov/2) * viewportAspect
// Solving visibleWidth(z) = heroWidth gives the distance below. It depends on
// `viewportAspect`, so it's fully RESPONSIVE: recomputed on resize, it adapts
// to any screen — on a narrow phone the camera simply sits farther back to
// keep the width filled. No clamp against CAMERA_POSITION.z here: on some
// aspect ratios (e.g. phones) filling the width legitimately needs a distance
// GREATER than the normal spiral framing, and clamping would break the
// full-width fit — the scroll pull-back just interpolates in whichever
// direction is needed.
function computeHeroFitZ(
  heroWidth: number,
  viewportAspect: number,
  fovDeg: number
): number {
  const tanHalfFov = Math.tan((fovDeg * Math.PI) / 180 / 2);
  return (heroWidth / (2 * tanHalfFov * viewportAspect)) * HERO_FIT_ZOOM_OUT;
}

// Inverse of `computeHeroFitZ`'s formula: the world-space WIDTH visible at a
// given camera distance. Used for the closing card's tail-end expand — the
// camera itself never moves there (it's already resting at
// CAMERA_POSITION.z), so instead the card's own CSS3DObject scale is grown
// until its rendered width equals this visible width, filling the viewport
// edge-to-edge at the camera's current, unmoving distance.
function computeVisibleWidthAtZ(
  z: number,
  viewportAspect: number,
  fovDeg: number
): number {
  const tanHalfFov = Math.tan((fovDeg * Math.PI) / 180 / 2);
  return 2 * z * tanHalfFov * viewportAspect;
}

// Builds a plane that is bent along the same circle `helixPoint` places
// image centers on, instead of a flat rectangle. Vertices are generated in
// the mesh's local space using a *local* angular offset `a` from the image's
// own center (a=0), with the identical x/z formula as helixPoint's radial
// sweep: x = R sin(a), z = R(cos(a) - 1). Because mesh.rotation.y is later
// set to the image's center angle and mesh.position to helixPoint's (x,z)
// for that center angle, the rotation+translation exactly reconstructs
// R sin(centerAngle+a) / R(cos(centerAngle+a)-1) for every vertex (angle-sum
// identity) — so neighboring images, whose angular spans are contiguous,
// curve together into one continuous tangent band instead of meeting at
// flat, mismatched edges.
//
// Per-vertex continuity (this is what actually removes the seam): since
// mesh.position.y = -centerAngle*PITCH and the true continuous helix has
// y(centerAngle+a) = -( centerAngle + a )*PITCH = y(centerAngle) - a*PITCH,
// the LOCAL vertex y only needs the delta term `-a*PITCH` on top of the flat
// [-height/2, height/2] band. Same idea for z's depth-recession term: the
// per-mesh-constant |centerAngle|*DEPTH_PITCH baked into mesh.position.z is
// subtracted back out here per-vertex via `depthDelta`, so the *local*
// z only carries the tangential curvature term plus the *change* in depth
// recession across the plane's own angular span.
// IMPORTANT: `centerAngle` here must be the SAME value that will be used as
// `mesh.rotation.y` for whichever frame these positions are meant to be
// correct for. The per-vertex depth term below is only exact (edge-to-edge
// continuous with neighboring images) when the two coincide — see
// `updateCurvedPlanePositions`, which is why this ribbon recomputes vertex
// positions every frame instead of baking them once at mount: `mesh.rotation.y`
// is driven by the live, scroll-dependent `angleFor(i, p)`, not by the
// static per-image `theta[i]` this geometry would otherwise be built from.
// Baking with a fixed `centerAngle` that later diverges from the mesh's
// actual rotation reopens exactly the gap this function exists to close.
function computeCurvedPlanePositions(
  out: Float32Array,
  width: number,
  height: number,
  radius: number,
  centerAngle: number,
  segments: number,
  curveFactor: number,
  // Fixed world-Y offset applied AFTER the curve/shear lerp, unaffected by
  // curveFactor — used to stack the film-strip sprocket bands directly
  // above/below a photo's own PLANE_HEIGHT as real extra geometry (see
  // FILM_BAND_HEIGHT) instead of carving the bands out of the photo itself.
  yOffset = 0
): void {
  const angularSpan = width / radius;
  const centerDepth = Math.abs(centerAngle) * DEPTH_PITCH;

  const cosC = Math.cos(centerAngle);
  const sinC = Math.sin(centerAngle);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const a = (u - 0.5) * angularSpan;
    const globalAngle = centerAngle + a;

    // Pure tangential curvature term — exact under the angle-sum identity,
    // do not touch.
    const xCurve = radius * Math.sin(a);
    const zCurve = radius * (Math.cos(a) - 1);

    // Depth recession must be a pure WORLD-space Z offset (no world-X
    // component). Local (x, z) get mixed into world (x, z) by the mesh's
    // Y-axis rotation, so a naive subtraction from local z leaks into world
    // X and gets scaled by cos(centerAngle) in world Z. Instead, express the
    // desired world-space delta and rotate it by the INVERSE of the mesh's
    // rotation (-centerAngle) so it lands correctly once the mesh's actual
    // rotation is applied.
    const depthWorldDeltaZ = -(Math.abs(globalAngle) * DEPTH_PITCH - centerDepth);
    const xDepthLocal = -depthWorldDeltaZ * sinC;
    const zDepthLocal = depthWorldDeltaZ * cosC;

    // FLAT target (curveFactor = 0): a plain flat rectangle centered at the
    // local origin, facing +Z — no bend, no y-shear, no depth recession.
    // CURVED target (curveFactor = 1): the full spiral panel (unchanged).
    // LERP between them by the GLOBAL, scroll-driven curveFactor so every
    // mesh shares the same curvature at any progress and their seams stay
    // matched throughout the flat -> curved transition.
    const xFlat = (u - 0.5) * width;
    const xCurved = xCurve + xDepthLocal;
    const zCurved = zCurve + zDepthLocal;

    const x = THREE.MathUtils.lerp(xFlat, xCurved, curveFactor);
    const z = THREE.MathUtils.lerp(0, zCurved, curveFactor);

    // y is unaffected by Y-axis rotation. Flat target has no shear
    // (-/+height/2); curved target subtracts the a*PITCH shear. Lerp both.
    const yBottom =
      THREE.MathUtils.lerp(-height / 2, -height / 2 - a * PITCH, curveFactor) + yOffset;
    const yTop =
      THREE.MathUtils.lerp(height / 2, height / 2 - a * PITCH, curveFactor) + yOffset;
    const base = i * 6;
    out[base] = x;
    out[base + 1] = yBottom;
    out[base + 2] = z;
    out[base + 3] = x;
    out[base + 4] = yTop;
    out[base + 5] = z;
  }
}

function createCurvedPlaneGeometry(
  width: number,
  height: number,
  radius: number,
  centerAngle: number,
  segments = 24,
  curveFactor = 1,
  yOffset = 0
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const uvs: number[] = [];
  const indices: number[] = [];

  const positions = new Float32Array((segments + 1) * 2 * 3);
  computeCurvedPlanePositions(
    positions,
    width,
    height,
    radius,
    centerAngle,
    segments,
    curveFactor,
    yOffset
  );

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    uvs.push(u, 0, u, 1);
  }

  for (let i = 0; i < segments; i++) {
    const a0 = i * 2;
    const b0 = a0 + 1;
    const a1 = a0 + 2;
    const b1 = a0 + 3;
    indices.push(a0, a1, b0, b0, a1, b1);
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// --- Hero title, rendered INSIDE the 3D scene ---------------------------
// Deliberately NOT an HTML overlay: an absolutely-positioned <div> sits in a
// different space than the canvas, so it neither respects the camera nor
// participates in the scroll-driven pull-back — it just floats on top and
// covers the render. Instead the title is painted to a 2D canvas, uploaded as
// a texture, and hung on a plane PARENTED TO THE CAMERA, locked to the camera→
// origin distance (i.e. exactly the DepthOfFieldEffect's focus plane, so it
// never picks up bokeh) and animated off the scroll progress.
// The strings and the type metrics live in ./hero-wordmark, shared with
// SplashScreen — see the note there on why they are not declared here.
//
// Canvas 2D has no reliable cross-browser `letterSpacing`, so the verse's
// tracking is applied by advancing per glyph by hand.

// Blur radius of the dark halo painted under the hero title. Referenced by the
// canvas sizing too — the blur spreads ink this far past every glyph edge, so
// it has to be budgeted into the padding or the glow is sliced off flat.
const HERO_SHADOW_BLUR = 26;

// Real INK bounds of a tracked run, which is not the same thing as its advance
// width. `measureText().width` is the advance — how far the pen moves — and for
// a script face like Parisienne the painted glyph reaches well outside that on
// both sides (entry/exit strokes, swashes) and far above the em size
// (ascenders, the capital's flourish). Sizing the canvas off the advance and
// the font size therefore clips the wordmark. `actualBoundingBox*` reports
// where the pixels actually land, so measure with that instead.
type InkBox = {
  left: number; // ink extent LEFT of the start pen position (positive = overhang)
  right: number; // ink extent right of the start pen position
  ascent: number; // ink above the baseline
  descent: number; // ink below the baseline
};

function measureTrackedInk(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number
): InkBox {
  let cx = 0;
  let left = 0;
  let right = 0;
  let ascent = 0;
  let descent = 0;

  for (const ch of text) {
    const m = ctx.measureText(ch);
    // A blank glyph reports zero/undefined bounds in some engines — it
    // contributes advance but no ink, so only the pen position moves.
    left = Math.min(left, cx - (m.actualBoundingBoxLeft || 0));
    right = Math.max(right, cx + (m.actualBoundingBoxRight || 0));
    ascent = Math.max(ascent, m.actualBoundingBoxAscent || 0);
    descent = Math.max(descent, m.actualBoundingBoxDescent || 0);
    cx += m.width + tracking;
  }

  // Guard for an all-blank run, and never report less than the advance.
  right = Math.max(right, cx - tracking);
  return { left, right, ascent, descent };
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number
) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

// Builds the title canvas at exactly the size its content needs (measured in a
// first pass), so the resulting plane has no dead padding that would throw off
// the top-left corner margin.
function createHeroTextCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Same pairing as the Footer's closing "Ignacio & Nicol": next/font exposes
  // the real families through CSS variables on <html>; fall back to generic
  // stacks if they haven't resolved yet.
  const script =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-parisienne")
      .trim() || "cursive";
  const serif =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-cormorant")
      .trim() || "serif";

  const title = HERO_TITLE;
  const verse = HERO_VERSE;
  const titleFont = `400 ${HT_TITLE_SIZE}px ${script}`;
  const verseFont = `italic 400 ${HT_VERSE_SIZE}px ${serif}`;

  ctx.font = titleFont;
  const titleInk = measureTrackedInk(ctx, title, HT_TITLE_TRACK);
  ctx.font = verseFont;
  const verseInk = measureTrackedInk(ctx, verse, HT_VERSE_TRACK);

  // The halo is painted with a 26px blur, which spreads ink that far past every
  // glyph edge in all four directions. It has to be part of the padding or the
  // glow gets sliced off flat against the canvas border.
  const pad = HT_PAD + HERO_SHADOW_BLUR;

  // Both runs are drawn from the same pen X, so the box spans the union of
  // their ink. `ink.left` is negative when a glyph overhangs to the left of the
  // pen; shifting the origin right by that amount brings the overhang inside.
  const inkLeft = Math.min(titleInk.left, verseInk.left);
  const inkRight = Math.max(titleInk.right, verseInk.right);
  const originX = pad - inkLeft;

  // Baselines derived from measured ink, NOT from the font size: the ascent of
  // a script face exceeds its em size, so `pad + HT_TITLE_SIZE` put the
  // baseline too high and cut the tops off.
  const titleBaseline = pad + titleInk.ascent;
  // Clear the title's descenders (the "g" in Ignacio) before the rule.
  const ruleY = titleBaseline + titleInk.descent + HT_RULE_GAP;
  const verseBaseline = ruleY + HT_VERSE_GAP + verseInk.ascent;

  canvas.width = Math.ceil(inkRight - inkLeft + pad * 2);
  canvas.height = Math.ceil(verseBaseline + verseInk.descent + pad);

  // Resizing the canvas resets the 2D context, so every draw-state assignment
  // below has to come AFTER the width/height writes.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Dark halo under everything: the text is now white, so the hero photo
  // behind this corner can be any brightness and the ink still needs to
  // separate from bright patches. Two passes because a single soft shadow is
  // too faint to separate the glyphs.
  ctx.shadowColor = "rgba(20,17,14,0.55)";
  ctx.shadowBlur = HERO_SHADOW_BLUR;
  ctx.fillStyle = "#ffffff";
  ctx.font = titleFont;
  for (let pass = 0; pass < 2; pass++) {
    drawTracked(ctx, title, originX, titleBaseline, HT_TITLE_TRACK);
  }
  ctx.font = verseFont;
  ctx.fillStyle = "#ffffff";
  drawTracked(ctx, verse, originX, verseBaseline, HT_VERSE_TRACK);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = titleFont;
  drawTracked(ctx, title, originX, titleBaseline, HT_TITLE_TRACK);

  ctx.fillStyle = GOLD;
  ctx.fillRect(originX, ruleY, Math.min(96, inkRight - inkLeft), 2);

  ctx.font = verseFont;
  drawTracked(ctx, verse, originX, verseBaseline, HT_VERSE_TRACK);

  return canvas;
}

export default function SpiralGallery() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cssMountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // The closing card's DOM node is created imperatively (it's wrapped by a
  // CSS3DObject, not mounted by React directly) — this state only exists so
  // its render below can portal the real <ClosingInvitation/> JSX into it
  // once the effect has created it.
  const [closingCardEl, setClosingCardEl] = useState<HTMLDivElement | null>(null);
  // Whether the closing card was built in its portrait (mobile) proportion —
  // drives the vertical layout variant of <ClosingInvitation/> below. Set
  // once during scene init from the load-time viewport orientation.
  const [closingPortrait, setClosingPortrait] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const cssMount = cssMountRef.current;
    const container = containerRef.current;
    if (!mount || !cssMount || !container) return;

    // Prevent the browser from restoring a stale scroll position on
    // reload/back-forward navigation — Lenis would then ease from 0 toward
    // that stale target, producing a spurious auto-scroll on load.
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    // The scene now depends on natural image dimensions (fetched async, see
    // `init` below), so setup is restructured as an async init function.
    // `cancelled` guards against a fast unmount racing the dimension
    // preload: if the component unmounts before `init` finishes awaiting,
    // `init` bails out right after the await and none of the scene/DOM
    // resources below get created, so the cleanup function only needs to
    // tear down whatever actually got assigned to these outer-scoped refs.
    let cancelled = false;

    let renderer: THREE.WebGLRenderer | null = null;
    let cssRenderer: CSS3DRenderer | null = null;
    let composer: EffectComposer | null = null;
    let animationId = 0;
    let lenis: Lenis | null = null;
    let scrollTween: gsap.core.Tween | null = null;
    let dwellTween: gsap.core.Tween | null = null;
    let heroTextTween: gsap.core.Tween | null = null;
    let tickerCallback: ((time: number) => void) | null = null;
    let onResize: (() => void) | null = null;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    async function init() {
      // Preload natural dimensions for every image up front: non-uniform
      // layout (cumulative angular spans) can't be computed until every
      // image's aspect ratio is known.
      const dims = await Promise.all(IMAGE_FILES.map(loadImageDimensions));
      if (cancelled) return;

      const aspects = dims.map((d) => d.width / d.height);
      const widths = aspects.map((aspect) => PLANE_HEIGHT * aspect);

      // The closing invitation rides as one more slide at the end of the
      // exact same ribbon — same angular-layout math, same helix, same
      // curvature — instead of being a separate HTML element bolted on
      // after the fact. `slideWidths`/`slideCount` extend the photo-only
      // arrays by exactly one entry for it.
      const CLOSING_INDEX = IMAGE_FILES.length;
      // Orientation picked once, from the load-time viewport: a taller-than-
      // wide viewport is a portrait phone, so the card gets the portrait
      // aspect. Fixed for the session (a mid-experience device rotation keeps
      // this aspect rather than rebuilding the whole ribbon layout) — the
      // expand-to-cover below still fully fills whichever way the phone ends
      // up, so a rotation degrades gracefully instead of breaking.
      const closingPortrait = window.innerHeight > window.innerWidth;
      setClosingPortrait(closingPortrait);
      const closingAspect = closingPortrait
        ? CLOSING_CARD_ASPECT_PORTRAIT
        : CLOSING_CARD_ASPECT_LANDSCAPE;
      const closingWidth = PLANE_HEIGHT * closingAspect;
      const slideWidths = [...widths, closingWidth];
      const slideCount = slideWidths.length;
      const slideAngularSpans = slideWidths.map((w) => w / RADIUS);

      // Camera Z at progress 0, sized so the flat hero fits the current
      // viewport (see `computeHeroFitZ`). Mutable: recomputed on resize since
      // it depends on the viewport aspect ratio.
      let heroFitZ = computeHeroFitZ(
        widths[0],
        window.innerWidth / window.innerHeight,
        CAMERA_FOV
      );

      // Resting camera distance, aspect-adjusted (see `computeRestingCameraZ`).
      // Mutable: recomputed on resize since it depends on viewport aspect ratio.
      let restingCameraZ = computeRestingCameraZ(
        widths[0],
        window.innerWidth / window.innerHeight,
        CAMERA_FOV
      );

      // How much bigger than its normal footprint the closing card must scale
      // to fully COVER the viewport at the camera's resting distance
      // (restingCameraZ, which never moves during the expand — only the card's
      // own scale changes). "Cover", not "fit-width": scale by whichever of
      // width/height needs the larger factor, so the card never leaves a gap
      // on either axis regardless of how the card aspect (portrait on mobile,
      // landscape on desktop) relates to the viewport aspect. Mutable:
      // recomputed on resize since it depends on viewport aspect ratio.
      const computeClosingExpandScale = () => {
        const aspect = window.innerWidth / window.innerHeight;
        const visibleWidth = computeVisibleWidthAtZ(
          restingCameraZ,
          aspect,
          CAMERA_FOV
        );
        const visibleHeight = visibleWidth / aspect;
        return Math.max(visibleWidth / closingWidth, visibleHeight / PLANE_HEIGHT);
      };
      let closingExpandScale = computeClosingExpandScale();

      // Cumulative, edge-to-edge angular layout: each slide's center angle
      // theta_i = (sum of angularSpan_k for k < i) + angularSpan_i / 2.
      const theta: number[] = [];
      let cumulative = 0;
      for (let i = 0; i < slideAngularSpans.length; i++) {
        theta.push(cumulative + slideAngularSpans[i] / 2);
        cumulative += slideAngularSpans[i];
      }

      // Piecewise-linear interpolation of the stage's angle across the
      // precomputed theta array. progress still runs 0..N-1 in index units,
      // exactly as before.
      function stageAngle(p: number): number {
        const n = theta.length;
        const i0 = Math.min(Math.max(Math.floor(p), 0), n - 2);
        const frac = p - i0;
        return THREE.MathUtils.lerp(theta[i0], theta[i0 + 1], frac);
      }

      function angleFor(index: number, p: number): number {
        return DIR_SIGN * (theta[index] - stageAngle(p));
      }

      const scene = new THREE.Scene();
      // "Lino envejecido" (--background-alt) — fills the margins around the
      // width-fit hero and the gaps between spiral panels.
      scene.background = new THREE.Color(0xe4dfd4);
      // Atmospheric depth cue: distant spiral turns dissolve into the exact
      // cream of the background. The hero sits at the origin and the camera
      // stays at distance <= restingCameraZ (19 on desktop, up to ~40 on
      // narrow/portrait phones — see `computeRestingCameraZ`) at all scroll
      // positions, so fog.near (45) is comfortably beyond it — the front image is never
      // fogged — while fog.far (115) fully fades the far turns, pushed out a
      // bit further than a pure near-scale so distant turns stay visible
      // longer as you scroll/turn through the spiral. Fog color MUST match
      // the background so the fade is seamless. MeshBasicMaterial respects
      // fog by default.
      scene.fog = new THREE.Fog(0xe4dfd4, 45, 115);

      // Reusable endpoints for the background/fog color crossfade driven by
      // the closing card's expand phase below — "Lino envejecido" (the
      // spiral's resting color) to "Cloud Dancer" (the closing card's own
      // CREAM background, and the color the very top of the next HTML
      // section is primed to match). Mutated in place every frame via
      // lerpColors, never reallocated.
      const sceneBgCream = new THREE.Color(0xe4dfd4);
      const sceneBgWhite = new THREE.Color(0xf1f0ec);

      // Scratch color for the closing card's own background ramp during the
      // dwell (see the `--closing-bg` block in updateSpiral). Allocated once
      // here rather than per frame — this runs inside the rAF loop.
      const cardBgColor = new THREE.Color();

      const camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        window.innerWidth / window.innerHeight,
        0.1,
        200
      );

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      mount!.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      const textureLoader = new THREE.TextureLoader();
      const meshes: THREE.Mesh[] = [];

      // 1x1 placeholder so every material's `map` is non-null from its very
      // FIRST shader compile (opacity is 0 anyway, so it's invisible). This
      // keeps USE_MAP defined from frame one, needed for the `vMapUv`
      // varying the film-strip onBeforeCompile block below reads — without
      // it, that block runs before any real texture has loaded, USE_MAP is
      // undefined on that first compile, and the varying doesn't exist yet
      // (WebGLProgram VALIDATE_STATUS false).
      const placeholderTexture = new THREE.DataTexture(
        new Uint8Array([255, 255, 255, 255]),
        1,
        1
      );
      placeholderTexture.needsUpdate = true;

      // Each photo starts at opacity 0 and is revealed the moment its own
      // texture is ready — no fade/reveal timeline. The camera pull-back
      // that frames the hero is driven purely by scroll (see the camera
      // block in `updateSpiral`). Only the photos get a WebGL mesh here —
      // the closing card (index CLOSING_INDEX) is set up separately below as
      // a CSS3DObject, since it's real DOM content, not a texture.
      for (let i = 0; i < IMAGE_FILES.length; i++) {
        // Final geometry built once, from real dimensions — no
        // placeholder-then-rebuild-on-texture-load, since dimensions are
        // already known from the preload above.
        const geometry = createCurvedPlaneGeometry(slideWidths[i], PLANE_HEIGHT, RADIUS, theta[i]);
        geometries.push(geometry);

        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
          map: placeholderTexture,
        });
        materials.push(material);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.index = i;

        // Initial placement for progress = 0.
        const { x, y, z, rotationY } = helixPoint(angleFor(i, 0));
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotationY;

        meshes.push(mesh);
        group.add(mesh);

        // Film-strip sprocket bands: each band is its OWN curved geometry,
        // stacked as extra height above/below PLANE_HEIGHT (see
        // FILM_BAND_HEIGHT) and parented to the photo mesh so it inherits
        // position/rotation automatically — the photo's own pixels are
        // never covered or cropped.
        const holeCount = Math.max(4, Math.round(slideWidths[i] / FILM_HOLE_SPACING));
        const bandMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
          map: placeholderTexture,
        });
        bandMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uHoleCount = { value: holeCount };
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>\nuniform float uHoleCount;`
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>
              {
                float holeX = fract(vMapUv.x * uHoleCount);
                bool isHole = holeX > 0.2 && holeX < 0.8
                  && vMapUv.y > 0.22 && vMapUv.y < 0.78;
                if (isHole) {
                  discard;
                } else {
                  diffuseColor.rgb = vec3(0.05, 0.045, 0.04);
                }
              }`
            );
        };
        materials.push(bandMaterial);

        const bandOffset = PLANE_HEIGHT / 2 + FILM_BAND_HEIGHT / 2;
        const topBandGeometry = createCurvedPlaneGeometry(
          slideWidths[i],
          FILM_BAND_HEIGHT,
          RADIUS,
          theta[i],
          24,
          1,
          bandOffset
        );
        const bottomBandGeometry = createCurvedPlaneGeometry(
          slideWidths[i],
          FILM_BAND_HEIGHT,
          RADIUS,
          theta[i],
          24,
          1,
          -bandOffset
        );
        geometries.push(topBandGeometry, bottomBandGeometry);

        const topBandMesh = new THREE.Mesh(topBandGeometry, bandMaterial);
        const bottomBandMesh = new THREE.Mesh(bottomBandGeometry, bandMaterial);
        mesh.add(topBandMesh, bottomBandMesh);
        mesh.userData.bandTopGeometry = topBandGeometry;
        mesh.userData.bandBottomGeometry = bottomBandGeometry;
        mesh.userData.bandMaterial = bandMaterial;

        const file = IMAGE_FILES[i];
        // Texture load is independent of dimension preload/geometry build —
        // no cropping: textures map straight 0..1 onto the geometry.
        textureLoader.load(`/images/${file}`, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.push(texture);

          material.map = texture;
          material.needsUpdate = true;
          // Reveal this image as soon as its texture is ready.
          material.opacity = 1;
          const loadedBandMaterial = mesh.userData.bandMaterial as
            | THREE.MeshBasicMaterial
            | undefined;
          if (loadedBandMaterial) loadedBandMaterial.opacity = 1;
        });
      }

      // --- The closing card: a REAL DOM element riding the same ribbon ---
      // Instead of a WebGL texture standing in for it, the actual
      // <ClosingInvitation/> markup (real, selectable text) is wrapped in a
      // CSS3DObject and driven by the exact same helixPoint/angleFor math as
      // every photo mesh above — same element throughout, from its swing
      // into center stage to its final resting frame, no swap/crossfade to a
      // separate section.
      cssRenderer = new CSS3DRenderer();
      cssRenderer.setSize(window.innerWidth, window.innerHeight);
      cssRenderer.domElement.style.position = "absolute";
      cssRenderer.domElement.style.top = "0";
      cssRenderer.domElement.style.left = "0";
      cssMount!.appendChild(cssRenderer.domElement);

      const closingPxWidth = Math.round(closingWidth * CSS3D_PX_PER_UNIT);
      const closingPxHeight = Math.round(PLANE_HEIGHT * CSS3D_PX_PER_UNIT);

      const cardEl = document.createElement("div");
      cardEl.style.width = `${closingPxWidth}px`;
      cardEl.style.height = `${closingPxHeight}px`;
      cardEl.style.opacity = "0";
      cardEl.style.pointerEvents = "none";
      cardEl.style.transition = "opacity 0.4s ease-out";
      setClosingCardEl(cardEl);

      const closingObject = new CSS3DObject(cardEl);
      // Scales the element from CSS3D_PX_PER_UNIT-density pixels back down to
      // world units, so it occupies exactly closingWidth x PLANE_HEIGHT —
      // the same footprint a photo of that width would.
      closingObject.scale.set(1 / CSS3D_PX_PER_UNIT, 1 / CSS3D_PX_PER_UNIT, 1);
      const closingInitial = helixPoint(angleFor(CLOSING_INDEX, 0));
      closingObject.position.set(closingInitial.x, closingInitial.y, closingInitial.z);
      closingObject.rotation.y = closingInitial.rotationY;
      group.add(closingObject);

      // Initial default. The real per-frame camera Z is scroll-driven inside
      // `updateSpiral`, and `updateSpiral(0)` runs below before the first
      // render, so the progress-0 distance (heroFitZ) is established
      // before anything is drawn — no one-frame flash of the far framing.
      camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
      camera.lookAt(CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z);

      // --- Post-processing pipeline (pmndrs `postprocessing`) ---
      // Replaces the plain renderer.render loop to add real depth: depth of
      // field, atmospheric vignette, and subtle film grain.
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      // Depth of Field with a WORLD-SPACE focus target locked on the origin
      // (0,0,0) — the "stage" where the current/hero image always sits
      // (helixPoint(0) = origin). In postprocessing 6.39.2 the DoF effect
      // exposes `target: Vector3 | null` for auto-focus: when set, the focus
      // distance is recomputed from the live camera→target distance every
      // frame internally, so the in-focus band tracks the stage automatically
      // as the camera pulls back with scroll. The hero stays sharp; receding
      // spiral turns blur. (`worldFocusDistance`/`worldFocusRange`/`focalLength`
      // are deprecated in this version — `focusRange` is the current knob.)
      const dof = new DepthOfFieldEffect(camera, {
        focusRange: 11, // world units of the sharp band around the target — wide enough to keep the whole hero + nearest turn crisp
        bokehScale: 2.5, // moderate blur so the photos stay the star
      });
      dof.target = new THREE.Vector3(0, 0, 0);

      // Base strengths held for the whole experience, then eased to 0 during
      // the closing card's expand so the canvas→HTML handoff has no edge-darkened
      // seam (see the lockstep lerp in updateSpiral's crossfade block).
      const VIGNETTE_DARKNESS = 0.35; // subtle — the cream palette should still read warm
      const NOISE_OPACITY = 0.06; // very subtle film grain to kill the "flat CGI" look

      const vignette = new VignetteEffect({
        darkness: VIGNETTE_DARKNESS,
        offset: 0.35,
      });

      const noise = new NoiseEffect({
        blendFunction: BlendFunction.OVERLAY,
      });
      noise.blendMode.opacity.value = NOISE_OPACITY;

      // One EffectPass batches the screen-space effects efficiently.
      composer.addPass(new EffectPass(camera, dof, vignette, noise));

      // --- Hero title mesh (see createHeroTextCanvas above) ---------------
      // Parented to the CAMERA, not to `scene`/`group`: it must hold the same
      // screen corner no matter where the scroll-driven camera has travelled
      // to. A camera child only gets its world matrix updated if the camera
      // itself is part of the graph, hence the scene.add(camera).
      scene.add(camera);

      const heroTextCanvas = createHeroTextCanvas();
      // `let`: the webfont swap below re-measures the canvas, and the plane's
      // proportion has to follow it or the title stretches.
      let heroTextAspect = heroTextCanvas.width / heroTextCanvas.height;
      const heroTextTexture = new THREE.CanvasTexture(heroTextCanvas);
      heroTextTexture.colorSpace = THREE.SRGBColorSpace;
      heroTextTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures.push(heroTextTexture);

      const heroTextGeometry = new THREE.PlaneGeometry(1, 1);
      geometries.push(heroTextGeometry);
      const heroTextMaterial = new THREE.MeshBasicMaterial({
        map: heroTextTexture,
        transparent: true,
        opacity: 0,
        // The plane rides in front of everything by construction (it sits on
        // the camera→origin focus plane, and the hero photo sits AT the
        // origin), but depth-testing it against the curved panels would still
        // clip it the moment a spiral turn swings closer. Draw it last,
        // unconditionally.
        depthTest: false,
        depthWrite: false,
        // Fog is distance-based and this plane is always ~one focus distance
        // out — well inside fog.near — but pinning it off makes that
        // independent of any future fog retune.
        fog: false,
      });
      materials.push(heroTextMaterial);

      const heroTextMesh = new THREE.Mesh(heroTextGeometry, heroTextMaterial);
      heroTextMesh.renderOrder = 10;
      heroTextMesh.visible = false;
      camera.add(heroTextMesh);

      // Geometry/placement are stored NORMALIZED to a camera distance of 1 and
      // multiplied by the live focus distance each frame. Everything in a
      // perspective frustum scales linearly with distance, so this keeps the
      // title at a fixed apparent size and a fixed screen corner even while the
      // camera is pulling back.
      let htUnitW = 0;
      let htUnitH = 0;
      let htUnitX = 0;
      let htUnitY = 0;
      let htVisibleH1 = 0;

      function layoutHeroText() {
        const aspect = window.innerWidth / window.innerHeight;
        // Visible extents at distance 1 from the camera.
        htVisibleH1 = 2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
        const visibleW1 = htVisibleH1 * aspect;
        // Narrow/portrait viewports need the block to take a larger share of
        // the width or the tracked caps become unreadable; wide desktops need
        // it to stay a discreet corner mark.
        const widthFrac = THREE.MathUtils.clamp(0.44 / aspect, 0.24, 0.66);
        htUnitW = visibleW1 * widthFrac;
        htUnitH = htUnitW / heroTextAspect;
        const marginX = visibleW1 * 0.055;
        const marginY = htVisibleH1 * 0.07;
        htUnitX = -visibleW1 / 2 + marginX + htUnitW / 2;
        htUnitY = htVisibleH1 / 2 - marginY - htUnitH / 2;
      }
      layoutHeroText();

      // Entrance fade, independent of scroll — the title settles in on load and
      // is then handed over to the scroll-driven ramp in updateSpiral.
      const heroTextIntro = { value: 0 };
      heroTextTween = gsap.to(heroTextIntro, {
        value: 1,
        duration: 1.8,
        delay: 0.45,
        ease: "power2.out",
      });

      // Smoothed scroll velocity in progress-units/frame. Drives the small
      // lag/overshoot that makes the title feel physically attached to the
      // wheel rather than hard-locked to the corner.
      let htPrevP = 0;
      let htVel = 0;

      // Re-render the texture once the real webfont has loaded — the first
      // paint can land on the fallback family, which measures differently.
      document.fonts?.ready.then(() => {
        if (cancelled) return;
        const refreshed = createHeroTextCanvas();
        heroTextTexture.image = refreshed;
        heroTextTexture.needsUpdate = true;
        heroTextAspect = refreshed.width / refreshed.height;
        layoutHeroText();
      });

      const progressState = { value: 0 };

      // Dwell-phase progress (0..1), driven by a SECOND ScrollTrigger over the
      // stretch AFTER the closing card is fully expanded — the extra scroll the
      // sticky canvas holds before it releases SaveTheDate underneath. Only used
      // on LANDSCAPE (desktop): there the canvas fades its own background from
      // Cloud Dancer back to Lino across this stretch, so the whole
      // Cloud-Dancer→Lino gradient plays out INSIDE the always-visible WebGL
      // canvas instead of in the HTML section below it (which the sticky canvas
      // covers on wide viewports, hiding the gradient and reading as a hard
      // seam). Portrait/mobile leaves this at 0 and keeps the gradient in the
      // HTML, where it already reads perfectly.
      const dwellState = { value: 0 };

      // Re-place every image relative to the current scroll progress. No
      // billboarding/lookAt: rotation.y comes straight from the helix angle,
      // so each image is glued tangentially to the spiral's imaginary
      // cylinder and genuinely rotates in 3D as scroll advances (front ->
      // edge-on -> back), instead of always facing the static camera.
      function updateSpiral(p: number) {
        const sAngle = stageAngle(p);

        // Global, scroll-driven curvature factor (0 = flat, 1 = full spiral
        // curve), eased power3.out to stay synchronized with the camera
        // pull-back below. Computed ONCE per frame and shared by every mesh so
        // all images curve identically and their seams stay matched.
        const curveT = THREE.MathUtils.clamp(p / CURVE_IN_STEPS, 0, 1);
        const curveFactor = 1 - Math.pow(1 - curveT, 3);

        for (let i = 0; i < meshes.length; i++) {
          const angle = DIR_SIGN * (theta[i] - sAngle);
          const { x, y, z, rotationY } = helixPoint(angle);
          const mesh = meshes[i];
          mesh.position.set(x, y, z);
          mesh.rotation.y = rotationY;

          // The per-vertex depth correction baked into this mesh's geometry
          // is only exact edge-to-edge with its neighbors when it was
          // computed against the SAME angle as `mesh.rotation.y` above. That
          // angle (`rotationY`) is scroll-dependent, so the geometry must be
          // recomputed every frame here rather than once at mount time —
          // otherwise a static geometry built from `theta[i]` drifts out of
          // sync with the live rotation as soon as scroll moves away from
          // progress 0, reopening gaps between neighboring images.
          const positionAttr = mesh.geometry.getAttribute(
            "position"
          ) as THREE.BufferAttribute;
          computeCurvedPlanePositions(
            positionAttr.array as Float32Array,
            slideWidths[i],
            PLANE_HEIGHT,
            RADIUS,
            rotationY,
            24,
            curveFactor
          );
          positionAttr.needsUpdate = true;

          // Film-strip sprocket bands: same live-angle recompute as the
          // photo above, just with FILM_BAND_HEIGHT and a fixed yOffset so
          // each band stays glued directly above/below the photo's edge
          // (not lerped by curveFactor — see computeCurvedPlanePositions).
          const bandTopGeometry = mesh.userData.bandTopGeometry as
            | THREE.BufferGeometry
            | undefined;
          const bandBottomGeometry = mesh.userData.bandBottomGeometry as
            | THREE.BufferGeometry
            | undefined;
          if (bandTopGeometry && bandBottomGeometry) {
            const bandOffset = PLANE_HEIGHT / 2 + FILM_BAND_HEIGHT / 2;

            const topAttr = bandTopGeometry.getAttribute(
              "position"
            ) as THREE.BufferAttribute;
            computeCurvedPlanePositions(
              topAttr.array as Float32Array,
              slideWidths[i],
              FILM_BAND_HEIGHT,
              RADIUS,
              rotationY,
              24,
              curveFactor,
              bandOffset
            );
            topAttr.needsUpdate = true;

            const bottomAttr = bandBottomGeometry.getAttribute(
              "position"
            ) as THREE.BufferAttribute;
            computeCurvedPlanePositions(
              bottomAttr.array as Float32Array,
              slideWidths[i],
              FILM_BAND_HEIGHT,
              RADIUS,
              rotationY,
              24,
              curveFactor,
              -bandOffset
            );
            bottomAttr.needsUpdate = true;
          }
        }

        // The closing card rides the same helix, computed from the SAME
        // angleFor(index, p) as any photo — EXCEPT its swing-in is driven by
        // p clamped to `closingArriveProgress` (CLOSING_INDEX - EXPAND_STEPS)
        // instead of the raw scroll progress, so it finishes parked dead
        // center a little EARLY. The remaining EXPAND_STEPS of scroll (p from
        // closingArriveProgress to CLOSING_INDEX) are spent purely on the
        // expand below — the angle/position stay frozen at their arrival
        // values while only the scale grows. Revealed (opacity +
        // pointer-events) only once close, since a CSS3D element has no
        // fog/occlusion against the WebGL photos behind it.
        const closingArriveProgress = CLOSING_INDEX - CLOSING_EXPAND_STEPS;
        const closingAngle = angleFor(CLOSING_INDEX, Math.min(p, closingArriveProgress));
        const closingPoint = helixPoint(closingAngle);

        const revealT = THREE.MathUtils.clamp(
          (p - (closingArriveProgress - CLOSING_REVEAL_STEPS)) / CLOSING_REVEAL_STEPS,
          0,
          1
        );
        cardEl.style.opacity = String(revealT);
        cardEl.style.pointerEvents = revealT > 0.05 ? "auto" : "none";

        // Expand phase: once the card has arrived dead-center, grow it from
        // its normal PLANE_HEIGHT-sized footprint up to `closingExpandScale`
        // — filling the viewport edge-to-edge — over the final
        // CLOSING_EXPAND_STEPS of scroll. Ease-out to land softly at the
        // fullscreen size right as scroll hits the bottom of the page.
        const expandT = THREE.MathUtils.clamp(
          (p - closingArriveProgress) / CLOSING_EXPAND_STEPS,
          0,
          1
        );
        const expandEased = 1 - Math.pow(1 - expandT, 3);
        const closingScale =
          THREE.MathUtils.lerp(1, closingExpandScale, expandEased) / CSS3D_PX_PER_UNIT;
        closingObject.scale.set(closingScale, closingScale, 1 / CSS3D_PX_PER_UNIT);

        // The card "arrives" near-center but not perfectly on-axis (position
        // x/z close to but not exactly 0, rotation.y close to but not
        // exactly 0 — see the comment above). That residual offset/tilt is
        // barely visible at the card's normal PLANE_HEIGHT size, but the
        // expand phase blows it up to fullscreen, turning it into an obvious
        // keystoned/rotated slab. So position and rotation ALSO ease toward
        // dead-center-and-flat (0,0,0 / rotation 0) in lockstep with the
        // scale-up, landing perfectly screen-aligned — facing the static
        // camera, which looks straight down -z at the origin — exactly when
        // it finishes covering the viewport.
        closingObject.position.set(
          THREE.MathUtils.lerp(closingPoint.x, 0, expandEased),
          THREE.MathUtils.lerp(closingPoint.y, 0, expandEased),
          THREE.MathUtils.lerp(closingPoint.z, 0, expandEased)
        );
        closingObject.rotation.y = THREE.MathUtils.lerp(
          closingPoint.rotationY,
          0,
          expandEased
        );

        // Crossfade the canvas background/fog from cream to white in lockstep
        // with the same expand easing, so by the time the card finishes
        // covering the viewport (expandEased=1, which lands exactly at the
        // bottom of the scroll container) the WebGL canvas is already the
        // same white as the card's own background and the HTML section right
        // below it — no color seam, no hard cut, just a soft dissolve.
        (scene.background as THREE.Color).lerpColors(
          sceneBgCream,
          sceneBgWhite,
          expandEased
        );
        (scene.fog as THREE.Fog).color.lerpColors(
          sceneBgCream,
          sceneBgWhite,
          expandEased
        );

        // LANDSCAPE ONLY — second crossfade: once the card is fullscreen and
        // the background has reached Cloud Dancer above, ease it BACK toward
        // Lino (--background-alt) across the dwell. This plays the
        // Cloud-Dancer→Lino handoff gradient inside the always-visible canvas
        // (the sticky canvas covers the HTML gradient on wide desktop
        // viewports), so by the time the canvas releases, it already sits on
        // Lino — the exact solid color SaveTheDate starts on in landscape (see
        // .save-the-date-bg in globals.css) — and the join is seamless. Portrait
        // keeps dwellState at 0, so this is a no-op and the HTML gradient stays.
        if (!closingPortrait) {
          (scene.background as THREE.Color).lerp(sceneBgCream, dwellState.value);
          (scene.fog as THREE.Fog).color.lerp(sceneBgCream, dwellState.value);

          // The card is expanded to COVER the viewport by this point, so the
          // canvas fade above happens entirely behind it and would never be
          // seen. Drive the card's own background through the identical
          // Cloud Dancer -> Lino ramp (via the `--closing-bg` custom property
          // ClosingInvitation reads) so the surface actually on screen is the
          // one that lands on Lino — the exact color SaveTheDate starts on in
          // landscape. Without this the handoff is a hard horizontal line.
          cardBgColor.lerpColors(sceneBgWhite, sceneBgCream, dwellState.value);
          cardEl.style.setProperty("--closing-bg", `#${cardBgColor.getHexString()}`);
        }

        // Fade the screen-space vignette (and film grain) out in lockstep with
        // the same expand easing. The vignette darkens the canvas EDGES — and
        // the bottom edge is exactly where this WebGL canvas hands off to the
        // flat HTML section below (SaveTheDate). Left at full strength, the
        // canvas ends on a vignette-DARKENED cream while the HTML starts on the
        // plain cream they were both primed to, so the two never match and a
        // hard color seam appears at the join (most visible on wide desktop
        // viewports, where the bottom edge sits deep in the vignette falloff).
        // Easing darkness → 0 as the closing card expands means that by the
        // time of the handoff the canvas is a UNIFORM #f1f0ec with no edge
        // darkening, matching the HTML exactly — no seam. The full-strength
        // vignette is untouched for the entire experience before this expand.
        vignette.darkness = THREE.MathUtils.lerp(VIGNETTE_DARKNESS, 0, expandEased);
        noise.blendMode.opacity.value = THREE.MathUtils.lerp(
          NOISE_OPACITY,
          0,
          expandEased
        );

        // Scroll-driven camera pull-back. At p=0 the camera sits at heroFitZ
        // so the flat hero fills the viewport width; over the first
        // CAMERA_PULLBACK_STEPS of scroll it recedes to CAMERA_POSITION.z.
        // Ease-out (power3.out) so the recede decelerates into its resting
        // distance.
        //
        // Y is ALSO interpolated: at p=0 the camera sits at y=0 looking
        // straight at the origin, so the flat hero renders as a perfectly
        // screen-aligned rectangle (no keystone). CAMERA_POSITION.y (0.8) is a
        // deliberate slight downward tilt for the SPIRAL framing, but applied
        // at p=0 it skews the hero out of alignment — so it eases in only as
        // the spiral assembles. X stays centered (0) throughout.
        const camT = THREE.MathUtils.clamp(p / CAMERA_PULLBACK_STEPS, 0, 1);
        const camEased = 1 - Math.pow(1 - camT, 3);
        camera.position.x = CAMERA_POSITION.x;
        // The spiral framing keeps the camera at CAMERA_POSITION.y (0.8), i.e.
        // ABOVE the origin looking slightly DOWN — a nice tilt for the helix,
        // but it keystones any vertical plane sitting at the origin. The
        // closing card ends up exactly there (position eased to 0,0,0, facing
        // +z), so with the tilt still on it renders as a slab "leaning
        // forward" toward the viewer instead of dead-flat. So during the same
        // expand window that flattens the card, ease the camera's y back to 0
        // — by the time the card is fullscreen the camera looks straight down
        // -z at the origin and the card is perfectly screen-aligned (no
        // keystone), which is the framing the card's own flatten-to-(0,0,0)
        // was always assuming.
        const camYBase = THREE.MathUtils.lerp(0, CAMERA_POSITION.y, camEased);
        camera.position.y = THREE.MathUtils.lerp(camYBase, 0, expandEased);
        camera.position.z = THREE.MathUtils.lerp(
          heroFitZ,
          restingCameraZ,
          camEased
        );
        camera.lookAt(CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z);

        // --- Hero title -------------------------------------------------
        // Placed AFTER the camera block on purpose: it reads this frame's
        // final camera position.
        //
        // The camera always lookAt()s the origin, so its local -Z axis points
        // straight at it and the camera→origin distance IS the depth of the
        // DoF focus plane. Sitting the title exactly there means it stays
        // razor-sharp while the spiral turns around it blur, and — since all
        // its placement values are normalized to distance 1 — its apparent
        // size stays put even as the camera recedes from heroFitZ to
        // restingCameraZ.
        const htDist = camera.position.distanceTo(CAMERA_LOOK_AT);

        // Smoothed d(progress)/frame. Exponential smoothing rather than the
        // raw delta so a wheel notch reads as a soft drag-and-settle instead
        // of a jitter, and clamped so a fast flick can't fling the title.
        htVel += ((p - htPrevP) - htVel) * 0.12;
        htPrevP = p;
        const htVelNorm = THREE.MathUtils.clamp(htVel * 14, -1, 1);

        // Departure ramp. It holds through the very start of the scroll (so
        // the title reads as a title), then leaves across roughly the same
        // stretch the camera uses to pull back and the spiral to assemble —
        // accompanying that motion rather than mirroring it. smoothstep, so
        // it eases out of the hold and into the exit instead of snapping.
        const htT = THREE.MathUtils.clamp((p - 0.15) / 0.8, 0, 1);
        const htEased = htT * htT * (3 - 2 * htT);

        // Drifts up and slightly further into the corner as it goes — the
        // opposite direction to the receding photos, which keeps the two
        // motions readable as separate layers. The velocity term rides on top
        // as a lag: scrolling down lets the title trail downward a touch
        // before it catches up.
        const htDriftY = htEased * htVisibleH1 * 0.07 - htVelNorm * htVisibleH1 * 0.022;
        const htDriftX = -htEased * htVisibleH1 * 0.02 - htVelNorm * htVisibleH1 * 0.008;

        const htScale = htDist * (1 - htEased * 0.1);
        heroTextMesh.scale.set(htUnitW * htScale, htUnitH * htScale, 1);
        heroTextMesh.position.set(
          (htUnitX + htDriftX) * htDist,
          (htUnitY + htDriftY) * htDist,
          -htDist
        );

        heroTextMaterial.opacity = heroTextIntro.value * (1 - htEased);
        heroTextMesh.visible = heroTextMaterial.opacity > 0.002;
      }

      updateSpiral(0);

      // --- Scroll setup: Lenis smooth scroll + GSAP ScrollTrigger ---
      lenis = new Lenis();

      lenis.on("scroll", ScrollTrigger.update);

      tickerCallback = (time: number) => {
        lenis!.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      gsap.ticker.lagSmoothing(0);

      const maxProgress = slideCount - 1;

      scrollTween = gsap.to(progressState, {
        value: maxProgress,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          // Deliberately NOT "bottom bottom": the container is now taller
          // than this by CLOSING_DWELL_VH (see that constant) so the sticky
          // canvas keeps holding its fully-expanded, already-white closing
          // card for that extra stretch of scroll — progress simply can't
          // exceed maxProgress once this trigger range is consumed — before
          // SaveTheDate is released underneath.
          //
          // Measured as a FRACTION of the container's own real rendered
          // height (getBoundingClientRect), not `window.innerHeight` — on
          // mobile Chrome/Safari, `window.innerHeight` (current viewport,
          // toolbar visible) and what `vh` units in CSS actually resolve to
          // (GSAP/the browser measure against the toolbar-collapsed height)
          // can differ, and that mismatch was making this end BEFORE the
          // intended point instead of after, shortening the dwell instead of
          // adding one. Proportions of a fixed vh split survive regardless
          // of which "vh" the device is using, since both numerator and
          // denominator are in the same vh units. `end` as a function so it
          // recomputes on resize/refresh instead of baking in a stale value.
          end: () => {
            const totalVh = (IMAGE_FILES.length + 1) * 100 + CLOSING_DWELL_VH;
            const coreVh = (IMAGE_FILES.length + 1) * 100;
            return `+=${container!.getBoundingClientRect().height * (coreVh / totalVh)}`;
          },
          scrub: 1,
          // `scrub: 1` deliberately smooths progressState.value behind the
          // raw scroll position (nice damped feel for the photo-to-photo
          // transitions) — but that smoothing has real inertia: a fast
          // scroll/trackpad flick can carry the actual scroll position past
          // `end` (into the dwell) before progressState.value finishes
          // catching up to maxProgress, so the closing card gets caught
          // mid-`expand` — position/rotation not yet eased to flat — right
          // as SaveTheDate starts peeking in underneath (its release is
          // driven by raw scroll, not by this lagging tween). Snapping the
          // value the instant we cross `end` guarantees the card is already
          // flat/fullscreen for the entire dwell, no matter how fast the
          // user scrolled through it.
          onLeave: () => {
            progressState.value = maxProgress;
          },
        },
      });

      // Second trigger: drives dwellState 0→1 across the dwell stretch, from
      // where the first trigger ENDS (card fully expanded, coreVh into the
      // container) to shortly before the sticky canvas releases. The sticky is
      // window.innerHeight tall, so it detaches when scroll reaches
      // (containerHeight - viewportHeight); we finish the fade a touch earlier
      // via DWELL_FADE_MARGIN_VH so the canvas is already fully on Lino before
      // SaveTheDate slides up underneath. Same getBoundingClientRect-fraction
      // measuring as the first trigger, for the same mobile-vh robustness, and
      // `start`/`end` as functions so they recompute on resize.
      const DWELL_FADE_MARGIN_VH = 15; // finish this much scroll before release
      dwellTween = gsap.to(dwellState, {
        value: 1,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: () => {
            const totalVh = (IMAGE_FILES.length + 1) * 100 + CLOSING_DWELL_VH;
            const coreVh = (IMAGE_FILES.length + 1) * 100;
            const h = container!.getBoundingClientRect().height;
            return `top+=${h * (coreVh / totalVh)} top`;
          },
          end: () => {
            const totalVh = (IMAGE_FILES.length + 1) * 100 + CLOSING_DWELL_VH;
            const h = container!.getBoundingClientRect().height;
            // Release point (container bottom minus one viewport), pulled in by
            // the safety margin, expressed as a fraction of container height.
            const releaseVh = totalVh - 100 - DWELL_FADE_MARGIN_VH;
            return `top+=${h * (releaseVh / totalVh)} top`;
          },
          scrub: 1,
        },
      });

      function animate() {
        updateSpiral(progressState.value);
        composer!.render();
        // Separate render pass for the CSS3D layer (the closing card) —
        // CSS3DRenderer walks the same `scene`/`group` graph but only acts
        // on CSS3DObject entries, ignoring the WebGL meshes.
        cssRenderer!.render(scene, camera);

        animationId = requestAnimationFrame(animate);
      }
      animationId = requestAnimationFrame(animate);

      onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer!.setSize(window.innerWidth, window.innerHeight);
        composer!.setSize(window.innerWidth, window.innerHeight);
        cssRenderer!.setSize(window.innerWidth, window.innerHeight);
        // heroFitZ depends on viewport aspect — recompute so the hero keeps
        // fitting the viewport after a resize/rotation.
        heroFitZ = computeHeroFitZ(
          widths[0],
          window.innerWidth / window.innerHeight,
          CAMERA_FOV
        );
        restingCameraZ = computeRestingCameraZ(
          widths[0],
          window.innerWidth / window.innerHeight,
          CAMERA_FOV
        );
        closingExpandScale = computeClosingExpandScale();
      };
      window.addEventListener("resize", onResize);

      // Unmounted while the scene was being built (rare, but possible if
      // the dimension preload above resolved just as this synchronous tail
      // was running) — tear down immediately instead of leaving a live
      // renderer/ticker/ScrollTrigger dangling.
      if (cancelled) {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", onResize);
        gsap.ticker.remove(tickerCallback);
        scrollTween.kill();
        dwellTween?.kill();
        heroTextTween?.kill();
        ScrollTrigger.getAll().forEach((st) => st.kill());
        lenis.destroy();
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
        if (composer) composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) {
          mount!.removeChild(renderer.domElement);
        }
        if (cssRenderer && cssRenderer.domElement.parentElement === cssMount) {
          cssMount!.removeChild(cssRenderer.domElement);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      if (onResize) window.removeEventListener("resize", onResize);
      if (tickerCallback) gsap.ticker.remove(tickerCallback);
      if (scrollTween) scrollTween.kill();
      if (dwellTween) dwellTween.kill();
      if (heroTextTween) heroTextTween.kill();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (lenis) lenis.destroy();

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      if (composer) composer.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      }
      if (cssRenderer && cssRenderer.domElement.parentElement === cssMount) {
        cssMount.removeChild(cssRenderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height: `${(IMAGE_FILES.length + 1) * 100 + CLOSING_DWELL_VH}vh`,
      }}
    >
      {/* `sticky`, not `fixed`: fixed pins to the viewport for the entire
          page, so once the scroll passes this container's own height the
          canvas would stay glued on top of every section that comes after
          it (SaveTheDate included), blocking it forever. Sticky only pins
          while its parent (`containerRef`, height (N+1)*100vh) is in view —
          it releases naturally the moment scroll passes the container's
          bottom edge, exactly like the hand-off the closing card's white
          crossfade is built for. */}
      <div
        ref={mountRef}
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          // `100%`, NOT `100vw`: on iOS Safari `100vw` resolves against the
          // layout viewport and does not account for the document's actual
          // usable width, so it came out WIDER than the page. That pushed the
          // document into horizontal overflow, and since sibling sections are
          // sized off the containing block (not the overflowed content), they
          // stayed viewport-wide — leaving a pale strip down the right edge
          // once the page was scrolled sideways.
          width: "100%",
          height: "100vh",
          background: "#e4dfd4",
        }}
      />
      {/* CSS3D layer for the closing card — painted above the WebGL canvas
          (later in DOM order, same sticky positioning so it releases in
          lockstep with the canvas above) since it only becomes visible
          right at the end, when nothing else should be in front of it
          anyway. pointerEvents:none by default so it never blocks
          scroll/clicks; the card itself re-enables pointer-events once
          revealed (see `cardEl.style.pointerEvents` in the effect above). */}
      <div
        ref={cssMountRef}
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          // `100%` for the same reason as the WebGL layer above.
          width: "100%",
          height: "100vh",
          marginTop: "-100vh",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {closingCardEl &&
        createPortal(
          <ClosingInvitation portrait={closingPortrait} />,
          closingCardEl
        )}
    </div>
  );
}
