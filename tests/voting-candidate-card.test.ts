import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VotingCandidateCard } from "../src/components/voting/voting-candidate-card";

const candidate = {
  id: "test",
  number: 1,
  name: "Kandidat Dummy",
  photo: null,
  placeholder: false,
  vision: "Visi dummy",
  missions: ["Misi dummy"],
  programs: [
    {
      title: "Program dummy",
      description: "Deskripsi dummy",
      target: "Sasaran dummy",
    },
  ],
};
const render = (open: boolean, canVote = true) =>
  renderToStaticMarkup(
    createElement(VotingCandidateCard, {
      candidate,
      open,
      canVote,
      onToggle: () => {},
      onSelect: () => {},
    }),
  );

test("kartu tertutup menyajikan nama dan pilihan tanpa rincian profil", () => {
  const html = render(false);
  assert.match(html, /Kandidat Dummy/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Pilih kandidat/);
  assert.doesNotMatch(html, /type="radio"/);
  assert.doesNotMatch(html, /Visi dummy|Misi dummy|Program dummy/);
});
test("profil terbuka menyajikan visi misi program serta sasaran dan dapat ditutup", () => {
  const html = render(true);
  for (const text of [
    "Visi dummy",
    "Misi dummy",
    "Program dummy",
    "Deskripsi dummy",
    "Sasaran dummy",
    "Tutup profil",
  ])
    assert.ok(html.includes(text));
  assert.match(html, /aria-expanded="true"/);
  assert.doesNotMatch(render(true, false), /Pilih kandidat/);
});
