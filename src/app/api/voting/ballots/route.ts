import { publicVotingRequest } from "@/lib/voting-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return publicVotingRequest(request, "cast");
}
