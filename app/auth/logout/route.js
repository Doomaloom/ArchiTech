import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "../../_lib/supabase/env";
import { getRequestOrigin } from "../../_lib/request-origin";

export async function GET(request) {
  const origin = getRequestOrigin(request);
  const response = NextResponse.redirect(new URL("/", origin));
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
  await supabase.auth.signOut();
  return response;
}
