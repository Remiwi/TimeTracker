import * as SQLite from "expo-sqlite";
import {
  DBEntry,
  DBProject,
  DBTemplate,
  Entry,
  Project,
  Template,
  TogglProject,
} from "./types";

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

      db.runSync(`CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY,
          description TEXT,
          project_id INTEGER,
          start TEXT,
          stop TEXT,
          duration INTEGER,
          at TEXT,
          tags TEXT,
          linked INTEGER,
          to_delete INTEGER,
          need_push INTEGER
      );`);

      db.runSync(`CREATE TABLE IF NOT EXISTS local_ids (
          type TEXT PRIMARY KEY,
          id INTEGER
        );`);
      db.runSync(
        `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('project', -1);`,
      );
      db.runSync(
        `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('entries', -1);`,
      );
    },

    dropAllTablesSync: () => {
      db.runSync(`DROP TABLE IF EXISTS templates;`);
      db.runSync(`DROP TABLE IF EXISTS projects;`);
      db.runSync(`DROP TABLE IF EXISTS entries;`);
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

      await db.runAsync(`CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY,
        description TEXT,
        project_id INTEGER,
        start TEXT,
        stop TEXT,
        duration INTEGER,
        at TEXT,
        tags TEXT,
        linked INTEGER,
        to_delete INTEGER,
        need_push INTEGER
    );`);

      await db.runAsync(`CREATE TABLE IF NOT EXISTS local_ids (
        type TEXT PRIMARY KEY,
        id INTEGER
      );`);
      await db.runAsync(
        `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('project', -1);`,
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO local_ids (type, id) VALUES ('entries', -1);`,
      );
    },

    dropAllTablesAsync: async () => {
      await db.runAsync(`DROP TABLE IF EXISTS templates;`);
      await db.runAsync(`DROP TABLE IF EXISTS projects;`);
      await db.runAsync(`DROP TABLE IF EXISTS entries;`);
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
        `INSERT INTO projects (id, name, color, at, active, icon, linked, to_delete)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          project.id,
          project.name,
          project.color,
          project.at,
          project.active ? 1 : 0,
          "",
          1,
          0,
        ],
      );
    },

    createLocal: async (project: Partial<Project> & { name: string }) => {
      let res_id: any = undefined;
      await db.withExclusiveTransactionAsync(async (tx) => {
        // TODO: simplify this a bit... is any really needed?
        const id = (
          (await tx.getFirstAsync(
            `SELECT id FROM local_ids WHERE type = 'project';`,
            [],
          )) as any
        ).id as number;

        res_id = id;

        // TODO: make `at` always have an ISO string everywhere
        await tx.runAsync(
          `INSERT INTO projects (id, name, color, at, active, icon, linked, to_delete)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            project.name,
            project.color || "",
            project.at || "",
            project.active === undefined || project.active ? 1 : 0,
            project.icon || "",
            0,
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
            active = ?,
            linked = 1
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
        await tx.runAsync(
          `UPDATE templates SET project_id = ? WHERE project_id = ?;`,
          [remote.id, local_id],
        );

        // update it's usage as foreign key in entries
        await tx.runAsync(
          `UPDATE entries SET project_id = ? WHERE project_id = ?;`,
          [remote.id, local_id],
        );
      });

      const linked = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [remote.id],
      );

      if (linked === null) {
        throw Error("Project not found after linking");
      }

      return linked as Project;
    },

    delete: async (id: number) => {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(`DELETE FROM projects WHERE id = ?;`, [id]);

        // update it's usage as foreign key in templates
        await tx.runAsync(
          `UPDATE templates SET project_id = NULL WHERE project_id = ?;`,
          [id],
        );

        // update it's usage as foreign key in entries
        await tx.runAsync(
          `UPDATE entries SET project_id = NULL WHERE project_id = ?;`,
          [id],
        );
      });
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

      const edited = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [project.id],
      );

      if (edited === null) {
        throw Error("Project not found after edit");
      }

      return edited as Project;
    },
  },

  Templates: {
    getAll: async () => {
      const data = await db.getAllAsync<DBTemplate>(
        `SELECT * FROM templates;`,
        [],
      );
      return data.map(
        (row) => ({ ...row, tags: row.tags.split(",") }) as Template,
      );
    },

    create: async (template: Omit<Template, "id">) => {
      const tags = template.tags.join(",");
      const res = await db.runAsync(
        `INSERT INTO templates (name, project_id, description, tags)
        VALUES (?, ?, ?, ?);`,
        [template.name, template.project_id, template.description, tags],
      );
      return { ...template, id: res.lastInsertRowId } as Template;
    },

    delete: async (id: number) => {
      await db.runAsync(`DELETE FROM templates WHERE id = ?;`, [id]);
    },

    edit: async (template: Partial<Template> & { id: number }) => {
      const oldTemplate = await db.getFirstAsync<DBTemplate>(
        `SELECT * FROM templates WHERE id = ?;`,
        [template.id],
      );
      if (oldTemplate === null) {
        throw Error("Template not found");
      }

      await db.runAsync(
        `UPDATE templates SET
          name = ?,
          project_id = ?,
          description = ?,
          tags = ?
        WHERE id = ?;`,
        [
          template.name || oldTemplate.name,
          template.project_id !== undefined
            ? template.project_id
            : oldTemplate.project_id,
          template.description || oldTemplate.description,
          template.tags?.join(",") || oldTemplate.tags,
          template.id,
        ],
      );

      const edited = await db.getFirstAsync<DBTemplate>(
        `SELECT * FROM templates WHERE id = ?;`,
        [template.id],
      );
      if (edited === null) {
        throw Error("Template not found after edit");
      }

      const tags = edited.tags.split(",");
      return { ...edited, tags } as Template;
    },

    insertOrUpdate: async (template: Partial<Template>) => {
      if (template.id !== undefined) {
        return await Database.Templates.edit(template as Template);
      }
      return await Database.Templates.create(template as Omit<Template, "id">);
    },
  },

  Entries: {
    getAll: async () => {
      return await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries ORDER BY start DESC;`,
        [],
      );
    },

    getSince: async (startingAtOrAfter: string) => {
      return await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries WHERE start >= ? ORDER BY start DESC;`,
        [startingAtOrAfter],
      );
    },

    createFromToggl: async (entry: Entry) => {
      await db.runAsync(
        `INSERT INTO entries (id, description, project_id, start, stop, duration, at, tags, linked, to_delete, need_push)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          entry.id,
          entry.description,
          entry.project_id,
          entry.start,
          entry.stop,
          entry.duration,
          entry.at,
          entry.tags.join(","),
          1,
          0,
          0,
        ],
      );
    },

    // Note that duration is ignored.
    createLocal: async (
      entry: Partial<Omit<Entry, "duration">> & { start: string },
    ) => {
      // Calculate duration from start and stop
      const stop = typeof entry.stop === "string" ? entry.stop : null;
      // TODO: Verify that duration is in MS...
      const duration =
        stop === null
          ? -1
          : new Date(stop).getTime() - new Date(entry.start).getTime();

      let res_id: any = undefined;
      await db.withExclusiveTransactionAsync(async (tx) => {
        res_id = (
          (await tx.getFirstAsync(
            `SELECT id FROM local_ids WHERE type = 'entries';`,
            [],
          )) as any
        ).id as number;

        await tx.runAsync(
          `INSERT INTO entries (id, description, project_id, start, stop, duration, at, tags, linked, to_delete, need_push)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            res_id,
            entry.description || null,
            entry.project_id || null,
            entry.start,
            stop,
            duration,
            new Date().toISOString(),
            entry.tags?.join(",") || "",
            0,
            0,
            0,
          ],
        );

        await tx.runAsync(
          `UPDATE local_ids SET id = id - 1 WHERE type = 'entries';`,
          [],
        );
      });

      const created = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [res_id as number],
      );
      if (created === null) {
        throw Error("Entry not found after creation");
      }
      return { ...created, tags: created.tags.split(",") } as Entry;
    },

    linkLocalWithRemote: async (local_id: number, remote: Entry) => {
      await db.runAsync(
        `UPDATE entries SET
          id = ?,
          description = ?,
          project_id = ?,
          start = ?,
          stop = ?,
          duration = ?,
          at = ?,
          tags = ?,
          linked = 1
          WHERE id = ?;`,
        [
          remote.id,
          remote.description,
          remote.project_id,
          remote.start,
          remote.stop,
          remote.duration,
          remote.at,
          remote.tags.join(","),
          local_id,
        ],
      );

      const linked = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [remote.id],
      );

      if (linked === null) {
        throw Error("Entry not found after linking");
      }

      return { ...linked, tags: linked.tags.split(",") } as Entry;
    },

    delete: async (id: number) => {
      await db.runAsync(`DELETE FROM entries WHERE id = ?;`, [id]);
    },

    markDeleted: async (id: number) => {
      await db.runAsync(`UPDATE entries SET to_delete = 1 WHERE id = ?;`, [id]);
    },

    // Note that duration is ignored.
    editWithLocalData: async (entry: Partial<Entry> & { id: number }) => {
      const oldEntry = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [entry.id],
      );
      if (oldEntry === null) {
        throw Error("Entry not found");
      }

      const start = entry.start || oldEntry.start;
      // Calculate duration from start and stop
      const stop = entry.stop !== undefined ? entry.stop : oldEntry.stop;
      // TODO: Verify that duration is in MS...
      const duration =
        stop === null
          ? -1
          : new Date(stop).getTime() - new Date(start).getTime();

      await db.runAsync(
        `UPDATE entries SET
          description = ?,
          project_id = ?,
          start = ?,
          stop = ?,
          duration = ?,
          at = ?,
          tags = ?
        WHERE id = ?;`,
        [
          entry.description || oldEntry.description,
          entry.project_id || oldEntry.project_id,
          start,
          stop,
          duration,
          new Date().toISOString(),
          entry.tags?.join(",") || oldEntry.tags,
          entry.id,
        ],
      );

      return await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [entry.id],
      );
    },

    editWithRemoteData: async (entry: Entry) => {
      const oldEntry = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [entry.id],
      );
      if (oldEntry === null) {
        throw Error("Entry not found");
      }

      await db.runAsync(
        `UPDATE entries SET
          description = ?,
          project_id = ?,
          start = ?,
          stop = ?,
          duration = ?,
          at = ?,
          tags = ?,
          needs_push = 0
        WHERE id = ?;`,
        [
          entry.description,
          entry.project_id,
          entry.start,
          entry.stop,
          entry.duration,
          entry.at,
          entry.tags.join(","),
          entry.id,
        ],
      );

      const edited = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [entry.id],
      );
      if (edited === null) {
        throw Error("Entry not found after edit");
      }

      return { ...edited, tags: edited.tags.split(",") } as Entry;
    },
  },
};

// Database.Manage.dropAllTablesSync();
Database.Manage.intializeDBSync();

export default Database;
