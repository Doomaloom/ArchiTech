import AppShell from "./components/app-shell";
import LandingPage from "./_components/landing-page";
import WorkspaceHome from "./_components/workspace-home";
import { createServerSupabaseClient } from "./_lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  return (
    <AppShell>
      <WorkspaceHome />
    </AppShell>
  );
}
