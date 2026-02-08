import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../_lib/supabase/server";

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
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = resolveNextPath(requestUrl.searchParams.get("next"));
  const fallbackRedirect = new URL("/login", request.url);
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

  return NextResponse.redirect(new URL(nextPath, request.url));
}
