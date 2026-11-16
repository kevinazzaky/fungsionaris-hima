import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandidateVoteTotal } from "../src/components/admin/candidate-vote-total";

test("kartu calon menampilkan perolehan saat pemilihan berlangsung", () => {
  for (const status of ["scheduled", "closed"]) {
    const html = renderToStaticMarkup(createElement(CandidateVoteTotal, { status, total: 17 }));
    assert.match(html, /<strong>17<\/strong> suara/);
  }
});

test("kartu calon menampilkan jumlah suara akhir termasuk nol setelah ditutup", () => {
  for (const total of [0, 17]) {
    const html = renderToStaticMarkup(createElement(CandidateVoteTotal, { status: "closed", total }));
    assert.match(html, new RegExp(`<strong>${total}</strong> suara`));
  }
});
