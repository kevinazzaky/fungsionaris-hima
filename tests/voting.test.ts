import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeNim,
  normalizeVoterName,
  filterVoterNameInput,
  parseVoterCsv,
  electionState,
  validateCandidate,
  parseVotingSchedule,
  assertVotingCandidatesReady,
} from "../src/domain/voting";
import {
  voterKey,
  issueVotingToken,
  readVotingToken,
} from "../src/use-cases/voting-token";

test("nama pemilih menerima huruf Unicode, spasi dan titik dengan panjang terbatas", () => {
  assert.equal(normalizeVoterName("  I Made   Dandi  "), "I Made Dandi");
  assert.equal(normalizeVoterName("José"), "José");
  assert.equal(normalizeVoterName("A.A Ngurah Agung"), "A.A Ngurah Agung");
  assert.equal(normalizeVoterName("Cipriana dos Reis de .A.Soares"), "Cipriana dos Reis de .A.Soares");
  for (const value of [null, 123, "", "  ", "..", "A", "A".repeat(101), "Bayu123", "<script>alert(1)</script>", "Robert'); DROP TABLE voters;--", "Bayu\nTrias", "Bayu😀", "Bayu\u200bTrias"])
    assert.throws(() => normalizeVoterName(value));
});

test("kolom nama membuang simbol dari ketikan dan tempelan tanpa merusak nama bertitik atau Unicode", () => {
  for (const [input, expected] of [
    ["A.A Ngurah Agung", "A.A Ngurah Agung"],
    ["Jose\u0301", "Jose\u0301"],
    ["Bayu123@#😀", "Bayu"],
    ["Bayu\n\tTrias\u200b", "BayuTrias"],
    ['SELECT * FROM users WHERE username = " OR 1=1', "SELECT  FROM users WHERE username   OR "],
    ["", ""],
  ]) assert.equal(filterVoterNameInput(input), expected);
});

test("server menolak karakter kontrol di awal atau akhir nama, bukan menyembunyikannya lewat trim", () => {
  for (const name of ["\nBayu", "Bayu\n", "\tBayu", "Bayu\r", "Bayu\u0000", "Bayu\u00a0"])
    assert.throws(() => normalizeVoterName(name));
});

test("NIM tetap string, mempertahankan nol awal dan menolak input ambigu", () => {
  assert.equal(normalizeNim(" 00123456 "), "00123456");
  assert.equal(normalizeNim("42430029"), "42430029");
  for (const value of ["", "1234", "1234567", "123456789", "1234567x", "1e123456", 12345678, "1".repeat(31)])
    assert.throws(() => normalizeNim(value));
});

test("CSV DPT memeriksa periode, prodi, mahasiswa aktif dan duplikat tanpa konversi angka", () => {
  const csv =
    "nim,prodi,aktif,periode\r\n00123456,TI,true,2026/2027\r\n00123456,TI,true,2026/2027\r\n00123457,SI,true,2026/2027\r\n00123458,TI,false,2026/2027\r\n00123459,TI,true,2025/2026\r\n1234567,TI,true,2026/2027\r\n123456789,TI,true,2026/2027";
  const result = parseVoterCsv(csv, "2026/2027");
  assert.deepEqual(result.nims, ["00123456"]);
  assert.equal(result.issues.length, 6);
  assert.throws(() => parseVoterCsv("nim\n000123456", "2026/2027"));
  assert.throws(() =>
    parseVoterCsv('nim,prodi,aktif,periode\n"broken', "2026/2027"),
  );
});

test("CSV nama dan NIM dipasangkan tanpa mengubah nol depan", () => {
  const result = parseVoterCsv("nim,nama,prodi,aktif,periode\n00123456,I Made Dandi,TI,true,2026/2027\n00123457,Bayu123,TI,true,2026/2027", "2026/2027");
  assert.deepEqual(result.voters, [{ nim: "00123456", name: "I Made Dandi" }]);
  assert.equal(result.issues.length, 1);
});

