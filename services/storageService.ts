import { openDB, DBSchema } from 'idb';
import { ProjectData } from '../types';

interface CircuitMindDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectData;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'circuit-mind-db';
const STORE_NAME = 'projects';

const getDB = async () => {
  return openDB<CircuitMindDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
      });
      store.createIndex('by-date', 'timestamp');
    },
  });
};

export const saveProject = async (project: ProjectData): Promise<void> => {
  const db = await getDB();
  await db.put(STORE_NAME, project);
};

export const getAllProjects = async (): Promise<ProjectData[]> => {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
};

export const getProject = async (id: string): Promise<ProjectData | undefined> => {
  const db = await getDB();
  return db.get(STORE_NAME, id);
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
};
