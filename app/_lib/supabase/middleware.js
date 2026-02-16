import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";
import { BYPASS_AUTH } from "../runtime-flags";
import { getRequestOrigin } from "../request-origin";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/auth/callback",
  "/auth/login",
  "/auth/logout",
  "/auth/debug",
]);

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/)
  );
}

export async function updateSession(request) {
  const origin = getRequestOrigin(request);
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  if (BYPASS_AUTH) {
    return response;
  }

  let url;
  let publishableKey;
  try {
    url = getSupabaseUrl();
    publishableKey = getSupabasePublishableKey();
  } catch {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  if (isStaticAsset(pathname)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", origin));
  }

  if (!user && !PUBLIC_PATHS.has(pathname) && !pathname.startsWith("/api")) {
    const next = `${pathname}${request.nextUrl.search || ""}`;
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
