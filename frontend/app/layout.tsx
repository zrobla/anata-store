import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { TopProgressBar } from "@/components/top-progress-bar";
import { WhatsAppCta } from "@/components/whatsapp-cta";
import { Providers } from "@/app/providers";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import {
  STORE_ADDRESS_FULL,
  STORE_ADDRESS_SHORT,
  STORE_CITY,
  STORE_COUNTRY,
  STORE_MAP_URL,
  STORE_NAME,
  STORE_REGION,
  STORE_SLOGAN
} from "@/lib/store-info";
import "@/app/globals.css";

const manrope = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-manrope" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const siteUrl = getSiteUrl();
const SITE_NAME = STORE_NAME;
const SITE_SLOGAN = STORE_SLOGAN;
const SITE_DESCRIPTION =
  `${STORE_NAME}, boutique en ligne premium et boutique physique au ${STORE_ADDRESS_SHORT}. Smartphones, tablettes, montres et accessoires avec livraison rapide en Cote d'Ivoire.`;
const SITE_TITLE = `${SITE_NAME} | ${SITE_SLOGAN}`;
const STORE_PHONE = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D+/g, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [
      { url: "/favicon.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.jpg"]
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/anata-store-logo-1.png"),
        width: 1200,
        height: 630,
        alt: SITE_NAME
      }
    ],
    locale: "fr_CI"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/anata-store-logo-1.png")]
  },
  robots: {
    index: true,
    follow: true
  }
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: siteUrl,
  logo: absoluteUrl("/anata-store-logo-1.png"),
  description: SITE_DESCRIPTION,
  slogan: SITE_SLOGAN
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/s?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: SITE_NAME,
  image: absoluteUrl("/anata-store-logo-1.png"),
  url: siteUrl,
  description: SITE_DESCRIPTION,
  telephone: STORE_PHONE ? `+${STORE_PHONE}` : undefined,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE_ADDRESS_FULL,
    addressLocality: STORE_CITY,
    addressRegion: STORE_REGION,
    addressCountry: STORE_COUNTRY
  },
  areaServed: STORE_COUNTRY,
  contactPoint: STORE_PHONE
    ? [
        {
          "@type": "ContactPoint",
          telephone: `+${STORE_PHONE}`,
          contactType: "customer support",
          areaServed: STORE_COUNTRY,
          availableLanguage: ["fr"]
        }
      ]
    : undefined,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:30",
      closes: "19:00"
    }
  ],
  sameAs: [STORE_MAP_URL]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${space.variable}`}>
      <body className="font-body font-medium text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <Providers>
          <TopProgressBar />
          <Header />
          <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-6">{children}</main>
          <Footer />
          <WhatsAppCta />
        </Providers>
      </body>
    </html>
  );
}
