"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    window.location.href = result?.url ?? "/dashboard";
  };

  return (
    <main className="auth-shell">
      <div className="auth-frame">
        <section className="auth-brand-panel">
          <div className="auth-brand-header">
            <p className="workspace-eyebrow">CodeSync</p>
            <Link href="/" className="secondary-action auth-inline-link">
              Back home
            </Link>
          </div>

          <div className="auth-brand-content">
            <h1 className="auth-hero-title">Welcome back.</h1>
            <p className="auth-hero-copy">
              Sign in to open your workspace, continue active projects, and get back
              into collaborative editing without losing momentum.
            </p>
          </div>

          <div className="auth-brand-stack">
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Realtime editing</span>
              <strong className="auth-brand-card-value">Live cursor presence</strong>
            </div>
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Project access</span>
              <strong className="auth-brand-card-value">Owner, editor, viewer</strong>
            </div>
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Recovery flow</span>
              <strong className="auth-brand-card-value">Snapshot restore ready</strong>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="workspace-eyebrow">Login</p>
            <h2 className="auth-card-title">Sign in to your account</h2>
            <p className="auth-card-copy">
              Use your email and password to continue to the dashboard.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="you@team.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <div className="auth-field-row">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
              </div>
              <input
                id="password"
                className="auth-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}

            <button className="primary-action auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="auth-footer-link">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
