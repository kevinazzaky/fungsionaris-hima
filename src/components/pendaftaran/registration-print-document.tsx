"use client";

import Image from "next/image";

export interface RegistrationDocumentData {
  nama: string;
  nim: string;
  tempatTanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  noHp: string;
  idLine: string;
  pengalaman1?: string;
  pengalaman2?: string;
  pengalaman3?: string;
  minatSkill: string;
  alasanBergabung: string;
  divisi: string;
  alasanDivisi: string;
  fotoUrl?: string;
  tanggalDaftar?: string;
}

interface RegistrationPrintDocumentProps {
  data: RegistrationDocumentData;
}

export function RegistrationPrintDocument({
  data,
}: RegistrationPrintDocumentProps) {
  const tanggal =
    data.tanggalDaftar ||
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div
      id="printable-registration-document"
      className="print-document font-serif text-zinc-900 leading-normal"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          LEMBAR 1: FORMULIR PENDAFTARAN
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="print-page relative min-h-[1050px] bg-white p-8 sm:p-12 print:p-0 print:min-h-0 print-page-break">
        {/* Kop Surat */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-zinc-900 pb-2">
          <div className="relative h-20 w-16 shrink-0 sm:h-24 sm:w-20">
            <Image
              src="/brand/himati-doc-logo.png"
              alt="Logo HIMA TI"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="flex-1 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 sm:text-sm">
              Universitas Pendidikan Nasional (Undiknas) Denpasar
            </h3>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 sm:text-sm">
              Pemerintahan Mahasiswa
            </h4>
            <h2 className="text-sm font-black uppercase tracking-tight text-zinc-950 sm:text-base">
              Himpunan Mahasiswa Program Studi Teknologi Informasi (HIMAPRODI
              TI)
            </h2>
            <p className="mt-1 text-[10px] text-zinc-600 sm:text-[11px] leading-tight">
              Jl. Bedugul No. 39 Sidakarya, Denpasar, Bali | Telp:
              0815-2950-0457
            </p>
            <p className="text-[10px] text-zinc-600 sm:text-[11px] leading-tight">
              Website: himaproditiundiknas.id | E-mail:
              himaprodi.ti.undiknas@gmail.com
            </p>
          </div>

          <div className="relative h-20 w-16 shrink-0 sm:h-24 sm:w-20">
            <Image
              src="/brand/undiknas-logo.png"
              alt="Logo Undiknas"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        {/* Double border line for formal Kop */}
        <div className="mt-0.5 border-b border-zinc-900 pb-0.5" />

        {/* Title */}
        <div className="my-4 text-center">
          <h1 className="text-base font-bold uppercase underline tracking-wider sm:text-lg">
            Formulir Pendaftaran
          </h1>
        </div>

        {/* Foto Box & Main Identity */}
        <div className="relative">
          {/* Kotak Pas Foto 3 x 4 */}
          <div className="absolute right-0 top-0 flex h-32 w-24 overflow-hidden border border-zinc-400 bg-zinc-50 text-[10px] font-semibold text-zinc-500 print:border-zinc-400">
            {data.fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.fotoUrl}
                alt="Pas Foto 3x4"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-zinc-400">
                <span>Pas Foto</span>
                <span className="font-bold">3 x 4</span>
              </div>
            )}
          </div>

          {/* Identity Fields */}
          <div className="pr-28 space-y-1.5 text-xs sm:text-[13px]">
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">Nama</span>
              <span>:</span>
              <span className="font-medium">{data.nama || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">NIM</span>
              <span>:</span>
              <span className="font-medium">{data.nim || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">Tempat, Tanggal Lahir</span>
              <span>:</span>
              <span>{data.tempatTanggalLahir || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">Jenis Kelamin</span>
              <span>:</span>
              <span>{data.jenisKelamin || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">Alamat</span>
              <span>:</span>
              <span className="break-words">{data.alamat || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">No. HP / WhatsApp</span>
              <span>:</span>
              <span>{data.noHp || "-"}</span>
            </div>
            <div className="grid grid-cols-[150px_10px_1fr]">
              <span className="font-semibold">ID Line</span>
              <span>:</span>
              <span>{data.idLine || "-"}</span>
            </div>
          </div>
        </div>

        {/* Extended Questionnaire */}
        <div className="mt-3 space-y-2.5 text-xs sm:text-[13px]">
          <div>
            <span className="font-semibold">Pengalaman Berorganisasi :</span>
            <ol className="mt-0.5 list-decimal pl-5 space-y-0.5 text-zinc-800">
              <li>{data.pengalaman1 || "-"}</li>
              <li>{data.pengalaman2 || "-"}</li>
              <li>{data.pengalaman3 || "-"}</li>
            </ol>
            <p className="text-[10px] italic text-zinc-500 mt-0.5">
              *tidak harus memiliki pengalaman berorganisasi
            </p>
          </div>

          <div>
            <span className="font-semibold">Minat dan skill :</span>
            <p className="mt-0.5 rounded border border-zinc-200 bg-zinc-50/50 p-2 text-zinc-800 leading-relaxed min-h-[38px] whitespace-pre-wrap print:border-zinc-300">
              {data.minatSkill || "-"}
            </p>
          </div>

          <div>
            <span className="font-semibold">
              Alasan bergabung dengan Himpunan Mahasiswa Program Studi Teknologi
              Informasi UNDIKNAS Denpasar :
            </span>
            <p className="mt-0.5 rounded border border-zinc-200 bg-zinc-50/50 p-2 text-zinc-800 leading-relaxed min-h-[38px] whitespace-pre-wrap print:border-zinc-300">
              {data.alasanBergabung || "-"}
            </p>
          </div>

          <div>
            <span className="font-semibold">Divisi yang diminati :</span>{" "}
            <span className="font-medium underline">{data.divisi || "-"}</span>
            <p className="text-[10px] italic text-zinc-500">
              (boleh memilih lebih dari 1, contoh: Sekretaris, PSDM, dan
              Kominfo)
            </p>
          </div>

          <div>
            <span className="font-semibold">
              Alasan memilih divisi tersebut :
            </span>
            <p className="mt-0.5 rounded border border-zinc-200 bg-zinc-50/50 p-2 text-zinc-800 leading-relaxed min-h-[38px] whitespace-pre-wrap print:border-zinc-300">
              {data.alasanDivisi || "-"}
            </p>
          </div>
        </div>

        {/* Statement of Commitment */}
        <div className="mt-3">
          <p className="text-justify text-[11px] sm:text-xs leading-relaxed text-zinc-800">
            Dengan ini, saya menyatakan berminat sepenuh hati untuk menjadi
            fungsionaris Himpunan Mahasiswa Program Studi Teknologi Informasi
            2026 dan bersedia memenuhi segala bentuk tugas & tanggung jawab
            dalam fungsionaris Himpunan Mahasiswa Program Studi Teknologi
            Informasi UNDIKNAS Denpasar. Serta, saya berkomitmen untuk tidak
            mengundurkan diri dari organisasi ini setelah resmi diterima sebagai
            anggota fungsionaris, termasuk ketika sudah mulai mengikuti program
            kerja atau kegiatan yang telah/akan dijalankan oleh Himpunan
            Mahasiswa Program Studi Teknologi Informasi. Dengan ini, saya
            menyatakan bersedia menjalankan tugas dan tanggung jawab sebagai
            anggota fungsionaris hingga masa kepengurusan berakhir.
          </p>
        </div>

        {/* Signature Box */}
        <div className="mt-4 flex justify-end">
          <div className="text-center text-xs sm:text-[13px] w-48">
            <p>Denpasar, {tanggal}</p>
            <p className="mt-1">Hormat Saya,</p>
            <div className="h-16 w-full" />
            <p className="font-bold underline">
              {data.nama || "...................................."}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          LEMBAR 2: SURAT PERNYATAAN
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="print-page relative min-h-[1050px] bg-white p-8 sm:p-12 print:p-0 print:min-h-0">
        {/* Kop Surat */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-zinc-900 pb-2">
          <div className="relative h-20 w-16 shrink-0 sm:h-24 sm:w-20">
            <Image
              src="/brand/himati-doc-logo.png"
              alt="Logo HIMA TI"
              fill
              className="object-contain"
              priority
            />
          </div>

          <div className="flex-1 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 sm:text-sm">
              Universitas Pendidikan Nasional (Undiknas) Denpasar
            </h3>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 sm:text-sm">
              Pemerintahan Mahasiswa
            </h4>
            <h2 className="text-sm font-black uppercase tracking-tight text-zinc-950 sm:text-base">
              Himpunan Mahasiswa Program Studi Teknologi Informasi (HIMAPRODI
              TI)
            </h2>
            <p className="mt-1 text-[10px] text-zinc-600 sm:text-[11px] leading-tight">
              Jl. Bedugul No. 39 Sidakarya, Denpasar, Bali | Telp:
              0815-2950-0457
            </p>
            <p className="text-[10px] text-zinc-600 sm:text-[11px] leading-tight">
              Website: himaproditiundiknas.id | E-mail:
              himaprodi.ti.undiknas@gmail.com
            </p>
          </div>

          <div className="relative h-20 w-16 shrink-0 sm:h-24 sm:w-20">
            <Image
              src="/brand/undiknas-logo.png"
              alt="Logo Undiknas"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="mt-0.5 border-b border-zinc-900 pb-0.5" />

        {/* Title */}
        <div className="my-6 text-center">
          <h1 className="text-base font-bold uppercase underline tracking-wider sm:text-lg">
            Surat Pernyataan
          </h1>
        </div>

        {/* Intro */}
        <div className="space-y-2 text-xs sm:text-sm">
          <p className="font-semibold">Yang bertanda tangan di bawah ini:</p>

          <div className="pl-4 space-y-1.5">
            <div className="grid grid-cols-[160px_10px_1fr]">
              <span className="font-medium">Nama</span>
              <span>:</span>
              <span className="font-bold">{data.nama || "-"}</span>
            </div>
            <div className="grid grid-cols-[160px_10px_1fr]">
              <span className="font-medium">Tempat/Tanggal Lahir</span>
              <span>:</span>
              <span>{data.tempatTanggalLahir || "-"}</span>
            </div>
            <div className="grid grid-cols-[160px_10px_1fr]">
              <span className="font-medium">Jenis Kelamin</span>
              <span>:</span>
              <span>{data.jenisKelamin || "-"}</span>
            </div>
            <div className="grid grid-cols-[160px_10px_1fr]">
              <span className="font-medium">Alamat</span>
              <span>:</span>
              <span className="break-words">{data.alamat || "-"}</span>
            </div>
          </div>
        </div>

        {/* Declaration Statement */}
        <div className="mt-6 space-y-3 text-xs sm:text-sm">
          <p className="font-semibold">Dengan ini, Saya menyatakan:</p>

          <ol className="list-decimal pl-6 space-y-2.5 text-justify leading-relaxed text-zinc-850">
            <li>
              Saya bersedia mengikuti seluruh kegiatan dan program kerja yang
              dilaksanakan oleh Himpunan Mahasiswa Program Studi Teknologi
              Informasi UNDIKNAS Denpasar.
            </li>
            <li>
              Saya bersedia mentaati aturan yang berlaku di dalam organisasi
              Himpunan Mahasiswa Program Studi Teknologi Informasi UNDIKNAS
              Denpasar.
            </li>
            <li>
              Bersedia menjaga sikap terhadap sesama fungsionaris organisasi
              maupun antar organisasi lain di UNDIKNAS Denpasar.
            </li>
            <li>Menjaga nama baik diri sendiri, organisasi, dan Almamater.</li>
            <li>
              Bersedia membantu dan berpartisipasi atas segala hal yang
              berkaitan dengan Program Studi Teknologi Informasi.
            </li>
          </ol>
        </div>

        {/* Signature Box */}
        <div className="mt-12 flex justify-end">
          <div className="text-center text-xs sm:text-sm w-48">
            <p>Denpasar, {tanggal}</p>
            <p className="mt-1">Hormat Saya,</p>
            <div className="h-20 w-full" />
            <p className="font-bold underline">
              {data.nama || "...................................."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
