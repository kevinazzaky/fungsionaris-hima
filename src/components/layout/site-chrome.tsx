"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { RegistrationFloatingCta } from "@/components/ui/registration-floating-cta";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return <><Navbar /><main className="flex flex-1 flex-col">{children}</main><Footer /><RegistrationFloatingCta /></>;
}
