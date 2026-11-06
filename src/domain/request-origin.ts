export function hasSameOrigin(
  url: string,
  host: string | null,
  origin: string | null,
): boolean {
  if (!origin) return false;
  try {
    const requestUrl = new URL(url);
    const expected = host
      ? new URL(`${requestUrl.protocol}//${host}`)
      : requestUrl;
    if (
      expected.username ||
      expected.password ||
      (host && (expected.pathname !== "/" || expected.search || expected.hash))
    )
      return false;
    return origin === expected.origin;
  } catch {
    return false;
  }
}
