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
  const nextPath = resolveNextPath(request.nextUrl.searchParams.get("next"));
  if (BYPASS_AUTH) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const supabase = await createServerSupabaseClient();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data?.url) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "Unable to start Google sign in.");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(data.url);
}
