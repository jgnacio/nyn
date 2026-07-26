// The sibling ../bym project pulls category icons from the Material Symbols
// webfont. This site loads no icon font (only Parisienne + Cormorant), so
// icons are inline SVG instead — same approach as UploadPhotos.tsx. They
// inherit `currentColor`, so a category card sets one color and the icon
// follows.
//
// The key comes from `nyn_gift_categories.icon`; unknown keys fall back to
// the gift box rather than rendering nothing, so adding a category from the
// Supabase dashboard can never produce an empty card.

const PATHS: Record<string, React.ReactNode> = {
  bed: (
    <>
      <path d="M3 18v-6.5A2.5 2.5 0 0 1 5.5 9H21v9" />
      <path d="M3 14h18" />
      <path d="M7 9V6.5A1.5 1.5 0 0 1 8.5 5h8A1.5 1.5 0 0 1 18 6.5V9" />
      <path d="M3 18v2M21 18v2" />
    </>
  ),
  kitchen: (
    <>
      <path d="M4 10h13a1 1 0 0 1 1 1v4a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-4a1 1 0 0 1 1-1z" />
      <path d="M18 12h1.8a1.7 1.7 0 0 1 0 3.4H18" />
      <path d="M7 7c0-1 1-1.4 1-2.4M11 7c0-1 1-1.4 1-2.4M15 7c0-1 1-1.4 1-2.4" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 13h18M12 9v11" />
      <path d="M12 9S9.5 4 7.5 4a2 2 0 0 0 0 5M12 9s2.5-5 4.5-5a2 2 0 0 1 0 5" />
    </>
  ),
};

export default function GiftIcon({
  name,
  className = "h-7 w-7",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name] ?? PATHS.gift}
    </svg>
  );
}
