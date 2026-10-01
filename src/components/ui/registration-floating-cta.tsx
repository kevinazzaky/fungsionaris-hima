"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Megaphone, X } from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { REGISTRATION_CONFIG } from "@/lib/pendaftaran-config";

export function RegistrationFloatingCta() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const reappearTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (REGISTRATION_CONFIG.isOpen && pathname !== "/pendaftaran") {
      // Munculkan pertama kali dengan delay halus setelah halaman loading
      const initialTimer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);

      return () => clearTimeout(initialTimer);
    }
  }, [pathname]);

  // Bersihkan timer kemunculan ulang saat unmount
  useEffect(() => {
    return () => {
      if (reappearTimerRef.current) {
        clearTimeout(reappearTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Sembunyikan badge
    setIsVisible(false);

    // Hapus timer sebelumnya jika ada
    if (reappearTimerRef.current) {
      clearTimeout(reappearTimerRef.current);
    }

    // Munculkan kembali 5 detik kemudian
    reappearTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 5000);
  };

  // Jangan tampilkan jika:
  // 1. Pendaftaran sedang ditutup
  // 2. User sedang berada di halaman /pendaftaran
  if (!REGISTRATION_CONFIG.isOpen || pathname === "/pendaftaran") {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="fixed bottom-5 right-4 z-40 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6 sm:max-w-md no-print"
        >
          <div className="relative flex items-center gap-3.5 rounded-2xl border border-amber-400/40 bg-zinc-950/95 p-3.5 pl-4 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.8),0_0_24px_-4px_rgba(251,191,36,0.25)] backdrop-blur-md transition-all hover:border-amber-400/70 hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.9),0_0_32px_-4px_rgba(251,191,36,0.35)]">
            {/* Tombol Tutup (Dismiss) */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Tutup pengumuman pendaftaran"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-zinc-400 shadow-md transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <X size={12} weight="bold" />
            </button>

            {/* Glowing Icon Beacon */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-zinc-950 shadow-md">
              <Megaphone size={20} weight="fill" />
              {/* Pulsing online beacon dot */}
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-zinc-950 bg-emerald-500" />
              </span>
            </div>

            {/* Konten Teks & Link */}
            <Link
              href="/pendaftaran"
              className="group flex flex-1 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg pr-1"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Oprec Fungsionaris
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Buka
                  </span>
                </div>
                <p className="font-heading text-xs sm:text-sm font-bold text-white transition-colors group-hover:text-amber-300">
                  Daftar HIMA TI 2026
                </p>
              </div>

              {/* Action Pill */}
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow transition-all duration-200 group-hover:bg-amber-300 group-hover:shadow-[0_0_16px_rgba(251,191,36,0.6)]">
                <span>Daftar</span>
                <ArrowRight
                  size={13}
                  weight="bold"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
