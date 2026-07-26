import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { BLUE, GOLD, CREAM } from "./ClosingInvitation";

export type ButtonVariant = "outline" | "solid" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Darker companion shade of GOLD, used only for the solid variant's gradient
// depth (not exported — this is a Button-internal rendering detail, not a
// site palette color).
const GOLD_DEEP = "#8f6f3f";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-6 py-2.5 text-[1.05rem]",
  md: "px-9 py-3.5 text-[1.15rem]",
  lg: "px-11 py-4.5 text-[1.35rem]",
};

// Pill shape + soft depth by default across every variant — the previous
// version was a flat bordered rectangle with a single hover-swap; this reads
// as a considered, modern control instead of a plain HTML link with a border.
const BASE_CLASSES =
  "group relative inline-flex items-center gap-2 justify-center overflow-hidden rounded-full font-[family-name:var(--font-cormorant)] italic tracking-wide transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

// Every variant is built from the same three palette colors (GOLD, CREAM,
// BLUE) so "solid"/"outline"/"ghost" read as one family — just different
// weights of the same accent — rather than three unrelated button designs.
function variantClasses(variant: ButtonVariant): string {
  switch (variant) {
    case "solid":
      return "border shadow-[0_6px_20px_-6px_rgba(176,141,87,0.55)] hover:shadow-[0_12px_30px_-8px_rgba(176,141,87,0.7)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_12px_-6px_rgba(176,141,87,0.5)] focus-visible:ring-[color:var(--accent)]";
    case "outline":
      return "border backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[color:var(--accent)]";
    case "ghost":
      return "border border-transparent hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-[color:var(--accent-strong)]";
  }
}

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "solid":
      return {
        backgroundImage: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
        borderColor: GOLD,
        color: CREAM,
      };
    case "outline":
      return { backgroundColor: "transparent", borderColor: GOLD, color: GOLD };
    case "ghost":
      return { backgroundColor: "transparent", color: BLUE };
  }
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
  };

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsLink | ButtonAsButton;

// The hover fill layer, one per variant:
//  - solid: a lighter gradient sweep fades in on top, giving the gradient a
//    subtle "shine" shift instead of a flat color swap.
//  - outline: fills solid gold behind the label, same idea as before.
//  - ghost: a soft, low-opacity gold pill fades in — replaces the old plain
//    underline with a rounded tinted fill, matching the pill shape.
function HoverLayer({ variant }: { variant: ButtonVariant }) {
  if (variant === "ghost") {
    return (
      <span
        aria-hidden
        className="absolute inset-0 -z-10 scale-90 rounded-full opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
        style={{ backgroundColor: `${GOLD}1F` }}
      />
    );
  }
  if (variant === "solid") {
    return (
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
        style={{ backgroundImage: `linear-gradient(135deg, ${GOLD_DEEP} 0%, ${GOLD} 100%)` }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
      style={{ backgroundColor: GOLD }}
    />
  );
}

function labelHoverClass(variant: ButtonVariant): string {
  switch (variant) {
    case "solid":
      return "";
    case "outline":
      return "group-hover:text-[var(--background)]";
    case "ghost":
      return "group-hover:text-[color:var(--accent)]";
  }
}

// Small arrow that slides out on hover — a modern CTA cue layered on top of
// the vintage italic label rather than replacing it. Needs the SAME
// hover-color class as the label (labelHoverClass) — it's a separate <span>,
// so without it the arrow stayed the variant's resting color (e.g. gold)
// while the label text next to it switched to the hover color, an
// inconsistent two-tone hover.
function Arrow({ variant }: { variant: ButtonVariant }) {
  return (
    <span
      aria-hidden
      className={[
        "inline-block w-0 max-w-0 -translate-x-1 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover:w-[1em] group-hover:max-w-[1em] group-hover:translate-x-0 group-hover:opacity-100",
        labelHoverClass(variant),
      ].join(" ")}
    >
      →
    </span>
  );
}

// Vintage wedding-invite label, modern pill shape: soft shadows/lift on
// hover, a gradient-sheened solid variant, a tinted-fill ghost, and a small
// sliding arrow — considered as a set instead of a single flat bordered box.
export default function Button(props: ButtonProps) {
  const { variant = "outline", size = "md", className, style: styleOverride, children, ...rest } = props;
  const classes = [BASE_CLASSES, SIZE_CLASSES[size], variantClasses(variant), className ?? ""]
    .filter(Boolean)
    .join(" ");
  // Merged, not just the variant's own style: callers that need a solid
  // backdrop behind an "outline"/"ghost" button (which default to a
  // transparent background) can pass `style={{ backgroundColor: ... }}`
  // directly instead of wrapping Button in a separate backdrop element. A
  // wrapper approach was tried for the "Ver fotos" button and kept breaking
  // in new ways (corner-radius mismatch, a phantom gap from inline layout,
  // then the hover lift transform applying twice — once on the wrapper, once
  // on Button — and drifting the two apart again). Overriding the color
  // in-place on the SAME element Button renders removes that whole class of
  // bug: there's only ever one box, one border-radius, one hover transform.
  const style = { ...variantStyle(variant), ...styleOverride };
  const labelClass = ["relative transition-colors duration-300 ease-out", labelHoverClass(variant)]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <HoverLayer variant={variant} />
      <span className={labelClass}>{children}</span>
      <Arrow variant={variant} />
    </>
  );

  if (typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} style={style} {...anchorRest}>
        {inner}
      </Link>
    );
  }

  // `type="button"` by default: a <button> with no type is `type="submit"`,
  // so the moment one of these ends up inside a <form> it submits the page and
  // the onClick handler's work is lost to a reload. Placed BEFORE the spread so
  // a caller can still pass an explicit type.
  return (
    <button type="button" className={classes} style={style} {...(rest as ButtonAsButton)}>
      {inner}
    </button>
  );
}
