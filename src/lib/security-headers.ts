export function contentSecurityPolicy(nonce: string, development: boolean, supabaseUrl?: string, requestUrl?: string) {
  const storage = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const request = requestUrl ? new URL(requestUrl) : undefined;
  const localHttp = request?.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(request.hostname);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${storage} https://picsum.photos https://fastly.picsum.photos`,
    "font-src 'self'",
    `connect-src 'self' ${storage}${development ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development || localHttp ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function serializeJsonForHtml(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
