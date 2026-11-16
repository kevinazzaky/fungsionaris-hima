import type { VotingPublicData } from "../domain/voting";

export async function fetchVotingUpdate(
  fetcher: typeof fetch = fetch,
): Promise<VotingPublicData | null> {
  try {
    const response = await fetcher("/api/voting", {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.available !== "boolean" ||
        (data.election !== null && !Array.isArray(data.election?.candidates))) return null;
    return data;
  } catch {
    return null;
  }
}
