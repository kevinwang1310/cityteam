type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params?.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  const hasError = params?.error === "1";

  return (
    <main className="login-shell">
      <section className="login-card">
        <img className="login-logo" src="/cityteamlogo.svg" alt="CityTeam" />
        <div>
          <p className="eyebrow">Private access</p>
          <h1>Run Club</h1>
          <p className="login-copy">Enter the password to open the CityTeam Run Club app.</p>
        </div>
        <form className="login-form" action="/api/site-login" method="post">
          <input type="hidden" name="next" value={nextPath} />
          <label>
            <span>Password</span>
            <input
              autoFocus
              name="password"
              type="password"
              placeholder="Enter password"
              aria-invalid={hasError}
            />
          </label>
          {hasError && <p className="login-error">That password did not match. Please try again.</p>}
          <button className="primary-action" type="submit">Unlock App</button>
        </form>
      </section>
    </main>
  );
}
