import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "../../_lib/supabase/env";
import { BYPASS_AUTH } from "../../_lib/runtime-flags";
import { getRequestOrigin } from "../../_lib/request-origin";

function resolveNextPath(nextValue) {
  if (typeof nextValue !== "string") {
    return "/";
  }
  if (!nextValue.startsWith("/") || nextValue.startsWith("//")) {
    return "/";
  }
  return nextValue;
}

function formatAuthError(message) {
  if (typeof message !== "string") {
    return "Sign in failed.";
  }
  const sanitized = message.replace(/\s+/g, " ").trim();
  if (!sanitized) {
    return "Sign in failed.";
  }
  return sanitized.length > 200 ? `${sanitized.slice(0, 200)}…` : sanitized;
}

export async function GET(request) {
  const origin = getRequestOrigin(request);
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveNextPath(requestUrl.searchParams.get("next"));
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get(
    "error_description"
  );
  if (BYPASS_AUTH) {
    return NextResponse.redirect(new URL("/", origin));
  }
  const fallbackRedirect = new URL("/login", origin);
  fallbackRedirect.searchParams.set("next", nextPath);

  if (oauthError) {
    const combined = oauthErrorDescription
      ? `${oauthError}: ${oauthErrorDescription}`
      : oauthError;
    fallbackRedirect.searchParams.set("error", formatAuthError(combined));
    return NextResponse.redirect(fallbackRedirect);
  }

  if (!code) {
    fallbackRedirect.searchParams.set(
      "error",
      formatAuthError("Missing auth code.")
    );
    return NextResponse.redirect(fallbackRedirect);
  }

  const response = NextResponse.redirect(new URL(nextPath, origin));
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    fallbackRedirect.searchParams.set(
      "error",
      formatAuthError(`Sign in failed: ${error.message ?? "Unknown error"}`)
    );
    return NextResponse.redirect(fallbackRedirect);
  }

  return response;
}
