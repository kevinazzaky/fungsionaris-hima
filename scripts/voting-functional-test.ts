import assert from "node:assert/strict";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs, parseEnv } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { openSync, closeSync } from "node:fs";
import { issueVotingToken, readVotingToken } from "../src/use-cases/voting-token";
import { checkVotingSubmission, submitVotingChoice, VotingRequestError } from "../src/lib/voting-submission";
import { testTarget, fontFreeFixtureSource } from "./lib/voting-load-test";
import { createVotingFaultProxy, type FaultMode } from "./lib/voting-fault-proxy";
import { root, artifacts, origin, isolatedEnvironment, connect, prepare, seed, fixture, waitForServer, totals, type Target } from "./voting-load-test";

async function sourceMatches(directory:string) {
  const walk=async(relative:string):Promise<boolean>=>{
    for(const entry of await readdir(join(root,relative),{withFileTypes:true})){
      if(entry.name==="generated")continue;
      const file=join(relative,entry.name);
      if(entry.isDirectory()){if(!await walk(file))return false;}
      else{
        const source=await readFile(join(root,file));
        const expected=file==="src/app/layout.tsx"?Buffer.from(fontFreeFixtureSource(source.toString())):source;
        try{if(!expected.equals(await readFile(join(directory,file))))return false;}catch{return false;}
      }
    }
    return true;
  };
  return await walk("src") && (await readFile(join(root,"prisma/schema.prisma"))).equals(await readFile(join(directory,"prisma/schema.prisma")));
}

async function builtFixture(target:Target) {
  const names=(await readdir(artifacts)).filter(name=>/^app-limiter-[a-f0-9-]{36}$/.test(name));
  const candidates=await Promise.all(names.map(async name=>({name,modified:(await stat(join(artifacts,name))).mtimeMs})));
  for(const {name} of candidates.sort((a,b)=>b.modified-a.modified)){
    const directory=join(artifacts,name);
    if(await sourceMatches(directory)){
      console.log("Memakai build lokal limiter yang sumber aplikasinya masih cocok.");
      return {directory,runId:name.slice("app-limiter-".length)};
    }
  }
  const runId=randomUUID();
  return {directory:await fixture(target,"functional",runId),runId};
}

