export type SubmissionStatus = "recorded" | "not_recorded" | "unknown";
type Send = (path: string, payload: object) => Promise<unknown>;

export async function checkVotingSubmission(send: Send, token: string): Promise<SubmissionStatus> {
  try {
    const result = await send("/api/voting/status", { token });
    if (result && typeof result === "object" && "status" in result &&
      (result.status === "recorded" || result.status === "not_recorded")) return result.status;
  } catch {}
  return "unknown";
}

export async function submitVotingChoice(
  send: Send,
  payload: { token: string; candidateId: string },
  onVerifying: () => void,
): Promise<SubmissionStatus> {
  try {
    const result = await send("/api/voting/ballots", payload);
    if (result && typeof result === "object" && "success" in result && result.success === true)
      return "recorded";
  } catch {}
  onVerifying();
  return checkVotingSubmission(send, payload.token);
}
