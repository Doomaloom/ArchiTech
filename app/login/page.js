import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../_lib/supabase/server";
import { BYPASS_AUTH } from "../_lib/runtime-flags";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  if (!BYPASS_AUTH) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  }

  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "/";
  const error = typeof params?.error === "string" ? params.error : "";
  const loginHref = BYPASS_AUTH
    ? next
    : `/auth/login?next=${encodeURIComponent(next)}`;

  return (
    <main className="landing-shell login-shell">
      <section className="landing-panel login-panel">
        <p className="landing-kicker">Sign into</p>
        <h1>
          <span className="proto-wordmark">ProtoBop.</span>
        </h1>
        <p>
          {BYPASS_AUTH
            ? "Auth bypass mode is enabled. Continue directly to the app."
            : "Continue with Google to access your private ProtoBop projects."}
        </p>
        {error ? <p className="landing-error">{error}</p> : null}
        <div className="landing-actions">
          <Link className="landing-button landing-button-google" href={loginHref}>
            <span className="landing-button-google-icon" aria-hidden="true">
              <svg viewBox="0 0 18 18" role="img" aria-label="Google">
                <path
                  fill="#EA4335"
                  d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7963 2.7155v2.2582h2.9089c1.7027-1.5673 2.6838-3.8741 2.6838-6.6146z"
                />
                <path
                  fill="#4285F4"
                  d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1809l-2.9089-2.2582c-.8055.54-1.8368.8591-3.0475.8591-2.3441 0-4.3282-1.5832-5.0359-3.7105H.9577v2.3318C2.4382 15.9832 5.4818 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.9641 10.7095c-.18-.54-.2823-1.1168-.2823-1.7095s.1023-1.1695.2823-1.7095V4.9582H.9577C.3477 6.1732 0 7.5505 0 9s.3477 2.8268.9577 4.0418l3.0064-2.3323z"
                />
                <path
                  fill="#34A853"
                  d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5809-2.5809C13.4632.8918 11.4268 0 9 0 5.4818 0 2.4382 2.0168.9577 4.9582l3.0064 2.3323C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
                />
              </svg>
            </span>
            <span>{BYPASS_AUTH ? "Enter app" : "Continue with Google"}</span>
          </Link>
          <Link className="landing-link" href="/">
            Back to ProtoBop
          </Link>
        </div>
      </section>
    </main>
  );
}
