import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../_lib/supabase/server";
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

export async function GET(request) {
  const origin = getRequestOrigin(request);
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveNextPath(requestUrl.searchParams.get("next"));
  if (BYPASS_AUTH) {
    return NextResponse.redirect(new URL("/", origin));
  }
  const fallbackRedirect = new URL("/login", origin);
  fallbackRedirect.searchParams.set("next", nextPath);

  if (!code) {
    fallbackRedirect.searchParams.set("error", "Missing auth code.");
    return NextResponse.redirect(fallbackRedirect);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    fallbackRedirect.searchParams.set("error", "Sign in failed.");
    return NextResponse.redirect(fallbackRedirect);
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
