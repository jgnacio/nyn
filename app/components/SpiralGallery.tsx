"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
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
const CAMERA_POSITION = { x: 0, y: 0.8, z: 13 };
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
const HERO_FIT_ZOOM_OUT = 1.15; // >1 pushes the progress-0 camera slightly farther than an exact width-fill, so the hero sits a touch back with a little breathing margin (1 = exact edge-to-edge fill)

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
  curveFactor: number
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
    const yBottom = THREE.MathUtils.lerp(-height / 2, -height / 2 - a * PITCH, curveFactor);
    const yTop = THREE.MathUtils.lerp(height / 2, height / 2 - a * PITCH, curveFactor);
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
  curveFactor = 1
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const uvs: number[] = [];
  const indices: number[] = [];

  const positions = new Float32Array((segments + 1) * 2 * 3);
  computeCurvedPlanePositions(positions, width, height, radius, centerAngle, segments, curveFactor);

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

// --- Hero "photo developing" shader reveal (mesh index 0 only) ---
// A subtle, filmic grade that eases OUT as `uProgress` goes 0 -> 1, in sync
// with the existing camera pull-back / curvature ramp: at progress 0 the
// hero looks like a print pulled early from the developer (slightly
// overexposed, higher contrast, faint chromatic fringing, a touch
// desaturated); by progress 1 it has settled into normal, neutral color.
// Geometry/position logic is completely untouched — this only changes the
// fragment-shading treatment for mesh 0.
const HERO_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HERO_FRAGMENT_SHADER = `
uniform sampler2D uMap;
uniform float uProgress;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  // Subtle chromatic aberration that fades out as uProgress -> 1.
  float aberration = 0.004 * (1.0 - uProgress);
  vec2 dir = vUv - 0.5;
  float r = texture2D(uMap, vUv + dir * aberration).r;
  float g = texture2D(uMap, vUv).g;
  float b = texture2D(uMap, vUv - dir * aberration).b;
  float a = texture2D(uMap, vUv).a;
  vec3 color = vec3(r, g, b);

  // Exposure/contrast: slightly hot and punchy early, neutral by progress 1.
  color = (color - 0.5) * mix(1.25, 1.0, uProgress) + 0.5 + mix(0.12, 0.0, uProgress);
  color = clamp(color, 0.0, 1.0);

  // Desaturation that eases to full color.
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(lum), mix(0.35, 0.0, uProgress));

  gl_FragColor = vec4(color, uOpacity * a);
}
`;

