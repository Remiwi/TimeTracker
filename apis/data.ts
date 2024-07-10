import Database from "./db";
import { Toggl } from "./toggl";
import { DBEntry, Entry, Project, Template } from "./types";
import { qc } from "./queryclient";
import { tryAcquire, Mutex, E_ALREADY_LOCKED } from "async-mutex";
import { Dates } from "@/utils/dates";

const projectSyncLock = tryAcquire(new Mutex());
const entrySyncLock = tryAcquire(new Mutex());

// Return undefined if no difference, "local" if a is newer, "remote" if b is newer
// If there is a difference but both were edited at the same time, the "newer" one is whichever has a defined stop
// If they both have a defined/undefined stop, then `a` is newer if it's needs_push flag is set and b is newer otherwise
function getNewerEntry(a: DBEntry, b: Entry) {
  // Check if there even is a difference
  const a_tags = a.tags.split(",");
  const same_tags =
    b.tags.every((t) => a_tags.includes(t)) &&
    a_tags.every((t) => b.tags.includes(t));
  if (
    a.id === b.id &&
    a.description === b.description &&
    a.project_id === b.project_id &&
    a.start === b.start &&
    a.stop === b.stop &&
    a.duration === b.duration &&
    a.at === b.at &&
    same_tags
  ) {
    return undefined;
  }

  const aLastUpdate = new Date(a.at);
  const bLastUpdate = new Date(b.at);
  if (aLastUpdate > bLastUpdate) {
    return "local";
  } else if (bLastUpdate > aLastUpdate) {
    return "remote";
  }

  if (a.stop === null && b.stop !== null) {
    return "remote";
  } else if (a.stop !== null && b.stop === null) {
    return "local";
  }

  if (a.needs_push) {
    return "local";
  }
  return "remote";
}

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

    get: async (id: number) => {
      return await Database.Projects.get(id);
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
      const toDelete = await Database.Projects.get(id);
      if (toDelete.linked) {
        await Database.Projects.markDeleted(id);
        await Toggl.Projects.delete(id);
      }
      await Database.Projects.delete(id);
    },
  },

  Templates: {
    getAll: async () => {
      return await Database.Templates.getAll();
    },

    get: async (id: number) => {
      return await Database.Templates.get(id);
    },

    create: async (template: Omit<Template, "id">) => {
      return await Database.Templates.create(template);
    },

    edit: async (template: Partial<Template> & { id: number }) => {
      return await Database.Templates.edit(template);
    },

    delete: async (id: number) => {
      await Database.Templates.delete(id);
    },
  },

  Entries: {
    sync: async () =>
      entrySyncLock
        .runExclusive(async () => {
          const twelveWeeksAgo = Dates.toISOExtended(Dates.daysAgo(7 * 12));
          const recentLocalEntries =
            await Database.Entries.getSince(twelveWeeksAgo);
          const recentRemoteEntries =
            await Toggl.Entries.getSince(twelveWeeksAgo);

          let ongoingRemote: undefined | Entry = undefined;
          // Create entries on local of remote entries with no linked entry
          for (const remote of recentRemoteEntries) {
            if (
              recentLocalEntries.find((p) => p.id === remote.id) === undefined
              // If there is no local entry with the same id, it is unlinked
            ) {
              if (remote.stop === null) {
                // This one is ongoing, so creating it can have side-effects if there is another ongoing entry already
                // Skip it until after all finished entries are synced
                ongoingRemote = remote;
                continue;
              }
              await Database.Entries.createFromToggl(remote);
            }
          }

          let ongoingLocal: undefined | DBEntry = undefined;
          for (const local of recentLocalEntries) {
            // Create and link entries on toggl to unlinked local entries
            if (!local.linked) {
              if (local.stop === null) {
                // Again, this one is ongoing, so creation can have side-effects. Skip until end.
                ongoingLocal = local;
                continue;
              }
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
            const newer = getNewerEntry(local, remote);
            if (newer === "local") {
              const newRemoteData = await Toggl.Entries.edit(local);
              await Database.Entries.editWithRemoteData(newRemoteData);
            } else if (newer === "remote") {
              await Database.Entries.editWithRemoteData(remote);
            }
          }

          // Now that all entries that were finished locally or remotely are synced, we can handle ongoing entries
          // These are defined only if they are unlinked.
          if (ongoingLocal === undefined && ongoingRemote !== undefined) {
            // If there's an ongoing remote entry but no local entry, it's safe to create
            await Database.Entries.createFromToggl(ongoingRemote);
          } else if (
            ongoingLocal !== undefined &&
            ongoingRemote === undefined
          ) {
            // If there's an ongoing local entry but no remote entry, it's safe to create
            const currentRemote = await Toggl.Entries.getCurrent();
            if (currentRemote !== null) {
              throw "Remote has an ongoing entry that isn't linked";
            }

            const newRemote = await Toggl.Entries.create(ongoingLocal);
            await Database.Entries.linkLocalWithRemote(
              ongoingLocal.id,
              newRemote,
            );
          } else if (
            ongoingLocal !== undefined &&
            ongoingRemote !== undefined
          ) {
            // If there's an ongoing entry on both sides, we stop the one that was started earlier and leave ongoing the one started later
            if (ongoingLocal.start > ongoingRemote.start) {
              // Local is newer, so we stop the remote
              const newRemoteStopped = await Toggl.Entries.edit({
                id: ongoingRemote.id,
                stop: ongoingLocal.start,
              });
              await Database.Entries.createFromToggl(newRemoteStopped);
              // Then link the local entry to a new entry on remote
              const newRemoteOngoing = await Toggl.Entries.create(ongoingLocal);
              await Database.Entries.linkLocalWithRemote(
                ongoingLocal.id,
                newRemoteOngoing,
              );
            } else if (ongoingLocal.start < ongoingRemote.start) {
              // Remote is newer, so we stop the local
              const newLocalStopped = await Database.Entries.editWithLocalData({
                id: ongoingLocal.id,
                stop: ongoingRemote.start,
              });
              const newRemoteStopped =
                await Toggl.Entries.edit(newLocalStopped);
              await Database.Entries.editWithRemoteData(newRemoteStopped);
              // Then link the remote entry to a new entry on local
              await Database.Entries.createFromToggl(ongoingRemote);
            } else {
              // If both started at the same time, exactly, there is no clean way to resolve. Delete the remote entry.
              await Toggl.Entries.delete(ongoingRemote.id);
              const newRemote = await Toggl.Entries.create(ongoingLocal);
              await Database.Entries.linkLocalWithRemote(
                ongoingLocal.id,
                newRemote,
              );
            }
          }

          qc.invalidateQueries({
            queryKey: ["entries"],
          });
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
      const entries = await Database.Entries.getAll();
      return entries.map((e) => ({ ...e, tags: e.tags.split(",") }) as Entry);
    },

    getSince: async (since: string) => {
      const entries = await Database.Entries.getSince(since);
      return entries.map((e) => ({ ...e, tags: e.tags.split(",") }) as Entry);
    },

    getSinceVisible: async (since: string) => {
      const entries = await Database.Entries.getSinceVisible(since);
      return entries.map((e) => ({ ...e, tags: e.tags.split(",") }) as Entry);
    },

    get: async (id: number) => {
      const entry = await Database.Entries.get(id);
      return { ...entry, tags: entry.tags.split(",") } as Entry;
    },

    create: async (entry: Partial<Entry> & { start: string }) => {
      const { created: local, stopped } =
        await Database.Entries.createLocal(entry);
      if (stopped && stopped.linked) {
        const stoppedRemote = await Toggl.Entries.edit(stopped);
        await Database.Entries.editWithRemoteData(stoppedRemote);
      }
      const togglEntry = await Toggl.Entries.create(local);
      return await Database.Entries.linkLocalWithRemote(local.id, togglEntry);
    },

    edit: async (entry: Partial<Entry> & { id: number }) => {
      const edited = await Database.Entries.editWithLocalData(entry);
      if (edited.id < 0) return edited;
      const newRemoteData = await Toggl.Entries.edit(entry);
      return await Database.Entries.editWithRemoteData(newRemoteData);
    },

    delete: async (id: number) => {
      const toDelete = await Database.Entries.get(id);
      if (toDelete.linked) {
        await Database.Entries.markDeleted(id);
        await Toggl.Entries.delete(id);
      }
      await Database.Entries.delete(id);
    },

    restore: async () => {},

    undo: async () => {},

    redo: async () => {},

    // Convenience

    getCurrent: async () => {
      const current = await Database.Entries.getCurrent();
      if (current === null) return null;
      return { ...current, tags: current.tags.split(",") } as Entry;
    },

    getLastStopped: async () => {
      const last = await Database.Entries.getLastStopped();
      if (last === null) return null;
      return { ...last, tags: last.tags.split(",") } as Entry;
    },

    // Note: start, stop, and duration are all ignored
    start: async (entry: Partial<Entry>) => {
      return await Data.Entries.create({
        ...entry,
        start: Dates.toISOExtended(new Date()),
        stop: null,
      });
    },

    stopCurrent: async () => {
      const current = await Data.Entries.getCurrent();
      if (current === null) {
        return false;
      }
      await Data.Entries.edit({
        id: current.id,
        stop: Dates.toISOExtended(new Date()),
      });
      return true;
    },

    editStart: async (id: number, start: string) => {
      return await Data.Entries.edit({
        id,
        start,
      });
    },

    editStop: async (id: number, stop: string) => {
      return await Data.Entries.edit({
        id,
        stop,
      });
    },
  },
};
