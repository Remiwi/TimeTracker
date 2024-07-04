import Database from "./db";
import { Toggl } from "./toggl";
import { Project, Template } from "./types";
import { qc } from "./queryclient";
import { tryAcquire, Mutex, E_ALREADY_LOCKED } from "async-mutex";

const projectSyncLock = tryAcquire(new Mutex());

export const Data = {
  Projects: {
    sync: async () =>
      projectSyncLock
        .runExclusive(async () => {
          const localProjects = await Database.Projects.getAll();
          const remoteProjects = await Toggl.Projects.getAll();

          // Create projects on local that were made on remote and not local
          for (const remote of remoteProjects) {
            if (localProjects.find((p) => p.id === remote.id) === undefined) {
              await Database.Projects.createFromToggl(remote);
            }
          }

          for (const local of localProjects) {
            const remote = remoteProjects.find((p) => p.id === local.id);
            if (remote === undefined) {
              if (local.id < 0 && !local.to_delete) {
                // Create non-deleted projects that were made on local and not remote
                const newRemote = await Toggl.Projects.create(local);
                await Database.Projects.linkLocalWithRemote(
                  local.id,
                  newRemote,
                );
              } else {
                // Delete projects that were deleted on remote but not local, or that were made and deleted on local before syncing
                await Database.Projects.delete(local.id);
              }
              continue;
            }

            if (local.to_delete) {
              // Delete projects that are synced and marked for deletion
              await Toggl.Projects.delete(local.id);
              await Database.Projects.delete(local.id);
              continue;
            }

            // Update any projects whose last-updated time differs between local and remote
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
      return await Database.Projects.delete(id);
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
};
