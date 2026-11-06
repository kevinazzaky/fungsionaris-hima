"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/admin/actions";

const links = [
  ["/admin", "Pendaftar"],
  ["/admin/fungsionaris", "Fungsionaris"],
  ["/admin/galeri", "Galeri"],
  ["/admin/program-kerja", "Program kerja"],
  ["/admin/akun", "Akun admin"],
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const desktopSidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeMenu = () => mobileMenu.current?.close();

  useEffect(() => {
    mobileMenu.current?.close();
  }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1100px)");
    const handleChange = () => {
      if (desktop.matches) mobileMenu.current?.close();
    };
    desktop.addEventListener("change", handleChange);
    return () => desktop.removeEventListener("change", handleChange);
  }, []);
  return (
    <div className="admin-shell">
      <a className="admin-skip" href="#admin-content">
        Langsung ke isi halaman
      </a>
      <header className="admin-mobile-bar">
        <Link href="/admin" className="admin-mobile-brand">
          <strong>
            HIMA TI <span>Undiknas</span>
          </strong>
          <span>Ruang pengelola</span>
        </Link>
        <button
          ref={menuButton}
          className="admin-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-navigation"
          onClick={() => {
            mobileMenu.current?.showModal();
            setMenuOpen(true);
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </button>
      </header>
      <aside
        ref={desktopSidebar}
        className="admin-sidebar admin-desktop-sidebar"
      >
        <AdminNavigation email={email} pathname={pathname} />
      </aside>
      <dialog
        ref={mobileMenu}
        id="admin-mobile-navigation"
        className="admin-mobile-menu"
        aria-labelledby="admin-mobile-menu-title"
        onClose={() => {
          setMenuOpen(false);
          if (window.matchMedia("(min-width: 1100px)").matches)
            desktopSidebar.current
              ?.querySelector<HTMLAnchorElement>('[aria-current="page"]')
              ?.focus();
          else menuButton.current?.focus();
        }}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.target === event.currentTarget &&
            (event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom)
          )
            closeMenu();
        }}
      >
        <div className="admin-sidebar">
          <div className="admin-mobile-menu-header">
            <h2 id="admin-mobile-menu-title">Menu admin</h2>
            <button type="button" className="admin-button" onClick={closeMenu}>
              Tutup
            </button>
          </div>
          <AdminNavigation
            email={email}
            pathname={pathname}
            onNavigate={closeMenu}
          />
        </div>
      </dialog>
      <main id="admin-content" className="admin-main">
        {children}
      </main>
    </div>
  );
}

function AdminNavigation({
  email,
  pathname,
  onNavigate,
}: {
  email: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link href="/admin" className="admin-brand" onClick={onNavigate}>
        <strong>
          HIMA TI<span>Undiknas</span>
        </strong>
        <span>Ruang pengelola</span>
      </Link>
      <nav aria-label="Menu admin">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={onNavigate}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="admin-account">
        <p>{email}</p>
        <form action={logout}>
          <button className="admin-button" type="submit">
            Keluar akun
          </button>
        </form>
        <Link className="admin-site-link" href="/" onClick={onNavigate}>
          Buka website publik
        </Link>
      </div>
    </>
  );
}
