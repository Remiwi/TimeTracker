import * as SQLite from "expo-sqlite";
import { DBProject, Project, TogglProject } from "./types";

const dbPromise = (async () => {
  const db = await SQLite.openDatabaseAsync("db.db");

  // await db.runAsync(`DROP TABLE IF EXISTS templates;`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    project_id INTEGER,
    description TEXT,
    tags TEXT
  );`);

  // await db.runAsync(`DROP TABLE IF EXISTS projects;`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    name TEXT,
    color TEXT,
    created_at TEXT,
    at TEXT,
    icon TEXT,
    to_delete INTEGER
  );`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS local_ids (
    type TEXT PRIMARY KEY,
    id INTEGER
  );`);

  await db.runAsync(
    `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('project', -1);`,
  );

  return db;
})();

const Database = {
  Projects: {
    getAll: async () => {
      const db = await dbPromise;
      return await db.getAllAsync<DBProject>(`SELECT * FROM projects;`, []);
    },

    getAllVisible: async () => {
      const db = await dbPromise;
      return await db.getAllAsync<DBProject>(
        `SELECT * FROM projects WHERE to_delete = 0;`,
        [],
      );
    },

    createFromToggl: async (project: TogglProject) => {
      const db = await dbPromise;
      await db.runAsync(
        `INSERT INTO projects (id, name, color, created_at, at, icon, to_delete)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          project.id,
          project.name,
          project.color,
          project.created_at,
          project.at,
          "",
          0,
        ],
      );
    },

    createLocal: async (project: Project) => {
      const db = await dbPromise;
      let res_id: any = undefined;
      await db.withExclusiveTransactionAsync(async (tx) => {
        const id = (
          (await tx.getFirstAsync(
            `SELECT id FROM local_ids WHERE type = 'project';`,
            [],
          )) as any
        ).id as number;

        res_id = id;

        await tx.runAsync(
          `INSERT INTO projects (id, name, color, created_at, at, icon, to_delete)
          VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            project.name,
            project.color,
            project.created_at,
            project.at,
            "",
            0,
          ],
        );

        await tx.runAsync(
          `UPDATE local_ids SET id = id - 1 WHERE type = 'project';`,
          [],
        );
      });
      const proj = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [res_id as number],
      );
      if (proj === null) {
        throw Error("Project not found after creation");
      }
      return proj;
    },

    syncLocalWithRemote: async (local_id: number, remote: TogglProject) => {
      const db = await dbPromise;
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(
          `UPDATE projects SET
            id = ?,
            name = ?,
            color = ?,
            created_at = ?,
            at = ?
          WHERE id = ?;`,
          [
            remote.id,
            remote.name,
            remote.color,
            remote.created_at,
            remote.at,
            local_id,
          ],
        );

        // update it's usage as foreign key in templates
        // update it's usage as foreign key in entries
      });
    },

    delete: async (id: number) => {
      const db = await dbPromise;
      await db.runAsync(`DELETE FROM projects WHERE id = ?;`, [id]);
    },

    markDeleted: async (id: number) => {
      const db = await dbPromise;
      await db.runAsync(`UPDATE projects SET to_delete = 1 WHERE id = ?;`, [
        id,
      ]);
    },

    editWithLocalData: async (project: Project) => {
      const db = await dbPromise;
      await db.runAsync(
        `UPDATE projects SET
          name = ?,
          color = ?,
          icon = ?,
          at = ?
        WHERE id = ?;`,
        [
          project.name,
          project.color,
          project.icon,
          Date.now().toString(),
          project.id,
        ],
      );
    },

    editWithRemoteData: async (project: TogglProject) => {
      const db = await dbPromise;
      await db.runAsync(
        `UPDATE projects SET
          name = ?,
          color = ?,
          at = ?
        WHERE id = ?;`,
        [project.name, project.color, project.at, project.id],
      );
    },
  },

  Templates: {
    getAll: async () => {
      const db = await dbPromise;
      const data = await db.getAllAsync<{
        id: number;
        name: string;
        projectID: number;
        description: string;
        tags: string;
      }>(`SELECT * FROM templates;`, []);
      return data.map((row) => ({ ...row, tags: row.tags.split(",") }));
    },

    set: async (
      templates: {
        name: string;
        projectID: number;
        description: string;
        tags: string[];
      }[],
    ) => {
      const db = await dbPromise;
      await db.runAsync(`DELETE FROM templates;`, []);
      for (const template of templates) {
        const tags = template.tags.join(",");
        await db.runAsync(
          `INSERT INTO templates (name, projectID, description, tags) VALUES (?, ?, ?, ?);`,
          [template.name, template.projectID, template.description, tags],
        );
      }
    },
  },
};

export default Database;