export default function SpiralGallery() {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const container = containerRef.current;
    if (!mount || !container) return;

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
    let composer: EffectComposer | null = null;
    let animationId = 0;
    let lenis: Lenis | null = null;
    let scrollTween: gsap.core.Tween | null = null;
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
      const angularSpans = widths.map((w) => w / RADIUS);

      // Camera Z at progress 0, sized so the flat hero fits the current
      // viewport (see `computeHeroFitZ`). Mutable: recomputed on resize since
      // it depends on the viewport aspect ratio.
      let heroFitZ = computeHeroFitZ(
        widths[0],
        window.innerWidth / window.innerHeight,
        CAMERA_FOV
      );

      // Cumulative, edge-to-edge angular layout: each image's center angle
      // theta_i = (sum of angularSpan_k for k < i) + angularSpan_i / 2.
      const theta: number[] = [];
      let cumulative = 0;
      for (let i = 0; i < angularSpans.length; i++) {
        theta.push(cumulative + angularSpans[i] / 2);
        cumulative += angularSpans[i];
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
      // Warm cream background (matches the page palette) — fills the margins
      // around the width-fit hero and the gaps between spiral panels.
      scene.background = new THREE.Color(0xe8e1d1);
      // Atmospheric depth cue: distant spiral turns dissolve into the exact
      // cream of the background. The hero sits at the origin and the camera
      // stays at distance <= CAMERA_POSITION.z (13) at all scroll positions, so
      // fog.near (20) is comfortably beyond it — the front image is never
      // fogged — while fog.far (52) fully fades the far turns. Fog color MUST
      // match the background so the fade is seamless. MeshBasicMaterial
      // respects fog by default.
      scene.fog = new THREE.Fog(0xe8e1d1, 20, 52);

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

      // Each image starts at opacity 0 and is revealed the moment its own
      // texture finishes loading — no fade/reveal timeline. The camera
      // pull-back that frames the hero is driven purely by scroll (see the
      // camera block in `updateSpiral`).
      IMAGE_FILES.forEach((file, i) => {
        // Final geometry built once, from real dimensions — no
        // placeholder-then-rebuild-on-texture-load, since dimensions are
        // already known from the preload above.
        const geometry = createCurvedPlaneGeometry(widths[i], PLANE_HEIGHT, RADIUS, theta[i]);
        geometries.push(geometry);

        // Mesh 0 (the hero) gets a custom "photo developing" reveal shader;
        // every other mesh keeps the plain MeshBasicMaterial pipeline as-is.
        const material: THREE.MeshBasicMaterial | THREE.ShaderMaterial =
          i === 0
            ? new THREE.ShaderMaterial({
                uniforms: {
                  uMap: { value: null as THREE.Texture | null },
                  uProgress: { value: 0 },
                  uOpacity: { value: 0 },
                },
                vertexShader: HERO_VERTEX_SHADER,
                fragmentShader: HERO_FRAGMENT_SHADER,
                transparent: true,
                side: THREE.DoubleSide,
                // NOT `fog: true`: that flag only auto-wires fogColor/fogNear/
                // fogFar uniforms into three's BUILT-IN materials (their
                // shaders are generated with the fog chunk already included).
                // A custom ShaderMaterial with `fog: true` makes the renderer
                // try to write those uniforms anyway, but our shader never
                // declared them -> "can't access property 'value' of
                // undefined" on `uniforms.fogColor`. The hero always sits at
                // the stage/origin, well inside fog.near (20), so it would
                // never visually fog anyway — safe to leave fog off here.
                fog: false,
                depthWrite: true,
              })
            : new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
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

        // Texture load is independent of dimension preload/geometry build —
        // no cropping: textures map straight 0..1 onto the geometry.
        textureLoader.load(`/images/${file}`, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.push(texture);

          if (material instanceof THREE.ShaderMaterial) {
            material.uniforms.uMap.value = texture;
            // Reveal this image as soon as its texture is ready — same
            // timing as the MeshBasicMaterial path below, just via the
            // uOpacity uniform since ShaderMaterial has no .opacity blend.
            material.uniforms.uOpacity.value = 1;
          } else {
            material.map = texture;
            material.needsUpdate = true;
            // Reveal this image as soon as its texture is ready.
            material.opacity = 1;
          }
        });
      });

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

      const vignette = new VignetteEffect({
        darkness: 0.35, // subtle — the cream palette should still read warm
        offset: 0.35,
      });

      const noise = new NoiseEffect({
        blendFunction: BlendFunction.OVERLAY,
      });
      noise.blendMode.opacity.value = 0.06; // very subtle film grain to kill the "flat CGI" look

      // One EffectPass batches the screen-space effects efficiently.
      composer.addPass(new EffectPass(camera, dof, vignette, noise));

      const progressState = { value: 0 };

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
            widths[i],
            PLANE_HEIGHT,
            RADIUS,
            rotationY,
            24,
            curveFactor
          );
          positionAttr.needsUpdate = true;
        }

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
        camera.position.y = THREE.MathUtils.lerp(0, CAMERA_POSITION.y, camEased);
        camera.position.z = THREE.MathUtils.lerp(
          heroFitZ,
          CAMERA_POSITION.z,
          camEased
        );
        camera.lookAt(CAMERA_LOOK_AT.x, CAMERA_LOOK_AT.y, CAMERA_LOOK_AT.z);

        // Hero shader reveal stays synchronized with the same eased
        // pull-back progress used for the camera — no separate timing curve.
        const heroMaterial = meshes[0]?.material;
        if (heroMaterial instanceof THREE.ShaderMaterial) {
          heroMaterial.uniforms.uProgress.value = camEased;
        }
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

      const maxProgress = IMAGE_FILES.length - 1;

      scrollTween = gsap.to(progressState, {
        value: maxProgress,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      function animate() {
        updateSpiral(progressState.value);
        composer!.render();
        animationId = requestAnimationFrame(animate);
      }
      animationId = requestAnimationFrame(animate);

      onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer!.setSize(window.innerWidth, window.innerHeight);
        composer!.setSize(window.innerWidth, window.innerHeight);
        // heroFitZ depends on viewport aspect — recompute so the hero keeps
        // fitting the viewport after a resize/rotation.
        heroFitZ = computeHeroFitZ(
          widths[0],
          window.innerWidth / window.innerHeight,
          CAMERA_FOV
        );
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
      }
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      if (onResize) window.removeEventListener("resize", onResize);
      if (tickerCallback) gsap.ticker.remove(tickerCallback);
      if (scrollTween) scrollTween.kill();
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
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height: `${IMAGE_FILES.length * 100}vh` }}>
      <div
        ref={mountRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "#e8e1d1",
        }}
      />
    </div>
  );
}
