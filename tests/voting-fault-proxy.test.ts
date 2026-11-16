import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { createVotingFaultProxy } from "../scripts/lib/voting-fault-proxy";
import { testSchedule } from "../scripts/lib/voting-load-test";
import { electionState } from "../src/domain/voting";

test("jadwal uji mencakup belum buka, dibuka, berakhir dan ditutup tanpa mengubah jam sistem", () => {
  const now = new Date("2026-11-12T08:00:00Z");
  for (const state of ["open","upcoming","ended","closed"] as const)
    assert.equal(electionState(testSchedule(state, now), now), state);
});

test("proxy membedakan putus sebelum server dan sesudah commit; tidak menyimpan isi pilihan", async () => {
  let casts=0;
  const upstream=createServer((req,res)=>{
    if(req.url==="/api/voting/ballots") casts++;
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify(req.url?.endsWith("/status")?{status:casts?"recorded":"not_recorded"}:{success:true}));
  });
  upstream.listen(0,"127.0.0.1"); await once(upstream,"listening");
  const address=upstream.address(); assert.ok(address && typeof address!=="string");
  const proxy=createVotingFaultProxy(`http://127.0.0.1:${address.port}`);
  proxy.server.listen(0,"127.0.0.1");await once(proxy.server,"listening");
  const local=proxy.server.address();assert.ok(local && typeof local!=="string");
  const origin=`http://127.0.0.1:${local.port}`;
  const send=(path:string)=>fetch(origin+path,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({token:"not-a-real-token",candidateId:"dummy-private-choice"})});
  try {
    proxy.setMode("drop-before");
    await assert.rejects(send("/api/voting/ballots"));assert.equal(casts,0);
    assert.deepEqual(await (await send("/api/voting/status")).json(),{status:"not_recorded"});
    proxy.setMode("drop-after");
    await assert.rejects(send("/api/voting/ballots"));assert.equal(casts,1);
    assert.deepEqual(await (await send("/api/voting/status")).json(),{status:"recorded"});
    proxy.setMode("offline-after");
    await assert.rejects(send("/api/voting/status"));
    proxy.setMode("none");assert.equal((await send("/api/voting/status")).status,200);
    const denied=await fetch(origin+"/api/voting/ballots",{method:"POST",headers:{Origin:"https://untrusted.invalid"}});
    assert.equal(denied.status,403);assert.equal(casts,1);
    assert.doesNotMatch(JSON.stringify(proxy.events),/not-a-real-token|dummy-private-choice/);
  } finally {
    proxy.server.closeAllConnections();proxy.server.close();
    upstream.closeAllConnections();upstream.close();
  }
});
