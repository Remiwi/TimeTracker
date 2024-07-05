import Database from "./db";
import { Toggl } from "./toggl";
import { Entry, Project, Template } from "./types";
import { qc } from "./queryclient";
import { tryAcquire, Mutex, E_ALREADY_LOCKED } from "async-mutex";

const projectSyncLock = tryAcquire(new Mutex());
const entrySyncLock = tryAcquire(new Mutex());

export const Data = {
  Projects: {
    sync: async () =>
      projectSyncLock
        .runExclusive(async () => {
          const localProjects = await Database.Projects.getAll();
          const remoteProjects = await Toggl.Projects.getAll();

          // Create projects on local of remote projects with no linked project
          for (const remote of remoteProjects) {
            if (localProjects.find((p) => p.id === remote.id) === undefined) {
              await Database.Projects.createFromToggl(remote);
            }
          }

          for (const local of localProjects) {
            // Create and link projects on toggl to unlinked local entries
            if (!local.linked) {
              const newRemote = await Toggl.Projects.create(local);
              await Database.Projects.linkLocalWithRemote(local.id, newRemote);
              continue;
            }

            const remote = remoteProjects.find((p) => p.id === local.id);
            // Delete linked entries that were deleted on
            if (remote === undefined) {
              await Database.Projects.delete(local.id);
              continue;
            }

            // Delete linked entries that were marked during offline mode
            if (local.to_delete) {
              await Toggl.Projects.delete(local.id);
              await Database.Projects.delete(local.id);
              continue;
            }

            // Update sides of link of last edit time differs
            const localLastUpdate = new Date(local.at);
            const remoteLastUpdate = new Date(remote.at);
            if (localLastUpdate > remoteLastUpdate) {
              const newRemoteData = await Toggl.Projects.edit(local);
              await Database.Projects.editWithRemoteData(newRemoteData);
            } else if (remoteLastUpdate > localLastUpdate) {
              await Database.Projects.editWithRemoteData(remote);
            }
          }
          qc.invalidateQueries({
            queryKey: ["projects"],
          });

          return true;
        })
        .catch((e) => {
          if (e === E_ALREADY_LOCKED) {
            return false;
          }
          throw e;
        })
        .then((synced) => {
          return synced;
        }),

    getAll: async () => {
      return (await Database.Projects.getAllVisible()) as Project[];
    },

    create: async (project: Partial<Project> & { name: string }) => {
      const local = await Database.Projects.createLocal(project);
      const togglProj = await Toggl.Projects.create(project);
      return await Database.Projects.linkLocalWithRemote(local.id, togglProj);
    },

    edit: async (project: Partial<Project> & { id: number }) => {
      await Database.Projects.editWithLocalData(project);
      const newRemoteData = await Toggl.Projects.edit(project);
      return await Database.Projects.editWithRemoteData(newRemoteData);
    },

    delete: async (id: number) => {
      await Database.Projects.markDeleted(id);
      await Toggl.Projects.delete(id);
      await Database.Projects.delete(id);
    },
  },
  Templates: {
    getAll: async () => {
      return await Database.Templates.getAll();
    },

    create: async (template: Omit<Template, "id">) => {
      return await Database.Templates.create(template);
    },

    edit: async (template: Partial<Template> & { id: number }) => {
      return await Database.Templates.edit(template);
    },

    delete: async (id: number) => {
      return await Database.Templates.delete(id);
    },
  },
  Entries: {
    sync: async () =>
      entrySyncLock.runExclusive(async () => {
        const twelveWeeksAgo = new Date(
          new Date().getTime() - 12 * 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const recentLocalEntries =
          await Database.Entries.getSince(twelveWeeksAgo);
        const recentRemoteEntries =
          await Toggl.Entries.getSince(twelveWeeksAgo);

        // Create entries on local of remote entries with no linked entry
        for (const remote of recentRemoteEntries) {
          if (
            recentLocalEntries.find((p) => p.id === remote.id) === undefined
          ) {
            await Database.Entries.createFromToggl(remote);
          }
        }

        for (const local of recentLocalEntries) {
          // Create and link entries on toggl to unlinked local entries
          if (!local.linked) {
            const newRemote = await Toggl.Entries.create(local);
            await Database.Entries.linkLocalWithRemote(local.id, newRemote);
            continue;
          }

          const remote = recentRemoteEntries.find((p) => p.id === local.id);
          // Delete linked entries that were deleted on remote
          if (remote === undefined) {
            await Database.Entries.delete(local.id);
            continue;
          }

          // Delete linked entries that were marked during offline mode
          if (local.to_delete) {
            await Toggl.Entries.delete(local.id);
            await Database.Entries.delete(local.id);
            continue;
          }

          // Update sides of link of last edit time differs
          const localLastUpdate = new Date(local.at);
          const remoteLastUpdate = new Date(remote.at);
          if (localLastUpdate > remoteLastUpdate) {
            const newRemoteData = await Toggl.Entries.edit(local);
            await Database.Entries.editWithRemoteData(newRemoteData);
          } else if (remoteLastUpdate > localLastUpdate) {
            await Database.Entries.editWithRemoteData(remote);
          }
        }

        qc.invalidateQueries({
          queryKey: ["entries"],
        });
      }),

    getAll: async () => {
      const entries = await Database.Entries.getAll();
      return entries.map((e) => ({ ...e, tags: e.tags.split(",") }) as Entry);
    },

    create: async (entry: Partial<Entry> & { start: string }) => {
      const local = await Database.Entries.createLocal(entry);
      const togglEntry = await Toggl.Entries.create(entry);
      return await Database.Entries.linkLocalWithRemote(local.id, togglEntry);
    },

    edit: async (entry: Partial<Entry> & { id: number }) => {
      await Database.Entries.editWithLocalData(entry);
      const newRemoteData = await Toggl.Entries.edit(entry);
      return await Database.Entries.editWithRemoteData(newRemoteData);
    },

    delete: async (id: number) => {
      await Database.Entries.markDeleted(id);
      await Toggl.Entries.delete(id);
      return await Database.Entries.delete(id);
    },

    restore: async () => {},

    undo: async () => {},

    redo: async () => {},

    // Convenience
    getCurrent: async () => {},

    getLastStopped: async () => {},

    start: async () => {},

    stop: async () => {},

    editStart: async () => {},

    editStop: async () => {},
  },
};
