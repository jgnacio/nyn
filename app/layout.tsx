import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, Parisienne } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const parisienne = Parisienne({
  variable: "--font-parisienne",
  subsets: ["latin"],
  weight: "400",
});

const SITE_URL = "https://nyn-boda.vercel.app";
const SITE_TITLE = "Ignacio & Nicol";
const SITE_DESCRIPTION =
  "Nos casamos el 24 de octubre de 2026. Te invitamos a acompañarnos en este día tan importante para nosotros.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    locale: "es_UY",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ignacio & Nicol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  // iOS data detectors were turning "23 de Octubre", "Registro Civil" and
  // "Montevideo" into tappable date/address links, each rendered with a
  // dotted underline in the text's own color — it reads as a stray dotted
  // border under every line. Chrome on iOS is WebKit too, so it did the same.
  // Turning detection off is the only way to suppress that underline; it
  // cannot be overridden with CSS.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${parisienne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
