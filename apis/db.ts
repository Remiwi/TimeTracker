import * as SQLite from "expo-sqlite";
import {
  DBEntry,
  DBEntryWithProject,
  DBProject,
  DBTemplate,
  DBTemplateWithProject,
  Entry,
  EntryWithProject,
  Project,
  Template,
  TemplateWithProject,
  TogglProject,
} from "./types";
import { Dates } from "@/utils/dates";
import { Tags } from "@/utils/tags";

function getDuration(start: string, stop: string | null) {
  if (stop === null) {
    return -1;
  }
  return Math.floor(
    (new Date(stop).getTime() - new Date(start).getTime()) / 1000,
  );
}

const db = SQLite.openDatabaseSync("db.db");

const Database = {
  Manage: {
    intializeDBSync: () => {
      db.runSync(`CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          project_id INTEGER,
          description TEXT,
          tags TEXT,
          page INTEGER,
          posx INTEGER,
          posy INTEGER
        );`);

      db.runSync(`CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY,
          name TEXT,
          color TEXT,
          at TEXT,
          active INTEGER,
          icon TEXT,
          linked INTEGER,
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
          needs_push INTEGER
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

    get: async (id: number) => {
      const found = await db.getFirstAsync<DBProject>(
        `SELECT * FROM projects WHERE id = ?;`,
        [id],
      );
      if (found === null) {
        throw Error("Project not found");
      }
      return found;
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
      let id: any = undefined;
      await db.withExclusiveTransactionAsync(async (tx) => {
        const res = await tx.getFirstAsync<{ id: number }>(
          `SELECT id FROM local_ids WHERE type = 'project';`,
          [],
        );
        if (res === null) throw Error("Could not assign local project id");
        id = res.id;

        await tx.runAsync(
          `INSERT INTO projects (id, name, color, at, active, icon, linked, to_delete)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            project.name,
            project.color || "",
            Dates.toISOExtended(new Date()),
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
        [id as number],
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
          Dates.toISOExtended(new Date()),
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
      const data = await db.getAllAsync<DBTemplateWithProject>(
        `SELECT templates.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM templates
        LEFT JOIN projects ON templates.project_id = projects.id;`,
      );
      return data.map(
        (row) =>
          ({
            ...row,
            tags: Tags.toList(row.tags),
          }) as TemplateWithProject,
      );
    },

    get: async (id: number) => {
      const found = await db.getFirstAsync<DBTemplateWithProject>(
        `SELECT templates.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM templates
        LEFT JOIN projects ON templates.project_id = projects.id
        WHERE templates.id = ?;`,
        [id],
      );
      if (found === null) {
        throw Error("Template not found");
      }
      return {
        ...found,
        tags: Tags.toList(found.tags),
      } as TemplateWithProject;
    },

    getDeepestPos: async (page: number) => {
      return await db.getFirstAsync<{ posx: number; posy: number }>(
        `SELECT * FROM templates WHERE page = ? ORDER BY posy DESC, posx DESC LIMIT 1;`,
        [page],
      );
    },

    create: async (
      template: Omit<Template, "id" | "posx" | "posy"> & {
        posx?: number;
        posy?: number;
      },
      num_cols: number,
    ) => {
      const tags = Tags.toString(template.tags);

      const deepestTemplate = await Database.Templates.getDeepestPos(
        template.page,
      );
      const posx = deepestTemplate ? (deepestTemplate.posx + 1) % num_cols : 0;
      const posy = deepestTemplate
        ? deepestTemplate.posy + (deepestTemplate.posx === num_cols - 1 ? 1 : 0)
        : 0;

      const res = await db.runAsync(
        `INSERT INTO templates (name, project_id, description, tags, page, posx, posy)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          template.name,
          template.project_id,
          template.description,
          tags,
          template.page,
          template.posx === undefined ? posx : template.posx,
          template.posy === undefined ? posy : template.posy,
        ],
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
          tags = ?,
          page = ?,
          posx = ?,
          posy = ?
        WHERE id = ?;`,
        [
          template.name || oldTemplate.name,
          template.project_id !== undefined
            ? template.project_id
            : oldTemplate.project_id,
          template.description || oldTemplate.description,
          template.tags ? Tags.toString(template.tags) : oldTemplate.tags,
          template.page ?? oldTemplate.page,
          template.posx ?? oldTemplate.posx,
          template.posy ?? oldTemplate.posy,
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

      const tags = Tags.toList(edited.tags);
      return { ...edited, tags } as Template;
    },

    // Needed because swapping templates has to be done in the same transaction
    moveMultiple: async (
      moves: {
        id: number;
        posx: number;
        posy: number;
        page: number;
      }[],
    ) => {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const move of moves) {
          await tx.runAsync(
            `UPDATE templates SET posx = ?, posy = ?, page = ? WHERE id = ?;`,
            [move.posx, move.posy, move.page, move.id],
          );
        }
      });
    },
  },

  Entries: {
    getAll: async () => {
      return await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries ORDER BY start DESC;`,
        [],
      );
    },

    getAllWithProject: async () => {
      return await db.getAllAsync<DBEntryWithProject>(
        `SELECT entries.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM entries
        LEFT JOIN projects ON entries.project_id = projects.id
        ORDER BY start DESC;`,
        [],
      );
    },

    get: async (id: number) => {
      const found = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [id],
      );
      if (found === null) {
        throw Error("Entry not found");
      }
      return found;
    },

    getWithProject: async (id: number) => {
      const found = await db.getFirstAsync<DBEntryWithProject>(
        `SELECT entries.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM entries
        LEFT JOIN projects ON entries.project_id = projects.id
        WHERE entries.id = ?;`,
        [id],
      );
      if (found === null) {
        throw Error("Entry not found");
      }
      return found;
    },

    getSince: async (startingAtOrAfter: string) => {
      return await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries WHERE start >= ? ORDER BY start DESC;`,
        [startingAtOrAfter],
      );
    },

    getSinceVisible: async (startingAtOrAfter: string) => {
      return await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries WHERE start >= ? AND to_delete = 0 ORDER BY start DESC;`,
        [startingAtOrAfter],
      );
    },

    getLastStopped: async () => {
      return await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE duration != -1 AND to_delete = 0 ORDER BY start DESC LIMIT 1;`,
        [],
      );
    },

    getLastStoppedWithProject: async () => {
      return await db.getFirstAsync<DBEntryWithProject>(
        `SELECT entries.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM entries
        LEFT JOIN projects ON entries.project_id = projects.id
        WHERE duration != -1 AND to_delete = 0 ORDER BY start DESC LIMIT 1;`,
        [],
      );
    },

    getCurrent: async () => {
      const running = await db.getAllAsync<DBEntry>(
        `SELECT * FROM entries WHERE stop IS NULL AND to_delete = 0;`,
        [],
      );
      if (running.length > 1) {
        throw new Error("More than one entry is running!");
      }
      return running.length === 1 ? running[0] : null;
    },

    getCurrentWithProject: async () => {
      const running = await db.getAllAsync<DBEntryWithProject>(
        `SELECT entries.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM entries
        LEFT JOIN projects ON entries.project_id = projects.id
        WHERE stop IS NULL;`,
        [],
      );
      if (running.length > 1) {
        throw new Error("More than one entry is running!");
      }
      return running.length === 1 ? running[0] : null;
    },

    getPreviousTo: async (entry: Entry) => {
      const prev = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE to_delete = 0 AND stop IS NOT NULL AND stop < ? ORDER BY stop DESC LIMIT 1;`,
        [entry.start],
      );
      return prev;
    },

    getPreviousToWithProject: async (entry: Entry) => {
      const prev = await db.getFirstAsync<DBEntryWithProject>(
        `SELECT entries.*, projects.name AS project_name, projects.color AS project_color, projects.icon AS project_icon
        FROM entries
        LEFT JOIN projects ON entries.project_id = projects.id
        WHERE entries.to_delete = 0 AND entries.stop IS NOT NULL AND entries.stop < ? ORDER BY entries.stop DESC LIMIT 1;`,
        [entry.start],
      );
      return prev;
    },

    // Note: we don't have to care about ongoing entries here. The given toggl entry will only be ongoing if this function is called
    // by Data.Entries.sync, which handles stopping the previous entry already.
    createFromToggl: async (entry: Entry) => {
      await db.runAsync(
        `INSERT INTO entries (id, description, project_id, start, stop, duration, at, tags, linked, to_delete, needs_push)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          entry.id,
          entry.description,
          entry.project_id,
          entry.start,
          entry.stop,
          entry.duration,
          entry.at,
          Tags.toString(entry.tags),
          1,
          0,
          0,
        ],
      );
    },

    // Note that duration is ignored.
    createLocal: async (entry: Partial<Entry> & { start: string }) => {
      // Calculate duration from start and stop
      const stop = typeof entry.stop === "string" ? entry.stop : null;
      const duration = getDuration(entry.start, stop);

      let id: any = undefined;
      let stopped: DBEntry | null = null;
      await db.withExclusiveTransactionAsync(async (tx) => {
        // Stop the running entry if exists and new entry is ongoing
        if (duration === -1) {
          const ongoing = await tx.getAllAsync<DBEntry>(
            `SELECT * FROM entries WHERE duration = -1;`,
            [],
          );
          if (ongoing.length > 1) {
            throw new Error("Invalid state: More than one entry is running!");
          }
          if (ongoing.length === 1) {
            const current = ongoing[0];
            await tx.runAsync(
              `UPDATE entries SET duration = ?, stop = ?, at = ?, needs_push = 1 WHERE id = ?;`,
              [
                getDuration(current.start, entry.start),
                entry.start,
                Dates.toISOExtended(new Date()),
                current.id,
              ],
            );
            stopped = await tx.getFirstAsync<DBEntry>(
              `SELECT * FROM entries WHERE id = ?;`,
              [current.id],
            );
          }
        }

        // Get next ID
        const idRes = await tx.getFirstAsync<{ id: number }>(
          `SELECT id FROM local_ids WHERE type = 'entries';`,
          [],
        );
        if (idRes === null) throw Error("Could not assign local entry id");
        id = idRes.id;

        // Increment (decrement really) the id
        await tx.runAsync(
          `UPDATE local_ids SET id = id - 1 WHERE type = 'entries';`,
          [],
        );

        // Insert the new entry
        await tx.runAsync(
          `INSERT INTO entries (id, description, project_id, start, stop, duration, at, tags, linked, to_delete, needs_push)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            entry.description || null,
            entry.project_id || null,
            entry.start,
            stop,
            duration,
            Dates.toISOExtended(new Date()),
            entry.tags ? Tags.toString(entry.tags) : "",
            0,
            0,
            0,
          ],
        );
      });

      const created = await db.getFirstAsync<DBEntry>(
        `SELECT * FROM entries WHERE id = ?;`,
        [id as number],
      );
      if (created === null) {
        throw Error("Entry not found after creation");
      }
      return {
        created: {
          ...created,
          tags: Tags.toList(created.tags),
        } as Entry,
        stopped: stopped as DBEntry | null,
      };
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
          Tags.toString(remote.tags),
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

      return {
        ...linked,
        tags: Tags.toList(linked.tags),
      } as Entry;
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
      const duration = getDuration(start, stop);

      await db.runAsync(
        `UPDATE entries SET
          description = ?,
          project_id = ?,
          start = ?,
          stop = ?,
          duration = ?,
          at = ?,
          tags = ?,
          needs_push = ?
        WHERE id = ?;`,
        [
          entry.description === undefined
            ? oldEntry.description
            : entry.description,
          entry.project_id === undefined
            ? oldEntry.project_id
            : entry.project_id,
          start,
          stop,
          duration,
          Dates.toISOExtended(new Date()),
          entry.tags ? Tags.toString(entry.tags) : oldEntry.tags,
          oldEntry.linked ? 1 : 0,
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

      return {
        ...edited,
        tags: Tags.toList(edited.tags),
      } as Entry;
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
          Tags.toString(entry.tags),
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

      return {
        ...edited,
        tags: Tags.toList(edited.tags),
      } as Entry;
    },
  },
};

// Database.Manage.dropAllTablesSync();
Database.Manage.intializeDBSync();

export default Database;
