import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured } from "@/lib/backend-config";
import { contentSecurityPolicy } from "@/lib/security-headers";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const nextResponse = () => {
    requestHeaders.set("cookie", request.headers.get("cookie") || "");
    const result = NextResponse.next({ request: { headers: requestHeaders } });
    result.headers.set("Content-Security-Policy", policy);
    result.headers.set("X-Content-Type-Options", "nosniff");
    result.headers.set("X-Frame-Options", "DENY");
    result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  let response = nextResponse();
  const authPath = /^\/(admin(?:\/|$)|api\/(admin|pendaftaran)(?:\/|$))/.test(request.nextUrl.pathname);
  if (!authPath || !isAuthConfigured()) return response;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    },
  );
  await client.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|pdf)$).*)"],
};
