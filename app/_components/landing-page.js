import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel">
        <p className="landing-kicker">ArchiTech</p>
        <h1>Turn visual ideas into production-ready site flows.</h1>
        <p>
          Generate structure, preview variants, iterate in the visual editor, and
          ship code with a private project history.
        </p>
        <div className="landing-actions">
          <Link className="landing-button" href="/login">
            Continue with Google
          </Link>
          <a
            className="landing-link"
            href="https://supabase.com/docs/guides/auth/social-login/auth-google"
            target="_blank"
            rel="noreferrer"
          >
            Auth setup guide
          </a>
        </div>
      </section>
    </main>
  );
}
