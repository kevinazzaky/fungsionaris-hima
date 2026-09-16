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

export const metadata: Metadata = {
  title: "HIMA TI Undiknas - Himpunan Mahasiswa Teknologi Informasi",
  description:
    "Portal resmi Himpunan Mahasiswa Program Studi Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali.",
  icons: {
    icon: [
      { url: "/brand/logo-emblem.png", type: "image/png" },
    ],
    shortcut: ["/brand/logo-emblem.png"],
    apple: [
      { url: "/brand/logo-emblem.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${figtree.variable} ${geistMono.variable} ${playfairDisplay.variable} ${poppins.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
