import { redirect } from "next/navigation";

export default function HeroPage() {
  redirect("/admin/galeri?tab=hero");
}
