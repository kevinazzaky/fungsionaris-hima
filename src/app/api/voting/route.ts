import { loadVoting } from "@/data/voting";

export async function GET() {
  const data = await loadVoting();
  return Response.json(data, {
    status: data.error ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