test("batas waktu voting memakai awal inklusif dan akhir eksklusif", () => {
  const e = {
    status: "scheduled",
    startsAt: "2026-11-01T00:00:00Z",
    endsAt: "2026-11-02T00:00:00Z",
  };
  assert.equal(electionState(e, new Date("2026-10-31")), "upcoming");
  assert.equal(electionState(e, new Date(e.startsAt)), "open");
  assert.equal(electionState(e, new Date(e.endsAt)), "ended");
  assert.equal(electionState({ ...e, status: "closed" }), "closed");
  assert.equal(electionState({ ...e, status: "draft" }), "draft");
});

test("kandidat memvalidasi misi dan program kerja terstruktur", () => {
  const input = {
    name: "Kandidat uji",
    vision: "Visi uji",
    missions: ["Misi uji"],
    programs: [
      {
        title: "Program uji",
        description: "Deskripsi",
        target: "Mahasiswa TI",
      },
    ],
  };
  assert.equal(validateCandidate(input).programs[0].target, "Mahasiswa TI");
  assert.deepEqual(
    validateCandidate({ ...input, programs: [{ title: "Judul" }] }).programs,
    [{ title: "Judul", description: "", target: "" }],
  );
  assert.throws(() =>
    validateCandidate({ ...input, programs: [{ title: "" }] }),
  );
  assert.throws(() =>
    validateCandidate({
      ...input,
      programs: [{ title: "Judul", description: 123 }],
    }),
  );
  assert.throws(() => validateCandidate({ ...input, missions: [] }));
  assert.deepEqual(validateCandidate({ ...input, programs: [] }).programs, []);
});

test("jadwal menerima jumlah calon dinamis, tetapi menolak daftar kosong atau profil belum lengkap", () => {
  const candidate = {
    name: "Calon uji",
    vision: "Visi uji",
    missions: ["Misi uji"],
    programs: [
      { title: "Program", description: "Deskripsi", target: "Mahasiswa" },
    ],
    photoPath: "candidates/test.webp",
  };
  assert.doesNotThrow(() => assertVotingCandidatesReady([candidate]));
  assert.doesNotThrow(() =>
    assertVotingCandidatesReady(Array.from({ length: 8 }, () => candidate)),
  );
  assert.throws(() => assertVotingCandidatesReady([]));
  assert.doesNotThrow(() =>
    assertVotingCandidatesReady([{ ...candidate, programs: [] }]),
  );
  assert.throws(() =>
    assertVotingCandidatesReady([{ ...candidate, photoPath: null }]),
  );
  assert.throws(() =>
    assertVotingCandidatesReady([{ ...candidate, missions: [] }]),
  );
});

test("jadwal WITA dikonversi ke UTC dan menolak tanggal overflow atau rentang terbalik", () => {
  const schedule = parseVotingSchedule("2026-11-20T08:00", "2026-11-20T17:00");
  assert.equal(schedule.startsAt.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(schedule.endsAt.toISOString(), "2026-11-20T09:00:00.000Z");
  assert.throws(() =>
    parseVotingSchedule("2026-02-31T08:00", "2026-03-04T08:00"),
  );
  assert.throws(() =>
    parseVotingSchedule("2026-11-20T17:00", "2026-11-20T08:00"),
  );
  assert.throws(() =>
    parseVotingSchedule("2026-11-20T24:01", "2026-11-21T08:00"),
  );
});

test("token hak pilih ditandatangani, terikat periode, kedaluwarsa dan tidak mengandung NIM mentah", () => {
  const secret = "test-only-secret-32-characters-long-123";
  const key = voterKey("000123456", "election-a", secret);
  assert.notEqual(key, voterKey("000123456", "election-b", secret));
  const token = issueVotingToken("election-a", key, secret, 1000);
  assert.equal(readVotingToken(token, secret, 1001).voterKey, key);
  assert.ok(
    !Buffer.from(token.split(".")[0], "base64url")
      .toString()
      .includes("000123456"),
  );
  assert.throws(() => readVotingToken(token + "x", secret, 1001));
  assert.throws(() => readVotingToken(token, secret, 1000 + 15 * 60_000));
  assert.throws(() => readVotingToken(token, "wrong-secret", 1001));
});
