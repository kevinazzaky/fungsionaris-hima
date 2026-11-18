import {
  ProgramsManager,
  type ProgramsManagerTab,
} from "@/components/admin/programs-manager";

export default async function ProgramsPage({
  searchParams,
}: PageProps<"/admin/program-kerja">) {
  const params = await searchParams;
  const tab: ProgramsManagerTab =
    params.tab === "peserta"
      ? "registrations"
      : params.tab === "formulir"
        ? "form-settings"
        : "programs";
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
