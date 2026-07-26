// Shared typographic tokens for the "Ignacio & Nicol" wordmark, which is
// rendered TWICE in two completely different pipelines: as DOM text in
// SplashScreen.tsx, and painted into a 2D canvas texture for the in-scene hero
// title in SpiralGallery.tsx. The splash dissolves straight into that hero, so
// any drift between the two reads as the title jumping at the handoff.
//
// This lives in its own module rather than in SpiralGallery.tsx so the splash
// does not have to pull in the three.js/postprocessing chunk just to read a
// couple of constants — a splash screen that waits on the 3D bundle before it
// can paint has defeated its own purpose.

export const HERO_TITLE = "Ignacio & Nicol";
export const HERO_VERSE = "Eclesiastés 4:12";

// Typeface pairing, mirroring the Footer's closing "Ignacio & Nicol": the name
// is set in the Parisienne script, the verse in Cormorant italic. NOT a
// grotesk — the canvas title was retuned to the script face, and the splash
// follows it.
export const HERO_TITLE_FONT_VAR = "--font-parisienne";
export const HERO_VERSE_FONT_VAR = "--font-cormorant";

// Canvas-texture metrics, in texture pixels. The canvas is oversampled (large
// absolute sizes) so the hero plane stays crisp at any viewport size; the mesh
// is scaled to world units separately.
export const HT_PAD = 40;
export const HT_TITLE_SIZE = 120;
export const HT_TITLE_TRACK = 0;
export const HT_VERSE_SIZE = 38;
export const HT_VERSE_TRACK = 12;
export const HT_RULE_GAP = 34; // vertical gap title-baseline → rule
export const HT_VERSE_GAP = 44; // vertical gap rule → verse baseline

// The same tracking as a font-size ratio, for the DOM rendering. Canvas
// tracking is absolute pixels against a fixed font size; `em` is the CSS
// equivalent, so deriving it here keeps the two renderings in lockstep instead
// of hardcoding a number that silently drifts.
export const HERO_TITLE_TRACK_EM = HT_TITLE_TRACK / HT_TITLE_SIZE;
export const HERO_VERSE_TRACK_EM = HT_VERSE_TRACK / HT_VERSE_SIZE;
