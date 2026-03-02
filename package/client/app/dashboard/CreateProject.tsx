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
      <a href={`/projects/${project.id}`}>
      {project.name}
       </a>
    </ul>
  );
}

export default ProjectsList;