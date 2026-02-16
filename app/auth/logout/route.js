import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../_lib/supabase/server";
import { getRequestOrigin } from "../../_lib/request-origin";

export async function GET(request) {
  const origin = getRequestOrigin(request);
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", origin));
}
