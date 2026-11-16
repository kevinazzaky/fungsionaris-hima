import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { createVotingRecap } from "../src/lib/voting-export";

test("rekap Excel memuat hasil per kandidat dan ringkasan tanpa identitas pemilih", () => {
  const data = {
    election: { id: "e", period: "2026/2027", status: "closed", startsAt: null, endsAt: null, candidates: [
      { id: "a", number: 2, name: "Calon Dua", vision: "", missions: [], programs: [], photo: null, placeholder: false },
      { id: "b", number: 1, name: "=HYPERLINK(\"bad\")", vision: "", missions: [], programs: [], photo: null, placeholder: false },
    ] },
    stats: { total: 226, consumed: 3, ballots: 3, participation: 1.3 },
    results: [{ candidateId: "a", _count: { _all: 3 } }],
    voters: [{ name: "Nama Rahasia", nim: "42430029", voterKey: "private-key" }],
  };
  const wb = XLSX.read(createVotingRecap(data), { type: "buffer" });
  assert.deepEqual(wb.SheetNames, ["Ringkasan", "Hasil kandidat"]);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Hasil kandidat"], { header: 1 });
  assert.deepEqual(rows, [["Nomor urut", "Nama kandidat", "Jumlah suara", "Persentase"], [1, '=HYPERLINK("bad")', 0, 0], [2, "Calon Dua", 3, 1]]);
  assert.equal(wb.Sheets["Hasil kandidat"].B2.t, "s");
  assert.equal(wb.Sheets["Hasil kandidat"].B2.f, undefined);
  assert.doesNotMatch(JSON.stringify(wb.Sheets), /Nama Rahasia|42430029|private-key/);
  assert.throws(() => createVotingRecap({ ...data, election: { ...data.election, status: "scheduled" } }), /penutupan resmi/);
});
