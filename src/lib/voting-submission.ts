export type SubmissionStatus = "recorded" | "not_recorded" | "unknown" | "expired";
type Send = (path: string, payload: object) => Promise<unknown>;
type Wait = (ms: number) => Promise<void>;
const waitForRetry: Wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class VotingRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function checkVotingSubmission(send: Send, token: string, wait: Wait = waitForRetry): Promise<SubmissionStatus> {
  let status: SubmissionStatus = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await wait(attempt * 1000);
    status = "unknown";
    try {
      const result = await send("/api/voting/status", { token });
      if (result && typeof result === "object" && "status" in result) {
        if (result.status === "recorded") return "recorded";
        if (result.status === "not_recorded") status = "not_recorded";
      }
    } catch (error) {
      if (error instanceof VotingRequestError && error.status < 500)
        return error.status === 400 ? "expired" : "unknown";
    }
  }
  return status;
}

export async function submitVotingChoice(
  send: Send,
  payload: { token: string; candidateId: string },
  onVerifying: () => void,
  wait: Wait = waitForRetry,
): Promise<SubmissionStatus> {
  try {
    const result = await send("/api/voting/ballots", payload);
    if (result && typeof result === "object" && "success" in result && result.success === true)
      return "recorded";
  } catch {}
  onVerifying();
  return checkVotingSubmission(send, payload.token, wait);
}
