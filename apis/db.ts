import * as SQLite from "expo-sqlite";
import { DBProject, Project, TogglProject } from "./types";

const db = SQLite.openDatabaseSync("db.db");

const Database = {
  Manage: {
    intializeDBSync: () => {
      db.runSync(`CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          project_id INTEGER,
          description TEXT,
          tags TEXT
        );`);

      db.runSync(`CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY,
          name TEXT,
          color TEXT,
          at TEXT,
          active INTEGER,
          icon TEXT,
          to_delete INTEGER
        );`);

      db.runSync(`CREATE TABLE IF NOT EXISTS local_ids (
          type TEXT PRIMARY KEY,
          id INTEGER
        );`);
      db.runSync(
        `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('project', -1);`,
      );
    },

    dropAllTablesSync: () => {
      db.runSync(`DROP TABLE IF EXISTS templates;`);
      db.runSync(`DROP TABLE IF EXISTS projects;`);
      db.runSync(`DROP TABLE IF EXISTS local_ids;`);
    },

    initializeDBAsync: async () => {
      await db.runAsync(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        project_id INTEGER,
        description TEXT,
        tags TEXT
      );`);

      await db.runAsync(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        name TEXT,
        color TEXT,
        at TEXT,
        active INTEGER,
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
    },

    dropAllTablesAsync: async () => {
      await db.runAsync(`DROP TABLE IF EXISTS templates;`);
      await db.runAsync(`DROP TABLE IF EXISTS projects;`);
      await db.runAsync(`DROP TABLE IF EXISTS local_ids;`);
    },
  },

  Projects: {
    getAll: async () => {
      return await db.getAllAsync<DBProject>(`SELECT * FROM projects;`, []);
    },

    getAllVisible: async () => {
      return await db.getAllAsync<DBProject>(
        `SELECT * FROM projects WHERE to_delete = 0;`,
        [],
      );
    },

    createFromToggl: async (project: TogglProject) => {
      await db.runAsync(
        `INSERT INTO projects (id, name, color, at, active, icon, to_delete)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          project.id,
          project.name,
          project.color,
          project.at,
          project.active ? 1 : 0,
          "",
          0,
        ],
      );
    },

    createLocal: async (project: Partial<Project> & { name: string }) => {
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
          `INSERT INTO projects (id, name, color, at, active, icon, to_delete)
          VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            project.name,
            project.color || "",
            project.at || "",
            project.active === undefined || project.active ? 1 : 0,
            project.icon || "",
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

    linkLocalWithRemote: async (local_id: number, remote: TogglProject) => {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(
          `UPDATE projects SET
            id = ?,
            name = ?,
            color = ?,
            at = ?,
            active = ?
          WHERE id = ?;`,
          [
            remote.id,
            remote.name,
            remote.color,
            remote.at,
            remote.active ? 1 : 0,
            local_id,
          ],
        );

        // update it's usage as foreign key in templates
        // update it's usage as foreign key in entries
      });

      return await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [remote.id],
      );
    },

    delete: async (id: number) => {
      await db.runAsync(`DELETE FROM projects WHERE id = ?;`, [id]);
    },

    markDeleted: async (id: number) => {
      await db.runAsync(`UPDATE projects SET to_delete = 1 WHERE id = ?;`, [
        id,
      ]);
    },

    editWithLocalData: async (project: Partial<Project> & { id: number }) => {
      const oldProject = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [project.id],
      );
      if (oldProject === null) {
        throw Error("Project not found");
      }

      await db.runAsync(
        `UPDATE projects SET
          name = ?,
          color = ?,
          icon = ?,
          at = ?,
          active = ?
        WHERE id = ?;`,
        [
          project.name || oldProject.name,
          project.color || oldProject.color,
          project.icon || oldProject.icon,
          new Date().toISOString(),
          project.active === undefined || project.active ? 1 : 0,
          project.id,
        ],
      );

      return await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [project.id],
      );
    },

    editWithRemoteData: async (project: TogglProject) => {
      const oldProject = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [project.id],
      );
      if (oldProject === null) {
        throw Error("Project not found");
      }

      await db.runAsync(
        `UPDATE projects SET
          name = ?,
          color = ?,
          at = ?,
          active = ?
        WHERE id = ?;`,
        [project.name, project.color, project.at, project.active, project.id],
      );

      return await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [project.id],
      );
    },
  },

  Templates: {
    getAll: async () => {
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

// Database.Manage.dropAllTablesSync();
Database.Manage.intializeDBSync();

export default Database;
