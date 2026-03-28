"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  createdAt?: string | Date;
  fileCount?: number;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CreateProject({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProjects() {
    setLoadingProjects(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      const body = (await res.json().catch(() => [])) as
        | Project[]
        | { error?: string };

      if (!res.ok || !Array.isArray(body)) {
        throw new Error(
          Array.isArray(body)
            ? "Failed to load projects"
            : body.error || "Failed to load projects"
        );
      }

      const data = body;
      setProjects(data || []);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Error fetching projects"));
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    setProjects(initialProjects);
    setLoadingProjects(false);
  }, [initialProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create project");
      }

      const project: Project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setName("");
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Error creating project"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard-grid">
      <div className="dashboard-panel dashboard-panel-strong">
        <div className="workspace-card-header">
          <div>
            <p className="workspace-card-kicker">Create</p>
            <h2 className="workspace-card-title">Start a new project</h2>
          </div>
          <span className="role-badge">Fast setup</span>
        </div>
        <p className="dashboard-panel-copy">
          Spin up a shared coding workspace with collaborative editing, version
          history, and role-based access in a couple of clicks.
        </p>
        <form onSubmit={handleCreate} className="dashboard-create-form">
          <label className="dashboard-field-label" htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Realtime API sandbox"
            className="dashboard-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="primary-action dashboard-submit"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
        </form>

        {error && <p className="dashboard-error">{error}</p>}

        <div className="dashboard-tip-card">
          <p className="workspace-card-kicker">Tip</p>
          <p className="dashboard-tip-copy">
            Strong demos land better when each project has a clear purpose. Use
            one workspace per feature story or interview walkthrough.
          </p>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="workspace-card-header">
          <div>
            <p className="workspace-card-kicker">Projects</p>
            <h2 className="workspace-card-title">Your workspaces</h2>
          </div>
          <button
            type="button"
            onClick={() => void fetchProjects()}
            className="secondary-action dashboard-refresh"
          >
            {loadingProjects ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingProjects ? (
          <div className="empty-panel dashboard-empty">
            <p className="empty-panel-title">Loading projects</p>
            <p className="empty-panel-copy">
              Fetching your latest workspaces and file activity.
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-panel dashboard-empty">
            <p className="empty-panel-title">No projects yet</p>
            <p className="empty-panel-copy">
              Create your first workspace to start collaborating on files in
              real time.
            </p>
          </div>
        ) : (
          <div className="dashboard-project-list">
            {projects.map((project) => (
              <article key={project.id} className="dashboard-project-card">
                <div>
                  <h3 className="dashboard-project-title">{project.name}</h3>
                  <p className="dashboard-project-meta">
                    {(project.fileCount ?? 0) === 1
                      ? "1 file"
                      : `${project.fileCount ?? 0} files`}
                  </p>
                </div>
                <Link
                  href={`/projects/${project.id}`}
                  className="primary-action dashboard-project-link"
                >
                  Open workspace
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
