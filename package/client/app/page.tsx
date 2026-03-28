import Link from "next/link";

const features = [
  {
    title: "Realtime rooms per file",
    copy:
      "Yjs-backed collaboration with Monaco, cursor awareness, typing presence, and synchronized editing.",
  },
  {
    title: "Recoverable version history",
    copy:
      "Important saves become snapshots, so teams can inspect and restore previous file states without guesswork.",
  },
  {
    title: "Permission-aware workspaces",
    copy:
      "Owners, editors, and viewers all work in the same project with the right level of access enforced by the API.",
  },
];

const highlights = [
  "Next.js + App Router",
  "Dedicated Yjs websocket server",
  "MongoDB + Prisma persistence",
  "Shared workspace contracts",
];

export default function Home() {
  return (
    <main className="marketing-shell">
      <section className="marketing-hero">
        <div className="marketing-nav">
          <div>
            <p className="workspace-eyebrow">CodeSync</p>
            <h1 className="marketing-brand">
              Collaborative coding, without the prototype energy.
            </h1>
          </div>
          <div className="marketing-nav-actions">
            <Link href="/login" className="secondary-action marketing-link">
              Log in
            </Link>
            <Link href="/signup" className="primary-action marketing-link">
              Start building
            </Link>
          </div>
        </div>

        <div className="marketing-hero-grid">
          <div className="marketing-copy">
            <span className="marketing-pill">
              Realtime editing, role-based access, built-in restore flow
            </span>
            <h2 className="marketing-headline">
              Build in a shared workspace your team can actually demo with confidence.
            </h2>
            <p className="marketing-subcopy">
              CodeSync brings together authenticated projects, collaborative editing,
              file history, and typed fullstack contracts in one focused environment
              built for serious demos and real engineering conversations.
            </p>
            <div className="marketing-cta-row">
              <Link href="/dashboard" className="primary-action marketing-cta">
                Open dashboard
              </Link>
              <Link href="/signup" className="secondary-action marketing-cta">
                Create account
              </Link>
            </div>
            <div className="marketing-highlight-grid">
              {highlights.map((item) => (
                <span key={item} className="marketing-highlight">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="marketing-preview">
            <div className="marketing-preview-window">
              <div className="marketing-preview-topbar">
                <span className="marketing-dot marketing-dot-red" />
                <span className="marketing-dot marketing-dot-amber" />
                <span className="marketing-dot marketing-dot-green" />
              </div>
              <div className="marketing-preview-body">
                <div className="marketing-preview-column">
                  <p className="workspace-card-kicker">Workspace</p>
                  <h3 className="marketing-preview-title">
                    Review sprint-ready changes with the whole team in the room.
                  </h3>
                  <div className="marketing-preview-list">
                    <div className="marketing-preview-item">
                      Protected auth, access control, and file APIs
                    </div>
                    <div className="marketing-preview-item">
                      Shared editing with presence indicators
                    </div>
                    <div className="marketing-preview-item">
                      Snapshot restore flow for safer demos
                    </div>
                  </div>
                </div>
                <div className="marketing-activity-card">
                  <div className="marketing-activity-row">
                    <span className="marketing-activity-label">Status</span>
                    <span className="status-pill status-pill-connected">
                      Realtime connected
                    </span>
                  </div>
                  <div className="marketing-activity-row">
                    <span className="marketing-activity-label">Latest event</span>
                    <span className="marketing-activity-value">
                      Snapshot restored 2 minutes ago
                    </span>
                  </div>
                  <div className="marketing-activity-row">
                    <span className="marketing-activity-label">Roles</span>
                    <span className="marketing-activity-value">
                      Owner, editor, viewer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-section-header">
          <p className="workspace-card-kicker">Why it lands</p>
          <h2 className="workspace-title marketing-section-title">
            Built for strong demos, but grounded in real system design.
          </h2>
        </div>
        <div className="marketing-feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="marketing-feature-card">
              <h3 className="marketing-feature-title">{feature.title}</h3>
              <p className="marketing-feature-copy">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
