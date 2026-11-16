import { readFile, writeFile, mkdir, cp, symlink, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs, parseEnv } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { voterKey, issueVotingToken } from "../src/use-cases/voting-token";
import { testTarget, dummyNims, concurrentMap, capacityFixtureSource, fontFreeFixtureSource, requestSummary, testSchedule } from "./lib/voting-load-test";

const root = resolve(import.meta.dirname, "..");
const envPath = join(root, ".env.voting-test.local");
const artifacts = join(root, ".qa/voting-load-test");
const origin = "http://127.0.0.1:3003";
const marker = "hima-voting-load-test-only";
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
type Target = ReturnType<typeof testTarget>;
type Reply = { status: number; ms: number; token?: string; recorded?: boolean };

function isolatedEnvironment(target: Target): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot", "LANG", "LC_ALL"]) env[key] = process.env[key];
  return { ...env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: target.databaseUrl, DIRECT_URL: target.directUrl,
    NEXT_PUBLIC_SUPABASE_URL: `https://${target.projectRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SECRET_KEY: "", VERCEL: "",
    VOTING_SECRET: target.secret, VOTING_PROTOTYPE_ENABLED: "true",
  };
}

async function connect(url: string) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000, query_timeout: 30_000 });
  await client.connect();
  return client;
}

async function assertMarker(db: Client, target: Target) {
  const exists = (await db.query("SELECT to_regclass('public._hima_voting_load_test') AS name")).rows[0].name;
  if (!exists) throw new Error("Database belum ditandai khusus uji. Jalankan prepare dahulu.");
  const row = (await db.query("SELECT project_ref, purpose FROM public._hima_voting_load_test WHERE id=true")).rows[0];
  if (row?.project_ref !== target.projectRef || row?.purpose !== marker) throw new Error("Penanda target uji tidak cocok; operasi dihentikan.");
  if ((await db.query("SELECT to_regclass('public.elections') AS name")).rows[0].name) {
    const real = await db.query("SELECT 1 FROM public.elections WHERE period !~ '^99[0-9]{2}/99[0-9]{2}$' LIMIT 1");
    if (real.rowCount) throw new Error("Ditemukan periode bukan dummy dalam project uji; operasi dihentikan.");
  }
}

async function initializeMarker(db: Client, target: Target, afterMigration = false) {
  const exists = (await db.query("SELECT to_regclass('public._hima_voting_load_test') AS name")).rows[0].name;
  if (exists) return assertMarker(db, target);
  if (!afterMigration) {
    const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' AND tablename <> 'spatial_ref_sys'")).rows;
    if (tables.length) throw new Error("Project uji harus kosong untuk pemasangan pertama; tidak akan menimpa tabel existing.");
    return;
  }
  await db.query("BEGIN");
  try {
    await db.query("CREATE TABLE public._hima_voting_load_test(id boolean PRIMARY KEY CHECK(id), project_ref text NOT NULL, purpose text NOT NULL)");
    await db.query("ALTER TABLE public._hima_voting_load_test ENABLE ROW LEVEL SECURITY");
    await db.query("REVOKE ALL ON public._hima_voting_load_test FROM PUBLIC,anon,authenticated");
    await db.query("INSERT INTO public._hima_voting_load_test VALUES(true,$1,$2)", [target.projectRef, marker]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
}

async function command(args: string[], cwd: string, env: NodeJS.ProcessEnv, label: string) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { output += data; });
  const [code] = await once(child, "exit");
  for (const value of [env.DATABASE_URL, env.DIRECT_URL, env.VOTING_SECRET]) if (value) output = output.split(value).join("[REDACTED]");
  output = output.replace(/postgres(?:ql)?:\/\/[^\s"']+/g, "[REDACTED_DATABASE_URL]");
  await writeFile(join(artifacts, `${label}.log`), output, { mode: 0o600 });
  if (code !== 0) throw new Error(`Tahap ${label} gagal. Log tersimpan secara lokal di .qa/voting-load-test.`);
}

async function prepare(target: Target) {
  await mkdir(artifacts, { recursive: true, mode: 0o700 });
  const db = await connect(target.directUrl);
  try { await initializeMarker(db, target); } finally { await db.end(); }
  await command([join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy", "--config", join(root, "prisma.config.ts")], artifacts, isolatedEnvironment(target), "migrate");
  const verify = await connect(target.directUrl);
  try {
    await initializeMarker(verify, target, true);
    await assertMarker(verify, target);
    const functions = (await verify.query("SELECT to_regprocedure('public.cast_hima_ballot(uuid,text,uuid)') AS cast, to_regprocedure('public.voting_take_rate(text,text,integer)') AS rate")).rows[0];
    if (!functions.cast || !functions.rate) throw new Error("Fungsi voting belum lengkap.");
    if (!(await verify.query("SELECT 1 FROM public.elections LIMIT 1")).rowCount) {
      const election = await seed(verify, target);
      console.log(`Periode dummy ${election.period}: 200 NIM dan 6 kandidat dummy dibuat.`);
    }
  } finally { await verify.end(); }
  await writeFile(join(artifacts, "dummy-nims.csv"), "nim\n" + dummyNims().join("\n") + "\n", { mode: 0o600 });
  console.log("Struktur database uji siap; daftar 200 NIM dummy tersimpan di .qa/voting-load-test/dummy-nims.csv.");
}

async function seed(db: Client, target: Target, state: "open" | "upcoming" | "ended" | "closed" = "open") {
  await assertMarker(db, target);
  const largest = Number((await db.query("SELECT max(split_part(period,'/',1)::int) AS value FROM public.elections")).rows[0].value || 9899);
  const year = largest + 1;
  if (year > 9998) throw new Error("Slot periode uji habis; tinjau project uji sebelum melanjutkan.");
  const id = randomUUID(), candidates: string[] = Array.from({ length: 6 }, () => randomUUID());
  const nims = dummyNims(), keys = nims.map(nim => voterKey(nim, id, target.secret));
  await db.query("BEGIN");
  try {
    await db.query("UPDATE public.elections SET status='closed' WHERE status='scheduled'");
    await db.query("INSERT INTO public.elections(id,period,created_at) VALUES($1,$2,clock_timestamp())", [id, `${year}/${year + 1}`]);
    for (let i = 0; i < candidates.length; i++) await db.query(`INSERT INTO public.candidates(id,election_id,number,name,vision,missions,photo_path,placeholder)
      VALUES($1,$2,$3,$4,'Visi dummy pengujian',ARRAY['Misi dummy pengujian'],'/brand/logo-emblem.png',false)`, [candidates[i], id, i+1, `Kandidat Dummy ${i+1}`]);
    await db.query("INSERT INTO public.eligible_voters(election_id,voter_key,name) SELECT $1,unnest($2::text[]),'Pemilih Dummy'", [id,keys]);
    await db.query("INSERT INTO public.audit_logs(election_id,actor_id,action) VALUES($1,$2,'isolated_load_test_seeded_200')", [id,randomUUID()]);
    const schedule=testSchedule(state);
    await db.query("UPDATE public.elections SET status='scheduled', starts_at=$2, ends_at=$3 WHERE id=$1", [id,schedule.startsAt,schedule.endsAt]);
    if(state==="closed")await db.query("UPDATE public.elections SET status='closed' WHERE id=$1",[id]);
    await db.query("DELETE FROM public.voting_rate_limits");
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }
  return { id, candidates, nims, keys, period: `${year}/${year+1}` };
}

async function fixture(target: Target, mode: string, runId: string) {
  const directory = join(artifacts, `app-${mode}-${runId}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const name of ["src", "public", "prisma"]) await cp(join(root, name), join(directory, name), { recursive: true });
  for (const name of ["package.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json", "prisma.config.ts"]) await cp(join(root, name), join(directory, name));
  await symlink(join(root,"node_modules"), join(directory,"node_modules"), "dir");
  const layout = join(directory,"src/app/layout.tsx");
  await writeFile(layout,fontFreeFixtureSource(await readFile(layout,"utf8")));
  if (mode === "capacity") {
    const file = join(directory,"src/lib/voting-api.ts");
    await writeFile(file, capacityFixtureSource(await readFile(file,"utf8")));
  }
  const health = join(directory, "src/app/api/voting-load-test-health");
  await mkdir(health, { recursive: true });
  await writeFile(join(health,"route.ts"), `import {getPrisma} from "@/data/prisma";
export const dynamic="force-dynamic";
export async function GET(){
 const rows=await getPrisma().$queryRaw<{project_ref:string;purpose:string}[]>\`SELECT project_ref,purpose FROM public._hima_voting_load_test WHERE id=true\`;
 if(rows[0]?.project_ref!==${JSON.stringify(target.projectRef)}||rows[0]?.purpose!==${JSON.stringify(marker)})return Response.json({error:"wrong target"},{status:503});
 return Response.json({runId:${JSON.stringify(runId)},mode:${JSON.stringify(mode)}},{headers:{"Cache-Control":"no-store"}});
}`);
  await command([join(root,"node_modules/prisma/build/index.js"),"generate","--config",join(directory,"prisma.config.ts")], directory, isolatedEnvironment(target), `generate-${mode}`);
  console.log(`Membangun salinan produksi lokal untuk mode ${mode}…`);
  await command([join(root,"node_modules/next/dist/bin/next"),"build","--webpack"], directory, isolatedEnvironment(target), `build-${mode}`);
  const routes=JSON.parse(await readFile(join(directory,".next/server/app-paths-manifest.json"),"utf8"));
  if(!routes["/api/voting-load-test-health/route"])throw new Error("Health route salinan uji tidak terdaftar pada build.");
  return directory;
}

