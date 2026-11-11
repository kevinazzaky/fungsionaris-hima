import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VotingPage, candidatesWithProfileFirst } from "../src/components/voting/voting-page";

test("profil aktif berada paling atas tanpa mengubah nomor atau urutan kandidat lain", () => {
  const candidates = [1, 2, 3].map((number) => ({
    id: `candidate-${number}`, number, name: `Kandidat ${number}`,
    vision: "Visi", missions: [], programs: [], photo: null, placeholder: false,
  }));
  assert.deepEqual(candidatesWithProfileFirst(candidates, "candidate-2").map(c => c.number), [2, 1, 3]);
  assert.deepEqual(candidates.map(c => c.number), [1, 2, 3]);
  assert.deepEqual(candidatesWithProfileFirst(candidates).map(c => c.number), [1, 2, 3]);
  assert.deepEqual(candidatesWithProfileFirst(candidates, "missing").map(c => c.number), [1, 2, 3]);
});

test("halaman awal menampilkan form NIM tanpa kartu kandidat sebelum sesi diterima", () => {
  const html = renderToStaticMarkup(
    createElement(VotingPage, {
      data: {
        available: true,
        election: {
          id: "election-test",
          period: "2026/2027",
          status: "scheduled",
          startsAt: "2020-01-01T00:00:00Z",
          endsAt: "2099-01-01T00:00:00Z",
          candidates: [
            {
              id: "candidate-test",
              number: 1,
              name: "Kandidat Uji",
              vision: "Visi uji",
              missions: [],
              programs: [],
              photo: null,
              placeholder: false,
            },
          ],
        },
      },
    }),
  );
  assert.match(html, /id="voting-nim"/);
  assert.match(html, /inputMode="numeric"/);
  assert.doesNotMatch(html, /Kandidat Uji|id="kandidat"|Konfirmasi pilihan/);
});

test("pemilihan ditutup menampilkan tindakan kembali tanpa ajakan memasukkan NIM", () => {
  const html = renderToStaticMarkup(
    createElement(VotingPage, {
      data: {
        available: true,
        election: {
          id: "closed-test",
          period: "2026/2027",
          status: "closed",
          startsAt: null,
          endsAt: null,
          candidates: [],
        },
      },
    }),
  );
  assert.match(html, /Pemilihan telah ditutup/);
  assert.match(html, /Kembali ke beranda/);
  assert.doesNotMatch(html, /Masukkan NIM untuk memilih|id="voting-nim"/);
});
