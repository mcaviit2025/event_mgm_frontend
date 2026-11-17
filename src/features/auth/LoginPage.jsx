import { useEffect, useState } from "react";
import { Brand } from "../../shared/components/Brand.jsx";
import { Alert } from "../../shared/components/Alert.jsx";
import { formatError } from "../../utils/eventFormatters.js";

export function LoginPage({ initialError, onClearError, onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setError(initialError), [initialError]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    onClearError();
    try {
      await onLogin(credentials);
    } catch (loginError) {
      setError(formatError(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-art" aria-label="Gather event management">
        <Brand light />
        <div className="art-copy">
          <div className="eyebrow">MAKE IT HAPPEN</div>
          <h1>Good things<br />happen when<br /><em>we gather.</em></h1>
          <p>Your events, thoughtfully organized in one place.</p>
        </div>
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-orbit orbit-three" />
        <div className="art-note">
          <span aria-hidden="true">✳</span>
          <div><strong>Make room for moments</strong><small>Everything begins with an idea.</small></div>
        </div>
        <span className="art-footer">EVENTS WORTH SHOWING UP FOR</span>
      </section>

      <section className="login-content">
        <div className="login-mobile-brand"><Brand /></div>
        <div className="login-form-wrap">
          <div className="login-kicker"><span className="status-dot" /> ADMIN WORKSPACE</div>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to manage your events and community.</p>
          {error && <Alert variant="error">{error}</Alert>}
          <form className="login-form" onSubmit={submit}>
            <label>
              Username
              <input
                autoComplete="username"
                required
                value={credentials.username}
                onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
                placeholder="Enter your username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
                placeholder="Enter your password"
              />
            </label>
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="login-security"><span aria-hidden="true">▣</span> Secure sign in powered by your event management API</div>
        </div>
        <footer className="login-bottom">
          <span>© {new Date().getFullYear()} Gather</span>
          <span>Made for the moments that matter.</span>
        </footer>
      </section>
    </main>
  );
}
