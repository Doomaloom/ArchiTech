import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../_lib/supabase/server";

export async function GET(request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
