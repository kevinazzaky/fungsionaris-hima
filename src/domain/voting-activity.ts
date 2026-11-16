export function votingActivityLabel(action: string): string {
  const labels: Record<string, string> = {
    draft_created: "Draft periode pemilihan dibuat",
    public_period_activated: "Periode dijadikan aktif di halaman publik",
    candidates_replaced_from_sheet:
      "Daftar kandidat diganti dari spreadsheet panitia",
    candidate_removed_and_numbers_reordered:
      "Kandidat dihapus dan nomor urut kandidat yang tersisa dirapikan",
    schedule_confirmed_profiles_and_dpt_locked:
      "Jadwal dikonfirmasi; kandidat dan daftar pemilih dikunci",
    election_officially_closed: "Pemilihan ditutup oleh panitia",
  };
  if (Object.hasOwn(labels, action)) return labels[action];
  const candidate = /^candidate_(updated|added):(\d+)$/.exec(action);
  if (candidate)
    return candidate[1] === "updated"
      ? `Profil kandidat nomor ${candidate[2]} diperbarui`
      : `Kandidat nomor ${candidate[2]} ditambahkan`;
  const imported = /^dpt_imported:(\d+)$/.exec(action);
  if (imported)
    return imported[1] === "0"
      ? "Daftar pemilih diperiksa; tidak ada NIM baru"
      : `${imported[1]} NIM baru ditambahkan ke daftar pemilih`;
  const reset =
    /^test_period_reset_by_operator:user_requested;dummy_ballots_removed=(\d+);rights_restored=(\d+)$/.exec(
      action,
    );
  if (reset)
    return `Periode uji direset; ${reset[1]} suara percobaan dihapus dan ${reset[2]} hak pilih dipulihkan`;
  return "Aktivitas administratif tercatat";
}
