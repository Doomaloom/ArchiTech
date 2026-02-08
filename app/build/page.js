import { redirect } from "next/navigation";
import BuildFlow from "../_components/build-flow";
import AppShell from "../components/app-shell";
import { createServerSupabaseClient } from "../_lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BuildPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Fbuild");
  }

  return (
    <AppShell>
      <BuildFlow />
    </AppShell>
  );
}
