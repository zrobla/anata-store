import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { WhatsAppCta } from "@/components/whatsapp-cta";
import { Providers } from "@/app/providers";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import "@/app/globals.css";

const manrope = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-manrope" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Anata Store | Smartphones premium",
    template: "%s | Anata Store"
  },
  description: "E-commerce smartphones premium, COD uniquement, livraison rapide CI.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Anata Store",
    title: "Anata Store | Smartphones premium",
    description: "E-commerce smartphones premium, COD uniquement, livraison rapide CI.",
    images: [
      {
        url: absoluteUrl("/anata-store-logo-1.png"),
        width: 1200,
        height: 630,
        alt: "Anata Store"
      }
    ],
    locale: "fr_CI"
  },
  twitter: {
    card: "summary_large_image",
    title: "Anata Store | Smartphones premium",
    description: "E-commerce smartphones premium, COD uniquement, livraison rapide CI.",
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
  name: "Anata Store",
  url: siteUrl,
  logo: absoluteUrl("/anata-store-logo-1.png")
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Anata Store",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/s?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
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
        <Providers>
          <Header />
          <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-6">{children}</main>
          <Footer />
          <WhatsAppCta />
        </Providers>
      </body>
    </html>
  );
}
