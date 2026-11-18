export class AdminRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly locked: boolean;

  constructor(
    message: string,
    status: number,
    code?: string,
    locked = false,
  ) {
    super(message);
    this.name = "AdminRequestError";
    this.status = status;
    this.code = code;
    this.locked = locked;
  }
}

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const result = (await response.json()) as {
    error?: string;
    code?: string;
    locked?: boolean;
  };
  if (!response.ok) {
    const message =
      response.status === 401
        ? "Sesi berakhir. Silakan masuk kembali."
        : result.error || "Permintaan gagal diproses.";
    throw new AdminRequestError(
      message,
      response.status,
      result.code,
      Boolean(result.locked),
    );
  }
  return result as T;
}

export function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString("id-ID", {
        timeZone: "Asia/Makassar",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Tidak tercatat";
}
