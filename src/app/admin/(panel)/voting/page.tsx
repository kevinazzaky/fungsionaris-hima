import { redirect } from "next/navigation";
import { getAdmin } from "@/data/auth";
import { votingAdminLockStatus } from "@/lib/voting-admin-lock";
import { VotingManager } from "@/components/admin/voting-manager";
import { VotingPinGate } from "@/components/admin/voting-pin-gate";

export default async function Page() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const lock = await votingAdminLockStatus(admin.id);
  if (lock.state !== "unlocked") {
    return <VotingPinGate state={lock.state} />;
  }
  return <VotingManager initialPinUpdatedAt={lock.pinUpdatedAt} />;
}