async function request(path: string, payload: object): Promise<Reply> {
  const start = performance.now();
  try {
    const response = await fetch(origin + path, { method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(15_000),redirect:"error" });
    const result = await response.json();
    return { status:response.status,ms:performance.now()-start, token:typeof result.token === "string" ? result.token : undefined,recorded:result.status === "recorded" };
  } catch { return { status:0,ms:performance.now()-start }; }
}

async function waitForServer(server: ChildProcess, runId: string) {
  for (let i=0;i<60;i++) {
    if (server.exitCode !== null) throw new Error("Server uji gagal berjalan; port 3003 mungkin sudah dipakai.");
    try {
      const response=await fetch(origin+"/api/voting-load-test-health",{signal:AbortSignal.timeout(2000),redirect:"error"});
      const result=await response.json();
      if (result.runId === runId) return;
      throw new Error("Port 3003 mengarah ke aplikasi lain; hentikan sebelum menjalankan tes.");
    } catch(error) {
      if (error instanceof Error && error.message.startsWith("Port 3003")) throw error;
    }
    await pause(500);
  }
  throw new Error("Server uji belum siap setelah menunggu.");
}

async function totals(db: Client, id: string) {
  const counts=(await db.query(`SELECT (SELECT count(*)::int FROM public.eligible_voters WHERE election_id=$1 AND consumed) AS consumed,
    (SELECT count(*)::int FROM public.ballots WHERE election_id=$1) AS ballots`,[id])).rows[0];
  const distribution=(await db.query("SELECT candidate_id,count(*)::int AS votes FROM public.ballots WHERE election_id=$1 GROUP BY candidate_id",[id])).rows;
  return {...counts,distribution};
}

