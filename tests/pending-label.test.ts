import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PendingLabel } from "../src/components/ui/pending-label";

test("status menunggu menyajikan aksi yang diproses dan tidak menafsirkan label sebagai HTML", () => {
  const html = renderToStaticMarkup(createElement(PendingLabel, {
    pending: true, text: '<img src=x onerror="alert(1)">',
  }, "Simpan"));
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|>Simpan</);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /width="18" height="18"/);
  assert.equal(renderToStaticMarkup(createElement(PendingLabel, { pending: false }, "Simpan")), "Simpan");
});
