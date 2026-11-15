import assert from "node:assert/strict";
import test from "node:test";
import { checkVotingSubmission, submitVotingChoice, VotingRequestError } from "../src/lib/voting-submission";
import { loadVotingSubmissionStatus } from "../src/use-cases/voting";
import { issueVotingToken } from "../src/use-cases/voting-token";

test("respons kirim hilang: hanya memeriksa status, tidak mengirim suara ulang", async () => {
  const paths: string[] = [];
  let verifying = false;
  const result = await submitVotingChoice(async (path) => {
    paths.push(path);
    if (path.endsWith("ballots")) throw new TypeError("connection lost");
    return { status: "recorded" };
  }, { token: "session", candidateId: "candidate" }, () => { verifying = true; });
  assert.equal(result, "recorded");
  assert.equal(verifying, true);
  assert.deepEqual(paths, ["/api/voting/ballots", "/api/voting/status"]);
});

test("server tidak terjangkau atau respons tidak dikenal tidak dianggap sukses/gagal pasti", async () => {
  const wait=async()=>{};
  assert.equal(await checkVotingSubmission(async () => { throw new Error("offline"); }, "session",wait), "unknown");
  assert.equal(await checkVotingSubmission(async () => ({ success: true }), "session",wait), "unknown");
  assert.equal(await checkVotingSubmission(async () => ({ status: "not_recorded" }), "session",wait), "not_recorded");
});

test("pemeriksaan latar menunggu transaksi terlambat dan tidak mengirim ballot kedua", async () => {
  const paths:string[]=[],delays:number[]=[];
  let checks=0;
  const result=await submitVotingChoice(async(path)=>{
    paths.push(path);
    if(path.endsWith("ballots"))throw new TypeError("response lost");
    checks++;
    if(checks===1)return {status:"not_recorded"};
    if(checks===2)throw new TypeError("temporarily offline");
    return {status:"recorded"};
  },{token:"session",candidateId:"candidate"},()=>{},async ms=>{delays.push(ms);});
  assert.equal(result,"recorded");
  assert.equal(paths.filter(path=>path.endsWith("ballots")).length,1);
  assert.equal(checks,3);
  assert.deepEqual(delays,[1000,2000]);
});

test("pemeriksaan otomatis berhenti setelah tiga percobaan dan tidak menganggap jaringan putus sebagai suara gagal", async () => {
  for(const replies of [["not_recorded","not_recorded","not_recorded"],["not_recorded","unknown","unknown"]]){
    let checks=0;
    const result=await checkVotingSubmission(async()=>{
      const status=replies[checks++];
      if(status==="unknown")throw new TypeError("offline");
      return {status};
    },"session",async()=>{});
    assert.equal(checks,3);
    assert.equal(result,replies[2]);
  }
});

test("sesi habis dan rate limit tidak dipoll berulang", async () => {
  for(const status of [400,429]){
    let checks=0;
    const result=await checkVotingSubmission(async()=>{checks++;throw new VotingRequestError("rejected",status);},"session",async()=>assert.fail("tidak perlu retry"));
    assert.equal(checks,1);
    assert.equal(result,status===400?"expired":"unknown");
  }
});

test("respons sukses tidak memerlukan pemeriksaan tambahan", async () => {
  let requests = 0;
  assert.equal(await submitVotingChoice(async () => { requests++; return { success: true }; },
    { token: "session", candidateId: "candidate" }, () => assert.fail("tidak perlu pemeriksaan")), "recorded");
  assert.equal(requests, 1);
});

test("status suara terikat sesi bertanda tangan dan hanya mengembalikan status hak terpakai", async () => {
  const secret = "test-only-secret-longer-than-32-characters";
  const key = "a".repeat(64);
  const token = issueVotingToken("election", key, secret, 1000);
  for (const consumed of [false, true]) {
    const result = await loadVotingSubmissionStatus({ voterEligibility: async (id, voter) => {
      assert.equal(id, "election"); assert.equal(voter, key);
      return { eligible: true, consumed };
    } }, token, secret, 2000);
    assert.deepEqual(result, { status: consumed ? "recorded" : "not_recorded" });
  }
  const noRead = { voterEligibility: async () => { assert.fail("token tidak valid tidak boleh membaca database"); } };
  await assert.rejects(loadVotingSubmissionStatus(noRead, `${token}x`, secret, 2000));
  await assert.rejects(loadVotingSubmissionStatus(noRead, token, secret, 1_000_000));
  await assert.rejects(loadVotingSubmissionStatus({ voterEligibility: async () => null }, token, secret, 2000));
});
