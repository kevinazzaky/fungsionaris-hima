import { DetailHeader } from "@/components/detail/detail-header";
import { ProgramPeriodTabs } from "@/components/detail/program-period-tabs";

import { loadPrograms } from "@/data/programs";

export default async function ProgramKerjaPage() {
  const programs = await loadPrograms();
  return (
    <>
      <DetailHeader
        title="Program Kerja"
        description="Rangkaian program kerja HIMA TI yang berjalan sepanjang periode kepengurusan, dikelola oleh masing-masing divisi."
      />

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <ProgramPeriodTabs programs={programs} />
      </section>
    </>
  );
}
