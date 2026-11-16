type Environment = Record<string, string | undefined>;

export function testSchedule(state: "open" | "upcoming" | "ended" | "closed", now = new Date()) {
  const start=state==="upcoming"?3_600_000:state==="ended"?-7_200_000:-60_000;
  const end=state==="ended"?-60_000:7_200_000;
  return {status:state==="closed"?"closed":"scheduled",startsAt:new Date(now.getTime()+start).toISOString(),endsAt:new Date(now.getTime()+end).toISOString()};
}

export function testTarget(input: Environment, original: Environment, certificate: string) {
  const projectRef = input.VOTING_TEST_PROJECT_REF || "";
  const fail = () => { throw new Error("Target uji belum lengkap atau tidak terisolasi. Periksa file .env.voting-test.local; jangan gunakan project HIMA."); };
  if (!/^[a-z]{20}$/.test(projectRef) || input.VOTING_TEST_ACK !== "ISOLATED_DUMMY_ONLY") fail();
  const originalRef = original.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z]{20})\.supabase\.co\/?$/)?.[1];
  if (!originalRef || originalRef === projectRef) fail();
  const secret = input.VOTING_SECRET || "";
  if (secret.length < 32 || secret === original.VOTING_SECRET || secret.includes("GENERATE_")) fail();
  const connection = (value: string | undefined, session: boolean) => {
    let url: URL;
    try {
      const password = input.VOTING_TEST_DB_PASSWORD;
      const filled = password ? value?.replace("[YOUR-PASSWORD]", encodeURIComponent(password)) : value;
      url = new URL(filled || "");
    } catch { return fail(); }
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const direct = url.hostname === `db.${projectRef}.supabase.co` && user === "postgres";
    const pooled = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) && user === `postgres.${projectRef}`;
    if (!["postgres:", "postgresql:"].includes(url.protocol) || (!direct && !pooled) ||
      !password || /YOUR.PASSWORD|ENCODED_PASSWORD/.test(password) || url.hash ||
      url.pathname !== "/postgres" || (session && url.port !== "5432")) return fail();
    url.searchParams.delete("uselibpqcompat");
    url.searchParams.set("sslmode", "verify-full");
    url.searchParams.set("sslrootcert", certificate);
    return url.toString();
  };
  return { projectRef, secret, databaseUrl: connection(input.DATABASE_URL, false), directUrl: connection(input.DIRECT_URL, true) };
}

export function dummyNims(count = 200) {
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error("Jumlah dummy harus 1–200.");
  return Array.from({ length: count }, (_, i) => String(99_000_001 + i));
}

export async function concurrentMap<T, R>(items: readonly T[], concurrency: number, work: (item: T, index: number) => Promise<R>) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 200) throw new Error("Concurrency harus 1–200.");
  let cursor = 0;
  const results: R[] = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await work(items[index], index);
    }
  }));
  return results;
}

export function capacityFixtureSource(source: string) {
  const pattern = 'const networkLimit = 50;';
  if (source.split(pattern).length !== 2) throw new Error("Pola limiter berubah; salinan uji perlu diperiksa sebelum dijalankan.");
  return source.replace(pattern, "const networkLimit = 1000;");
}

export function fontFreeFixtureSource(source: string) {
  const imported = /^import \{[^\n]+\} from "next\/font\/google";\r?\n/m;
  const definitions = /const figtree = Figtree\([\s\S]*?(?=const siteUrl =)/;
  if (!imported.test(source) || !definitions.test(source)) throw new Error("Layout font berubah; periksa salinan uji.");
  const local = ["figtree","geistMono","playfairDisplay","poppins","rubik"].map(name => `const ${name} = { variable: "" };`).join("\n");
  return source.replace(imported, "").replace(definitions, local + "\n\n");
}

export function requestSummary(samples: { status: number; ms: number }[]) {
  const times = samples.map(item => item.ms).sort((a,b) => a-b);
  const percentile = (fraction: number) => Math.round(times[Math.max(0, Math.ceil(times.length * fraction) - 1)] || 0);
  return {
    requests: samples.length,
    ok: samples.filter(item => item.status >= 200 && item.status < 300).length,
    rateLimited: samples.filter(item => item.status === 429).length,
    otherHttpErrors: samples.filter(item => item.status !== 0 && item.status !== 429 && (item.status < 200 || item.status >= 300)).length,
    networkErrors: samples.filter(item => item.status === 0).length,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), maxMs: percentile(1),
  };
}
