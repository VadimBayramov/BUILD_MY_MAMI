import type { ProjectDocument } from '@typedefs/project';
import {
  builderDb,
  clearLastOpenedProjectId,
  getLastOpenedProjectId,
  setLastOpenedProjectId,
} from '@store/middleware/persist';

type IndexEntry = { id: string; name: string; updatedAt: string };

export async function saveProject(project: ProjectDocument): Promise<void> {
  await builderDb.projects.put(project);
  setLastOpenedProjectId(project.id);
}

export async function loadProject(id: string): Promise<ProjectDocument | null> {
  const project = await builderDb.projects.get(id);
  if (project) {
    setLastOpenedProjectId(project.id);
  }
  return project ?? null;
}

export async function listProjects(): Promise<IndexEntry[]> {
  const projects = await builderDb.projects.orderBy('updatedAt').reverse().toArray();

  return projects.map((project) => ({
    id: project.id,
    name: project.funnel.meta.name,
    updatedAt: project.updatedAt,
  }));
}

export async function deleteProject(id: string): Promise<void> {
  await builderDb.projects.delete(id);

  if (getLastOpenedProjectId() === id) {
    clearLastOpenedProjectId();
  }
}
