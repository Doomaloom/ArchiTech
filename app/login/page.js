import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../_lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "/";
  const error = typeof params?.error === "string" ? params.error : "";

  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="landing-kicker">Welcome back</p>
        <h1>Sign in to continue.</h1>
        <p>Google OAuth is required to access your private projects.</p>
        {error ? <p className="landing-error">{error}</p> : null}
        <div className="landing-actions">
          <Link
            className="landing-button"
            href={`/auth/login?next=${encodeURIComponent(next)}`}
          >
            Continue with Google
          </Link>
          <Link className="landing-link" href="/">
            Back to landing
          </Link>
        </div>
      </section>
    </main>
  );
}
