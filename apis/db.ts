import * as SQLite from "expo-sqlite";

const dbPromise = (async () => {
  const db = await SQLite.openDatabaseAsync("db.db");

  await db.runAsync(`CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    project TEXT,
    projectID INTEGER,
    description TEXT,
    tags TEXT,
    color TEXT,
    icon TEXT
  );`);

  // await db.runAsync(`DROP TABLE IF EXISTS projects;`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    name TEXT,
    color TEXT,
    icon TEXT
  );`);

  return db;
})();

const Database = {
  getTemplates: async () => {
    const db = await dbPromise;
    const data = await db.getAllAsync<{
      id: number;
      name: string;
      project: string;
      projectID: number;
      description: string;
      tags: string;
      color: string;
      icon: string;
    }>(`SELECT * FROM templates;`, []);
    return data.map((row) => ({ ...row, tags: row.tags.split(",") }));
  },

  setTemplates: async (
    templates: {
      name: string;
      project: string;
      projectID: number;
      description: string;
      tags: string[];
      color: string;
      icon: string;
    }[],
  ) => {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM templates;`, []);
    for (const template of templates) {
      const tags = template.tags.join(",");
      await db.runAsync(
        `INSERT INTO templates (name, project, projectID, description, tags, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          template.name,
          template.project,
          template.projectID,
          template.description,
          tags,
          template.color,
          template.icon,
        ],
      );
    }
  },

  getProjects: async () => {
    const db = await dbPromise;
    return await db.getAllAsync<{
      id: number;
      name: string;
      color: string;
      icon: string;
    }>(`SELECT * FROM projects;`, []);
  },

  setProjects: async (
    projects: {
      id: number;
      name: string;
      color: string;
      icon: string;
    }[],
  ) => {
    const db = await dbPromise;
    await db.withExclusiveTransactionAsync(async () => {
      // await db.runAsync(`DELETE FROM projects;`, []);
      for (const project of projects) {
        const res = await db.runAsync(
          `INSERT OR REPLACE INTO projects (id, name, color, icon) VALUES (?, ?, ?, ?);`,
          // `INSERT INTO projects (id, name, color, icon) VALUES (?, ?, ?, ?);`,
          [project.id, project.name, project.color, project.icon],
        );
      }
    });
  },

  editProject: async (
    id: number,
    name: string,
    color: string,
    icon: string,
  ) => {
    const db = await dbPromise;
    return db.runAsync(
      `UPDATE projects SET name = ?, color = ?, icon = ? WHERE id = ?;`,
      [name, color, icon, id],
    );
  },
};

export default Database;
