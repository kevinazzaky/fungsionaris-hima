import type { Registration } from "../domain/admin";
import type { RegistrationDocumentData } from "../domain/registration-document";

export function buildRegistrationDocument(
  registration: Registration,
  divisions: readonly { id: string; label: string }[],
): RegistrationDocumentData {
  const experiences = registration.pengalamanOrganisasi
    .split(/;|\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && value !== "-");
  const date = registration.submittedAt;
  const tanggalDaftar =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Makassar",
        })
      : "....................";
  const divisi = registration.divisi
    .split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map(
      (value) =>
        divisions.find(
          (division) =>
            division.id.toLowerCase() === value.toLowerCase() ||
            division.label.toLowerCase() === value.toLowerCase(),
        )?.label || value,
    )
    .join(", ");
  return {
    nama: registration.nama,
    nim: registration.nim,
    tempatTanggalLahir: registration.tempatTanggalLahir,
    jenisKelamin: registration.jenisKelamin,
    alamat: registration.alamat,
    noHp: registration.noHp,
    idLine: registration.idLine,
    pengalaman1: experiences[0],
    pengalaman2: experiences[1],
    pengalaman3: experiences.slice(2).join("; ") || undefined,
    minatSkill: registration.minatSkill,
    alasanBergabung: registration.alasanBergabung,
    divisi,
    alasanDivisi: registration.alasanDivisi,
    tanggalDaftar,
    period: registration.period,
  };
}
