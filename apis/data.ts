import Database from "./db";
import Toggl from "./toggl";
import { Project } from "./types";
import { qc } from "./queryclient";

export const Data = {
  Projects: {
    sync: async () => {
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
            await Database.Projects.syncLocalWithRemote(local.id, newRemote);
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
    },

    getAll: async () => {
      return (await Database.Projects.getAllVisible()) as Project[];
    },

    create: async (project: Project) => {
      const local = await Database.Projects.createLocal(project);
      const togglProj = await Toggl.Projects.create(project);
      return await Database.Projects.syncLocalWithRemote(
        local.id,
        togglProj,
      ).catch((e) => console.log(e));
    },

    edit: async (project: Project) => {
      await Database.Projects.editWithLocalData(project);
      const newRemoteData = await Toggl.Projects.edit(project);
      return await Database.Projects.editWithRemoteData(newRemoteData);
    },

    delete: async (project: Project) => {
      await Database.Projects.markDeleted(project.id);
      await Toggl.Projects.delete(project.id);
      return await Database.Projects.delete(project.id);
    },
  },
};
