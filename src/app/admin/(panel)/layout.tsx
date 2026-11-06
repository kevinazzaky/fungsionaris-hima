import { redirect } from "next/navigation";
import { getAdmin } from "@/data/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
