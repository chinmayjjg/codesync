"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const text = await res.text();

      if (!text) {
        throw new Error("Empty response from server");
      }

      const data = JSON.parse(text);

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      setSuccess("Account created. Signing you in...");

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (loginResult?.error) {
        router.push("/login");
        return;
      }

      window.location.href = loginResult?.url ?? "/dashboard";
    } catch (caughtError: unknown) {
      console.error("Signup Error:", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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
            <h1 className="auth-hero-title">Create your account.</h1>
            <p className="auth-hero-copy">
              Start a new workspace, invite collaborators, and keep every project
              tied to authenticated access from the first session.
            </p>
          </div>

          <div className="auth-brand-stack">
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Built for teams</span>
              <strong className="auth-brand-card-value">Shared editing rooms</strong>
            </div>
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Permissions</span>
              <strong className="auth-brand-card-value">Granular workspace roles</strong>
            </div>
            <div className="auth-brand-card">
              <span className="auth-brand-card-label">Passwords</span>
              <strong className="auth-brand-card-value">8 to 128 characters</strong>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="workspace-eyebrow">Signup</p>
            <h2 className="auth-card-title">Create your account</h2>
            <p className="auth-card-copy">
              Set up your profile and we&apos;ll take you straight to the dashboard.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSignup}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="auth-input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>

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
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="auth-input"
                type="password"
                placeholder="8 to 128 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error ? <p className="auth-feedback auth-feedback-error">{error}</p> : null}
            {success ? (
              <p className="auth-feedback auth-feedback-success">{success}</p>
            ) : null}

            <button className="primary-action auth-submit" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <Link href="/login" className="auth-footer-link">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
