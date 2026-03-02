"use client";

import { useEffect, useState } from "react";

function ProjectsList() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then(setProjects);
  }, []);

  return (
    <ul>
      {projects.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}

export default ProjectsList;