async function main(){
  const {values}=parseArgs({options:{ui:{type:"boolean",default:false},"ui-only":{type:"boolean",default:false}}});
  const original=await readFile(join(root,".env.local"),"utf8");
  const originalHash=createHash("sha256").update(original).digest("hex");
  const target=testTarget(parseEnv(await readFile(join(root,".env.voting-test.local"),"utf8")),parseEnv(original),join(root,"supabase/certs/prod-ca-2021.crt"));
  await prepare(target);
  const built=await builtFixture(target);
  const log=openSync(join(artifacts,"server-functional.log"),"w",0o600);
  const server=spawn(process.execPath,[join(root,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port","3003"],{cwd:built.directory,env:isolatedEnvironment(target),stdio:["ignore",log,log]});
  const results:{name:string;passed:boolean;details?:unknown}[]=[];
  const browserSnapshots:unknown[]=[];
  const reportFile=join(artifacts,`report-functional-${randomUUID()}.json`);
  const db=await connect(target.directUrl);
  const proxy=createVotingFaultProxy(origin,token=>{
    const current=readVotingToken(token,target.secret);
    return issueVotingToken(current.electionId,current.voterKey,target.secret,Date.now()-16*60_000);
  });
  let current:Awaited<ReturnType<typeof seed>>|undefined;
  let currentCase="none";
  const save=()=>writeFile(reportFile,JSON.stringify({environment:"local-production-build-and-dedicated-supabase-test",api:results,browserSnapshots},null,2),{mode:0o600});
  const send=async(path:string,payload:object,requestOrigin=origin)=>{
    const body=path==="/api/voting/check"?{name:"Pemilih Dummy",...payload}:payload;
    const response=await fetch(origin+path,{method:"POST",headers:{Origin:requestOrigin,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15_000),redirect:"error"});
    return {status:response.status,body:await response.json(),cache:response.headers.get("cache-control")};
  };
  const session=(e:Awaited<ReturnType<typeof seed>>,index=0,now=Date.now())=>issueVotingToken(e.id,e.keys[index],target.secret,now);
  const count=async(e:Awaited<ReturnType<typeof seed>>,expected:number)=>{
    const value=await totals(db,e.id);
    assert.equal(value.ballots,expected);assert.equal(value.consumed,expected);
    return {ballots:value.ballots,consumed:value.consumed};
  };
  const scenario=async(name:string,work:()=>Promise<unknown>)=>{
    try{const details=await work();results.push({name,passed:true,details});console.log(`PASS ${name}`);}
    catch(error){results.push({name,passed:false,details:error instanceof Error?error.name:"UnknownError"});await save();throw new Error(`Skenario gagal: ${name}`);}
    await save();
  };
  const snapshot=async()=>{
    if(!current)return;
    const entry={case:currentCase,period:current.period,database:await totals(db,current.id),events:[...proxy.events]};
    browserSnapshots.push(entry);await save();console.log(JSON.stringify(entry,null,2));
  };
  let controls:ReturnType<typeof createInterface>|undefined;
  const stop=()=>controls?.close();
  process.once("SIGINT",stop);process.once("SIGTERM",stop);
  try{
    await waitForServer(server,built.runId);
    if(!values["ui-only"]){
    let oldCandidate="";
    await scenario("alur normal, status tersimpan, dan NIM terpakai",async()=>{
      const e=await seed(db,target);oldCandidate=e.candidates[0];
      const checked=await send("/api/voting/check",{nim:e.nims[0]});assert.equal(checked.status,200);assert.equal(typeof checked.body.token,"string");
      const cast=await send("/api/voting/ballots",{token:checked.body.token,candidateId:e.candidates[0]});assert.equal(cast.status,200);
      const receipt=await send("/api/voting/status",{token:checked.body.token});assert.equal(receipt.body.status,"recorded");assert.match(receipt.cache||"",/no-store/);
      const reused=await send("/api/voting/check",{nim:e.nims[0]});assert.equal(reused.status,400);assert.match(reused.body.error,/sudah digunakan/);
      return count(e,1);
    });
    await scenario("10 pengiriman bersamaan dengan NIM yang sama",async()=>{
      const e=await seed(db,target),token=session(e);
      const replies=await Promise.all(Array.from({length:10},()=>send("/api/voting/ballots",{token,candidateId:e.candidates[0]})));
      assert.equal(replies.filter(reply=>reply.status===200).length,1);
      assert.ok(replies.every(reply=>[200,409,429].includes(reply.status)));
      return {...await count(e,1),accepted:1,rejected:9};
    });
    await scenario("token kedaluwarsa, token diubah, kandidat salah dan NIM tidak valid",async()=>{
      const e=await seed(db,target);
      const valid=session(e),[payload,signature]=valid.split(".");
      const tampered=payload+"."+(signature[0]==="A"?"B":"A")+signature.slice(1);
      for(const token of [session(e,0,Date.now()-16*60_000),tampered])assert.equal((await send("/api/voting/ballots",{token,candidateId:e.candidates[0]})).status,400);
      for(const candidateId of [oldCandidate,randomUUID()])assert.equal((await send("/api/voting/ballots",{token:valid,candidateId})).status,409);
      assert.equal((await send("/api/voting/check",{nim:"1234567"})).status,400);
      const unknown=await send("/api/voting/check",{nim:"88000000"});assert.equal(unknown.status,400);assert.match(unknown.body.error,/tidak cocok/);
      return count(e,0);
    });
    for(const state of ["upcoming","ended","closed"] as const)await scenario(`jadwal ${state} menolak cek dan cast`,async()=>{
      const e=await seed(db,target,state);
      assert.equal((await send("/api/voting/check",{nim:e.nims[0]})).status,409);
      assert.equal((await send("/api/voting/ballots",{token:session(e),candidateId:e.candidates[0]})).status,409);
      return count(e,0);
    });
    await scenario("status suara tetap terbaca setelah pemilihan ditutup",async()=>{
      const e=await seed(db,target),token=session(e);
      assert.equal((await send("/api/voting/ballots",{token,candidateId:e.candidates[0]})).status,200);
      await db.query("UPDATE public.elections SET status='closed' WHERE id=$1",[e.id]);
      assert.equal((await send("/api/voting/status",{token})).body.status,"recorded");
      assert.equal((await send("/api/voting/ballots",{token:session(e,1),candidateId:e.candidates[0]})).status,409);
      return count(e,1);
    });
    await scenario("origin asing dan API admin tanpa login ditolak",async()=>{
      for(const path of ["check","ballots","status"])assert.equal((await send(`/api/voting/${path}`,{},"https://foreign.invalid")).status,403);
      const admin=await fetch(origin+"/api/admin/voting",{redirect:"manual"});assert.equal(admin.status,401);
      return {foreignOrigin:403,adminUnauthenticated:401};
    });
    }
    proxy.server.listen(3004,"127.0.0.1");await once(proxy.server,"listening");
    const proxyOrigin="http://127.0.0.1:3004";
    const faultSend=async(path:string,payload:object)=>{
      const requestBody=path==="/api/voting/check"?{name:"Pemilih Dummy",...payload}:payload;
      const response=await fetch(proxyOrigin+path,{method:"POST",headers:{Origin:proxyOrigin,"Content-Type":"application/json"},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(15_000)});
      const body=await response.json();
      if(!response.ok)throw new VotingRequestError("Permintaan uji ditolak server.",response.status);
      return body;
    };
    if(!values["ui-only"])for(const mode of ["slow","drop-before","drop-after","offline-after","expired"] as const){
      await scenario(`pemulihan koneksi nyata: ${mode}`,async()=>{
        const e=await seed(db,target);proxy.events.length=0;proxy.setMode(mode);
        const checked=await faultSend("/api/voting/check",{nim:e.nims[0]});
        const payload={token:checked.token,candidateId:e.candidates[0]};
        let verifying=false;
        const started=Date.now();
        const result=await submitVotingChoice(faultSend,payload,()=>{verifying=true;});
        const expected={slow:"recorded","drop-before":"not_recorded","drop-after":"recorded","offline-after":"unknown",expired:"expired"} as const;
        assert.equal(result,expected[mode]);assert.equal(verifying,mode!=="slow");
        if(mode==="slow")assert.ok(Date.now()-started>=2400);
        const recorded=["slow","drop-after","offline-after"].includes(mode)?1:0;
        await count(e,recorded);
        const firstEvents=[...proxy.events];
        proxy.setMode("none");
        let recovered=result;
        if(mode==="drop-before")recovered=await submitVotingChoice(faultSend,payload,()=>{});
        if(mode==="offline-after")recovered=await checkVotingSubmission(faultSend,payload.token);
        if(mode==="expired"){
          const fresh=await faultSend("/api/voting/check",{nim:e.nims[0]});
          recovered=await submitVotingChoice(faultSend,{...payload,token:fresh.token},()=>{});
        }
        assert.equal(recovered,"recorded");await count(e,1);
        assert.equal((await checkVotingSubmission(faultSend,payload.token)),mode==="expired"?"expired":"recorded");
        const second=await send("/api/voting/check",{nim:e.nims[0]});
        assert.equal(second.status,400);assert.match(second.body.error,/sudah digunakan/);
        return {initial:result,beforeRecovery:{ballots:recorded,consumed:recorded},recovered,...await count(e,1),firstEvents,events:[...proxy.events]};
      });
    }
    if(values.ui || values["ui-only"]){
      controls=createInterface({input:process.stdin,terminal:false});
      const setCase=async(name:string)=>{
        await snapshot();proxy.events.length=0;
        const state=["upcoming","ended","closed"].includes(name)?name as "upcoming"|"ended"|"closed":"open";
        current=await seed(db,target,state);currentCase=name;
        const modes:Record<string,FaultMode>={normal:"none",slow:"slow","drop-before":"drop-before","drop-after":"drop-after","offline-after":"offline-after",expired:"expired",upcoming:"none",ended:"none",closed:"none"};
        proxy.setMode(modes[name]);
        console.log(`BROWSER_READY case=${name} period=${current.period} url=http://127.0.0.1:3004/voting nim=${current.nims[0]} name=Pemilih Dummy`);
      };
      await setCase("normal");
      for await(const line of controls){
        const command=line.trim();
        if(command==="quit")break;
        if(command==="state"){await snapshot();continue;}
        if(command==="restore"){proxy.setMode("none");console.log("Koneksi proxy dipulihkan; periode dan suara dipertahankan.");continue;}
        if(["normal","slow","drop-before","drop-after","offline-after","expired","upcoming","ended","closed"].includes(command))await setCase(command);
        else console.log("Perintah tidak dikenal.");
      }
      await snapshot();
    }
  }finally{
    process.removeListener("SIGINT",stop);process.removeListener("SIGTERM",stop);
    proxy.server.closeAllConnections();proxy.server.close();
    server.kill("SIGTERM");await db.end();
    if(server.exitCode===null)await Promise.race([once(server,"exit"),new Promise(resolve=>setTimeout(resolve,5000))]);
    if(server.exitCode===null)server.kill("SIGKILL");
    closeSync(log);await save();
    assert.equal(createHash("sha256").update(await readFile(join(root,".env.local"))).digest("hex"),originalHash);
  }
  console.log(`Laporan: ${reportFile}`);
}
main().catch(error=>{console.error("Tes fungsional berhenti:",error instanceof Error?error.name:"UnknownError");process.exitCode=1;});