async function run(target: Target, mode: string) {
  const runId=randomUUID();
  const directory=await fixture(target,mode,runId);
  const log=await import("node:fs").then(fs=>fs.openSync(join(artifacts,`server-${mode}.log`),"w",0o600));
  const server=spawn(process.execPath,[join(root,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port","3003"],{cwd:directory,env:isolatedEnvironment(target),stdio:["ignore",log,log]});
  const stop=()=>server.kill("SIGTERM");
  process.once("SIGINT",stop); process.once("SIGTERM",stop);
  let db: Client | undefined;
  const waves=[];
  try {
    db=await connect(target.directUrl);
    await waitForServer(server,runId);
    for (const concurrency of mode === "capacity" ? [10,25,50,200] : [10]) {
      const election=await seed(db,target);
      console.log(`Mulai ${mode}: 200 pemilih dummy, concurrency ${concurrency}, periode ${election.period}.`);
      const checks=await concurrentMap(election.nims,concurrency,nim=>request("/api/voting/check",{nim,name:"Pemilih Dummy"}));
      console.log(`Pemeriksaan NIM selesai: ${checks.filter(reply=>reply.status===200).length}/200 diterima.`);
      const voters=election.nims.map((_,i)=>({
        token:mode === "limiter" ? issueVotingToken(election.id,election.keys[i],target.secret) : checks[i].token,
        candidateId:election.candidates[i%6],
      })).filter((voter):voter is {token:string;candidateId:string}=>Boolean(voter.token));
      const cast=await concurrentMap(voters,concurrency,voter=>request("/api/voting/ballots",voter));
      console.log(`Pengiriman selesai: ${cast.filter(reply=>reply.status===200).length}/${cast.length} respons sukses. Memeriksa database dan status…`);
      const expected=mode === "limiter" ? 50 : voters.length;
      let count=await totals(db,election.id);
      for(let i=0;i<30 && count.ballots<expected;i++){await pause(1000);count=await totals(db,election.id);}
      const statuses=await concurrentMap(voters.filter((_,i)=>cast[i].status===200),Math.min(concurrency,25),voter=>request("/api/voting/status",{token:voter.token}));
      const duplicate=voters[0] ? await concurrentMap([1,2],2,()=>request("/api/voting/ballots",voters[0])) : [];
      const after=await totals(db,election.id);
      const checkStats=requestSummary(checks), castStats=requestSummary(cast);
      const invariant=after.ballots===after.consumed && after.ballots===count.ballots && after.ballots<=200;
      const passed=invariant && (mode === "capacity"
        ? checkStats.ok===200 && castStats.ok===200 && statuses.length===200 && statuses.every(status=>status.recorded)
        : checkStats.ok===50 && checkStats.rateLimited===150 && castStats.ok===50 && castStats.rateLimited===150);
      const wave={concurrency,period:election.period,check:checkStats,cast:castStats,status:requestSummary(statuses),confirmedStatus:statuses.filter(s=>s.recorded).length,duplicateProbe:requestSummary(duplicate),totals:after,invariant,passed};
      waves.push(wave);
      await writeFile(join(artifacts,`report-${mode}-${runId}.json`),JSON.stringify({mode,server:"local-production-build",database:"dedicated-supabase-test-project",networkScenario:"one-shared-network",networkLimit:mode==="capacity"?1000:50,waves},null,2),{mode:0o600});
      console.log(JSON.stringify(wave,null,2));
      if(!passed){console.log("Tahap berikutnya dihentikan: hasil perlu ditinjau, bukan dianggap server aman.");break;}
    }
  }finally{
    process.removeListener("SIGINT",stop);process.removeListener("SIGTERM",stop);
    server.kill("SIGTERM");
    await db?.end().catch(()=>{});
    if(server.exitCode===null) await Promise.race([once(server,"exit"),pause(5000)]);
    if(server.exitCode===null) server.kill("SIGKILL");
    (await import("node:fs")).closeSync(log);
  }
  console.log(`Laporan tersimpan di .qa/voting-load-test/report-${mode}-${runId}.json. Data HIMA tidak digunakan.`);
  if(waves.some(wave=>!wave.passed))process.exitCode=1;
}

async function main(){
  const {values,positionals}=parseArgs({allowPositionals:true,options:{mode:{type:"string",default:"capacity"}}});
  const action=positionals[0]||"check",mode=values.mode!;
  if(!["check","prepare","run"].includes(action)||!["capacity","limiter"].includes(mode))throw new Error("Gunakan check, prepare, atau run --mode capacity|limiter.");
  const originalText=await readFile(join(root,".env.local"),"utf8");
  const originalHash=createHash("sha256").update(originalText).digest("hex");
  const target=testTarget(parseEnv(await readFile(envPath,"utf8")),parseEnv(originalText),join(root,"supabase/certs/prod-ca-2021.crt"));
  await access(join(root,"supabase/certs/prod-ca-2021.crt"));
  console.log(`Target: project uji ${target.projectRef}; koneksi memakai TLS verify-full. Kredensial tidak dicetak.`);
  if(action==="check"){
    for(const [name,url] of [["runtime",target.databaseUrl],["migration",target.directUrl]]){
      const db=await connect(url);
      try{await db.query("SELECT 1");console.log(`Koneksi ${name}: berhasil.`);}finally{await db.end();}
    }
  }else{
    await prepare(target);
    if(action==="run")await run(target,mode);
  }
  if(createHash("sha256").update(await readFile(join(root,".env.local"))).digest("hex")!==originalHash)throw new Error("Environment HIMA berubah selama tes; periksa sebelum melanjutkan.");
}
export { root, artifacts, origin, isolatedEnvironment, connect, assertMarker, prepare, seed, fixture, waitForServer, totals };
export type { Target };

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{
  console.error(error instanceof Error && error.message.startsWith("Target uji") ? error.message : `Operasi uji berhenti (${error && typeof error === "object" && "code" in error ? String(error.code) : error instanceof Error ? error.name : "unknown"}). Tidak mencetak detail kredensial.`);
  process.exitCode=1;
});
