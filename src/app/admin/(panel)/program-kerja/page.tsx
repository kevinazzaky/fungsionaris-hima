import { ProgramsManager } from "@/components/admin/programs-manager";

export default async function ProgramsPage({
  searchParams,
}: PageProps<"/admin/program-kerja">) {
  const params = await searchParams;
  const tab = params.tab === "peserta" ? "registrations" : "programs";
  const programId =
    typeof params.programId === "string" ? params.programId : "";
  return (
    <ProgramsManager
      key={`${tab}:${programId}`}
      initialTab={tab}
      initialProgramId={programId}
    />
  );
}
