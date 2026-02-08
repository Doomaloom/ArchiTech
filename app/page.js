import AppShell from "./components/app-shell";
import WorkspaceHome from "./_components/workspace-home";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <AppShell>
      <WorkspaceHome />
    </AppShell>
  );
}
