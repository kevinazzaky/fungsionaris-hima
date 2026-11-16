import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VotingSubmissionFeedback } from "../src/components/voting/voting-submission-feedback";

const render=(submission:"idle"|"verifying"|"not_recorded"|"unknown"|"expired",busy=false,canVote=true)=>renderToStaticMarkup(createElement(VotingSubmissionFeedback,{
  submission,busy,canVote,error:"",onBack:()=>{},onVerify:()=>{},
}));

test("pemeriksaan latar hanya menampilkan proses, tanpa pesan gagal dan pilihan pemulihan",()=>{
  const html=render("verifying",true);
  assert.match(html,/Mengirim suara…/);
  assert.match(html,/disabled=""/);
  assert.doesNotMatch(html,/Coba lagi|Periksa status|Masukkan NIM|Kembali memilih|role="alert"/);
});

test("status belum pasti hanya menyediakan satu pemeriksaan ulang, termasuk setelah jadwal berakhir",()=>{
  const html=render("unknown",false,false);
  assert.match(html,/belum dapat dipastikan/);
  assert.match(html,/type="button"/);
  assert.match(html,/Coba lagi/);
  assert.equal((html.match(/<button/g)||[]).length,1);
  assert.doesNotMatch(html,/type="submit"|disabled|href=|Periksa status suara/);
});

test("suara belum terkonfirmasi menawarkan satu retry pilihan yang sama; sesi habis hanya menawarkan NIM",()=>{
  const retry=render("not_recorded");
  assert.match(retry,/belum terkonfirmasi/);
  assert.match(retry,/pilihan yang sama/);
  assert.match(retry,/type="submit"/);
  assert.equal((retry.match(/<button/g)||[]).length,1);
  const expired=render("expired");
  assert.match(expired,/href="\/voting"/);
  assert.match(expired,/Masukkan NIM kembali/);
  assert.doesNotMatch(expired,/<button|type="submit"/);
});
