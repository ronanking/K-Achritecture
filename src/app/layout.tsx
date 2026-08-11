import type { Metadata, Viewport } from "next";
import { Archivo, DM_Mono, Newsreader } from "next/font/google";
import "./globals.css";

import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GridOverlay } from "@/components/layout/GridOverlay";
import { Cursor } from "@/components/ui/Cursor";
import {
  ArrivalSheet,
  PlateTransitionProvider,
} from "@/components/layout/PlateTransition";
import { site } from "@/lib/site";

/**
 * Three faces, three jobs, and no fourth.
 *
 *   Archivo    — structure. Headings, navigation, anything load-bearing.
 *   Newsreader — argument. The prose that explains a building.
 *   DM Mono    — notation. Numbers, references, metadata; the annotation
 *                voice a drawing uses.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.positioning,
  applicationName: site.name,
  authors: [{ name: site.legalName }],
  keywords: [
    "architect Sunshine Coast",
    "Sunshine Coast architecture",
    "residential architect Queensland",
    "multi-residential architecture",
    "Marcoola architect",
    "K Architecture",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.positioning,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.positioning,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark light",
};

/**
 * Decides — before the first paint — whether this visit gets animation.
 * Elements that are meant to arrive are hidden by CSS only when this flag is
 * set, so a visitor with reduced motion, or without JavaScript, never waits
 * for something that will not happen.
 */
const ANIM_GATE = `try{document.documentElement.dataset.anim=matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on'}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ArchitecturalService",
    name: site.legalName,
    alternateName: site.name,
    description: site.positioning,
    slogan: site.tagline,
    url: site.url,
    email: site.email,
    telephone: site.phone,
    areaServed: "Sunshine Coast, Queensland, Australia",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.line1,
      addressLocality: site.address.suburb,
      addressRegion: site.address.state,
      postalCode: site.address.postcode,
      addressCountry: "AU",
    },
    sameAs: site.social.map((s) => s.href),
  };

  return (
    <html
      lang="en-AU"
      className={`${archivo.variable} ${newsreader.variable} ${dmMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANIM_GATE }} />
      </head>
      <body>
        <SmoothScroll>
          <PlateTransitionProvider>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
            <ArrivalSheet />
            <GridOverlay />
            <Cursor />
          </PlateTransitionProvider>
        </SmoothScroll>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
