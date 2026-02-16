import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../_lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const cookies = request.cookies.getAll().map(({ name }) => name);

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    authError: error?.message ?? null,
    cookieNames: cookies,
  });
}
