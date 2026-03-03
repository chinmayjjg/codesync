"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CreateProject() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data || []);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Error fetching projects"));
    }
  }

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
      setProjects(prev => [project, ...prev]);
      setName("");
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Error creating project"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Create project</h2>
      <form onSubmit={handleCreate}>
        <input
          aria-label="Project name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New project name"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h3>Your projects</h3>
      <ul>
        {projects.length === 0 && <li>No projects yet.</li>}
        {projects.map(p => (
          <li key={p.id}>
            <a href={`/projects/${p.id}`}>{p.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
