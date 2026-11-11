import assert from "node:assert/strict";
import test from "node:test";
import { votingActivityLabel } from "../src/domain/voting-activity";

test("riwayat panitia menerjemahkan kode dan jumlah tanpa menampilkan data mentah", () => {
  assert.equal(
    votingActivityLabel("candidate_updated:2"),
    "Profil kandidat nomor 2 diperbarui",
  );
  assert.equal(
    votingActivityLabel("candidate_added:7"),
    "Kandidat nomor 7 ditambahkan",
  );
  assert.equal(
    votingActivityLabel("dpt_imported:10"),
    "10 NIM baru ditambahkan ke daftar pemilih",
  );
  assert.equal(
    votingActivityLabel("dpt_imported:0"),
    "Daftar pemilih diperiksa; tidak ada NIM baru",
  );
  assert.equal(
    votingActivityLabel("draft_created"),
    "Draft periode pemilihan dibuat",
  );
  assert.equal(
    votingActivityLabel("schedule_confirmed_profiles_and_dpt_locked"),
    "Jadwal dikonfirmasi; kandidat dan daftar pemilih dikunci",
  );
  assert.equal(
    votingActivityLabel("election_officially_closed"),
    "Pemilihan ditutup oleh panitia",
  );
  assert.equal(
    votingActivityLabel(
      "test_period_reset_by_operator:user_requested;dummy_ballots_removed=2;rights_restored=2",
    ),
    "Periode uji direset; 2 suara percobaan dihapus dan 2 hak pilih dipulihkan",
  );
  assert.equal(
    votingActivityLabel("unknown:sensitive-value"),
    "Aktivitas administratif tercatat",
  );
});
