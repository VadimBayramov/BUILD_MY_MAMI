import type { ProjectDocument } from '@typedefs/project';

const PREFIX = 'funnel-builder:project:';
const INDEX_KEY = 'funnel-builder:projects-index';

type IndexEntry = { id: string; name: string; updatedAt: string };

function readIndex(): IndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: IndexEntry[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function upsertIndex(project: ProjectDocument): void {
  const entries = readIndex().filter((e) => e.id !== project.id);
  entries.push({
    id: project.id,
    name: project.funnel.meta.name,
    updatedAt: project.updatedAt,
  });
  writeIndex(entries);
}

export async function saveProject(project: ProjectDocument): Promise<void> {
  localStorage.setItem(PREFIX + project.id, JSON.stringify(project));
  upsertIndex(project);
}

export async function loadProject(id: string): Promise<ProjectDocument | null> {
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectDocument;
  } catch {
    return null;
  }
}

export async function listProjects(): Promise<IndexEntry[]> {
  return readIndex().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function deleteProject(id: string): Promise<void> {
  localStorage.removeItem(PREFIX + id);
  writeIndex(readIndex().filter((e) => e.id !== id));
}
