import type { Metadata } from "next";
import { Figtree, Geist_Mono, Playfair_Display, Poppins, Rubik } from "next/font/google";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-script",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500", "600"],
});

const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["800", "900"],
});

const rubik = Rubik({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.himaproditiundiknas.id";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HIMA TI Undiknas - Himpunan Mahasiswa Teknologi Informasi",
    template: "%s | HIMA TI Undiknas",
  },
  description:
    "Portal resmi Himpunan Mahasiswa Program Studi Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali. Informasi program kerja, kepengurusan, galeri, dan pendaftaran fungsionaris.",
  keywords: [
    "HIMA TI Undiknas",
    "Himpunan Mahasiswa Teknologi Informasi",
    "Undiknas Denpasar",
    "Teknologi Informasi Undiknas",
    "HIMA TI",
    "Fungsionaris HIMA TI",
    "Ormawa Undiknas",
    "Universitas Pendidikan Nasional",
    "IT Undiknas",
  ],
  authors: [
    {
      name: "HIMA TI Undiknas",
      url: "https://www.instagram.com/hima_ti_undiknas",
    },
  ],
  creator: "HIMA TI Undiknas",
  publisher: "HIMA TI Undiknas",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HIMA TI Undiknas - Himpunan Mahasiswa Teknologi Informasi",
    description:
      "Portal resmi Himpunan Mahasiswa Program Studi Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali.",
    url: "/",
    siteName: "HIMA TI Undiknas",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/brand/logo-full.png",
        width: 1200,
        height: 630,
        alt: "HIMA TI Undiknas Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HIMA TI Undiknas - Himpunan Mahasiswa Teknologi Informasi",
    description:
      "Portal resmi Himpunan Mahasiswa Program Studi Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali.",
    images: ["/brand/logo-full.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/brand/favicon-square.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/brand/favicon-square.png"],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: "BEaDPHAC7a9H7_OJ4dw07IQWf_wnrVFEIcQix4qIInA",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${figtree.variable} ${geistMono.variable} ${playfairDisplay.variable} ${poppins.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "HIMA TI Undiknas",
              alternateName: [
                "Himpunan Mahasiswa Teknologi Informasi Undiknas",
                "HIMA TI",
              ],
              url: siteUrl,
              logo: `${siteUrl}/brand/logo-full.png`,
              sameAs: [
                "https://www.instagram.com/hima_ti_undiknas",
                "https://www.youtube.com/@himaproditiundiknas",
              ],
              description:
                "Portal resmi Himpunan Mahasiswa Program Studi Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Denpasar",
                addressRegion: "Bali",
                addressCountry: "ID",
              },
            }),
          }}
        />
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
