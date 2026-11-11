import { PendingLabel } from "@/components/ui/pending-label";

export default function Loading() {
  return (
    <div className="route-loading" role="status">
      <PendingLabel pending text="Memuat halaman admin…" />
    </div>
  );
}
