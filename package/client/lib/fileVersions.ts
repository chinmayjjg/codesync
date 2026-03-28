import type { FileVersionEntry } from "@codesync/shared";
import { prisma } from "./prisma";

type FileVersionRecord = {
  id: string;
  fileId: string;
  projectId: string;
  content: string;
  createdAt: Date;
  createdById?: string | null;
  restoredFromVersionId?: string | null;
};

function getFileVersionDelegate() {
  return (prisma as typeof prisma & {
    fileVersion: {
      findFirst: (args: unknown) => Promise<FileVersionRecord | null>;
      findMany: (args: unknown) => Promise<FileVersionRecord[]>;
      findUnique: (args: unknown) => Promise<FileVersionRecord | null>;
      create: (args: unknown) => Promise<FileVersionRecord>;
    };
  }).fileVersion;
}

export function normalizeFileVersion(
  version: FileVersionRecord
): FileVersionEntry {
  return {
    id: version.id,
    fileId: version.fileId,
    projectId: version.projectId,
    content: version.content,
    createdAt: version.createdAt.toISOString(),
    createdById: version.createdById ?? null,
    restoredFromVersionId: version.restoredFromVersionId ?? null,
  };
}

export async function listFileVersions(fileId: string) {
  const versions = await getFileVersionDelegate().findMany({
    where: { fileId },
    orderBy: { createdAt: "desc" },
  });

  return versions.map(normalizeFileVersion);
}

export async function getFileVersionById(versionId: string) {
  const version = await getFileVersionDelegate().findUnique({
    where: { id: versionId },
  });

  return version ? normalizeFileVersion(version) : null;
}

export async function recordFileVersion(input: {
  fileId: string;
  projectId: string;
  content: string;
  createdById?: string | null;
  restoredFromVersionId?: string | null;
}) {
  const delegate = getFileVersionDelegate();
  const latestVersion = await delegate.findFirst({
    where: { fileId: input.fileId },
    orderBy: { createdAt: "desc" },
  });

  if (
    latestVersion &&
    latestVersion.content === input.content &&
    latestVersion.restoredFromVersionId ===
      (input.restoredFromVersionId ?? null)
  ) {
    return normalizeFileVersion(latestVersion);
  }

  const createdVersion = await delegate.create({
    data: {
      fileId: input.fileId,
      projectId: input.projectId,
      content: input.content,
      createdById: input.createdById ?? null,
      restoredFromVersionId: input.restoredFromVersionId ?? null,
    },
  });

  return normalizeFileVersion(createdVersion);
}
