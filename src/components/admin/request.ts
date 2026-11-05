export async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Sesi berakhir. Silakan masuk kembali."
        : result.error || "Permintaan gagal diproses.",
    );
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
