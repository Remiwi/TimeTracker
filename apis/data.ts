import Database from "./db";
import { Toggl } from "./toggl";
import { DBEntry, Entry, EntryWithProject, Project, Template } from "./types";
import { qc } from "./queryclient";
import { tryAcquire, Mutex, E_ALREADY_LOCKED } from "async-mutex";
import { Dates } from "@/utils/dates";
import { Tags } from "@/utils/tags";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

const projectSyncLock = tryAcquire(new Mutex());
const entrySyncLock = tryAcquire(new Mutex());

const actions = {
  bin: null as null | EntryWithProject,
};

// Return undefined if no difference, "local" if a is newer, "remote" if b is newer
// If there is a difference but both were edited at the same time, the "newer" one is whichever has a defined stop
// If they both have a defined/undefined stop, then `a` is newer if it's needs_push flag is set and b is newer otherwise
function getNewerEntry(a: DBEntry, b: Entry) {
  // Check if there even is a difference
  const a_tags = Tags.toList(a.tags);
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
  Sync: {
    sync: async () => {
      if (await Data.Backups.autoBackup()) {
        console.log("Creating backup");
      }
      Data.Projects.sync();
      Data.Entries.sync();
    },
  },

  Backups: {
    nameBackup: (oldest: Date, newest: Date) => {
      const today = new Date();
      const oldestDate = `${oldest.getFullYear()}-${(oldest.getMonth() + 1).toString().padStart(2, "0")}-${oldest.getDate().toString().padStart(2, "0")}`;
      const newestDate = `${newest.getFullYear()}-${(newest.getMonth() + 1).toString().padStart(2, "0")}-${newest.getDate().toString().padStart(2, "0")}`;
      const todayDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
      return `EntriesBackupFrom_${oldestDate}_To_${newestDate}_Generated_${todayDate}.csv`;
    },

    parseName: (filename: string) => {
      const parts = filename.split("_");
      const oldest = new Date(parts[1]);
      const newest = new Date(parts[3]);
      const generated = new Date(parts[5].split(".")[0]);
      return { filename, oldest, newest, generated };
    },

    setExternalBackupDirectory: async () => {
      const oldExternalDirectory = await AsyncStorage.getItem(
        "externalBackupDirectory",
      );

      const perm =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted) {
        throw Error("Permission denied");
      }

      const externalDirFiles =
        await FileSystem.StorageAccessFramework.readDirectoryAsync(
          perm.directoryUri,
        );
      if (externalDirFiles.length > 0) {
        throw Error("Directory must be empty");
      }

      await AsyncStorage.setItem("externalBackupDirectory", perm.directoryUri);
      const path = perm.directoryUri;

      // If the directory was already set, move the files to the new directory
      if (oldExternalDirectory === null) {
        if (FileSystem.documentDirectory === null) {
          throw Error("Document directory is null");
        }
        const backupdir = FileSystem.documentDirectory + "backups/";
        const files = await FileSystem.readDirectoryAsync(backupdir).catch(
          async (e) => {
            if (
              e instanceof Error &&
              e.message.endsWith("doesn't exist or isn't a directory")
            ) {
              return null;
            }
            throw e;
          },
        );
        if (files === null) {
          return path;
        }

        files.forEach(async (file) => {
          const data = await FileSystem.readAsStringAsync(backupdir + file, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri,
            file,
            "text/csv",
          );
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            uri,
            data,
            {
              encoding: FileSystem.EncodingType.UTF8,
            },
          );
          await FileSystem.deleteAsync(backupdir + file);
        });
      }

      return path;
    },

    getExternalBackupDirectory: async () => {
      const raw = await AsyncStorage.getItem("externalBackupDirectory");
      return raw === null ? null : decodeURIComponent(raw);
    },

    clearExternalBackupDirectory: async () => {
      await AsyncStorage.removeItem("externalBackupDirectory");
    },

    backup: async (email = "", overwrite = false) => {
      const entries = await Data.Entries.getAll();
      if (entries.length === 0) {
        return null;
      }
      let csv_content = `"Email","Project","Description","Start date","Start time","Duration","Tags","Timezone"\n`;
      for (const entry of entries) {
        if (entry.stop === null) {
          console.warn("Entry is running during a backup, entry ignored");
          continue;
        }
        const project = entry.project_name ?? "";
        const description = entry.description ?? "";
        const tags = entry.tags.join(", ");
        const start = new Date(entry.start);
        const monthStr = (start.getMonth() + 1).toString().padStart(2, "0");
        const dayStr = start.getDate().toString().padStart(2, "0");
        const startDate = `${start.getFullYear()}-${monthStr}-${dayStr}`;
        const minutesStr = start.getMinutes().toString().padStart(2, "0");
        const secondsStr = start.getSeconds().toString().padStart(2, "0");
        const startTime = `${start.getHours()}:${minutesStr}:${secondsStr}`;
        const stop = new Date(entry.stop);
        const durTotalMS = stop.getTime() - start.getTime();
        const durSeconds = Math.floor(durTotalMS / 1000) % 60;
        const durSecondsStr = durSeconds.toString().padStart(2, "0");
        const durMinutes = Math.floor(durTotalMS / 1000 / 60) % 60;
        const durMinutesStr = durMinutes.toString().padStart(2, "0");
        const durHours = Math.floor(durTotalMS / 1000 / 60 / 60);
        const duration = `${durHours}:${durMinutesStr}:${durSecondsStr}`;
        const offset = start.getTimezoneOffset();
        const behind = offset > 0;
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetMinutesStr = offsetMinutes.toString().padStart(2, "0");
        const timezone = `${offset === 0 ? "" : behind ? "-" : "+"}${offsetHours}:${offsetMinutesStr}`;

        const row = `"${email}","${project}","${description}","${startDate}","${startTime}","${duration}","${tags}","${timezone}"\n`;
        csv_content += row;
      }
      const oldestStart = new Date(entries[entries.length - 1].start);
      const newestStart = new Date(entries[0].start);
      const filename = Data.Backups.nameBackup(oldestStart, newestStart);

      const externalBackupDir = await AsyncStorage.getItem(
        "externalBackupDirectory",
      );

      if (externalBackupDir === null) {
        if (FileSystem.documentDirectory === null) {
          throw Error("Document directory is null");
        }
        const backupdir = FileSystem.documentDirectory + "backups/";

        const files = await FileSystem.readDirectoryAsync(backupdir).catch(
          async (e) => {
            if (
              e instanceof Error &&
              e.message.endsWith("doesn't exist or isn't a directory")
            ) {
              console.log("Creating directory");
              await FileSystem.makeDirectoryAsync(backupdir);
            }
            throw e;
          },
        );

        if (files.includes(filename) && !overwrite) {
          throw Error("Backup already exists");
        }

        await FileSystem.writeAsStringAsync(backupdir + filename, csv_content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        const externalFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            externalBackupDir,
          );
        const files = externalFiles.map((f) => {
          const decoded = decodeURIComponent(f);
          return decoded.substring(decoded.lastIndexOf("/") + 1);
        });

        if (files.includes(filename) && !overwrite) {
          throw Error("Backup already exists");
        }
        let uri = "";
        if (!files.includes(filename)) {
          uri = await FileSystem.StorageAccessFramework.createFileAsync(
            externalBackupDir,
            filename,
            "text/csv",
          );
        } else {
          const index = files.findIndex((f) => f === filename);
          uri = externalFiles[index];
        }
        if (uri === "") {
          throw Error("Could not find URI to overwrite");
        }

        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          uri,
          csv_content,
          {
            encoding: FileSystem.EncodingType.UTF8,
          },
        );
      }

      return Data.Backups.parseName(filename);
    },

    delete: async (filename: string) => {
      const externalBackupDir = await AsyncStorage.getItem(
        "externalBackupDirectory",
      );

      if (externalBackupDir === null) {
        if (FileSystem.documentDirectory === null) {
          throw Error("Document directory is null");
        }
        const backupdir = FileSystem.documentDirectory + "backups/";
        await FileSystem.deleteAsync(backupdir + filename);
      } else {
        const externalFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            externalBackupDir,
          );
        const found = externalFiles.find((f) => {
          const decoded = decodeURIComponent(f);
          return decoded.substring(decoded.lastIndexOf("/") + 1) === filename;
        });
        if (found === undefined) {
          throw Error("File not found");
        }
        await FileSystem.StorageAccessFramework.deleteAsync(found);
      }
    },

    share: async (filename: string) => {
      if (!(await Sharing.isAvailableAsync())) {
        throw Error("Sharing not available");
      }

      const externalBackupDir = await AsyncStorage.getItem(
        "externalBackupDirectory",
      );

      if (externalBackupDir === null) {
        if (FileSystem.documentDirectory === null) {
          throw Error("Document directory is null");
        }
        const path = FileSystem.documentDirectory + "backups/" + filename;
        await Sharing.shareAsync(path);
      } else {
        if (FileSystem.cacheDirectory === null) {
          throw Error("Cache directory is null");
        }

        const externalFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            externalBackupDir,
          );
        const found = externalFiles.find((f) => {
          const decoded = decodeURIComponent(f);
          return decoded.substring(decoded.lastIndexOf("/") + 1) === filename;
        });
        if (found === undefined) {
          throw Error("File not found");
        }

        const cachedFilename = FileSystem.cacheDirectory + filename;
        FileSystem.copyAsync({
          from: found,
          to: cachedFilename,
        });
        await Sharing.shareAsync(cachedFilename);
        await FileSystem.deleteAsync(cachedFilename);
      }
    },

    getAll: async () => {
      const externalBackupDir = await AsyncStorage.getItem(
        "externalBackupDirectory",
      );

      if (externalBackupDir === null) {
        if (FileSystem.documentDirectory === null) {
          throw Error("Document directory is null");
        }
        const backupdir = FileSystem.documentDirectory + "backups/";
        const files = await FileSystem.readDirectoryAsync(backupdir);
        return files
          .filter(
            (f) => f.startsWith("EntriesBackupFrom_") && f.endsWith(".csv"),
          )
          .map((f) => {
            return Data.Backups.parseName(f);
          });
      } else {
        const externalFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            externalBackupDir,
          );
        const filenames = externalFiles.map((f) => {
          const decoded = decodeURIComponent(f);
          return decoded.substring(decoded.lastIndexOf("/") + 1);
        });
        return filenames
          .filter(
            (f) => f.startsWith("EntriesBackupFrom_") && f.endsWith(".csv"),
          )
          .map((f) => Data.Backups.parseName(f));
      }
    },

    autoBackup: async () => {
      const backups = await Data.Backups.getAll();
      backups.sort((a, b) => {
        if (a.generated < b.generated) {
          return -1;
        }
        if (b.generated > a.generated) {
          return 1;
        }
        return 0;
      });
      const mostRecent = backups[backups.length - 1];
      if (mostRecent === undefined) {
        await Data.Backups.backup("", false);
        return true;
      }

      const autoBackupFreq =
        (await AsyncStorage.getItem("backupsFrequency")) ?? "weekly";
      if (autoBackupFreq === "never") return false;

      const msSinceLastBackup =
        new Date().getTime() - new Date(mostRecent.generated).getTime();

      let threshold = 1000 * 60 * 60 * 24;
      if (autoBackupFreq === "weekly") threshold *= 7;

      if (msSinceLastBackup >= threshold) {
        await Data.Backups.backup("", false);
        return true;
      }
      return false;
    },
  },

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

    getDeepestPos: async (page: number) => {
      return await Database.Templates.getDeepestPos(page);
    },

    create: async (
      template: Omit<Template, "id" | "posx" | "posy"> & {
        posx?: number;
        posy?: number;
      },
      num_cols: number,
    ) => {
      return await Database.Templates.create(template, num_cols);
    },

    edit: async (template: Partial<Template> & { id: number }) => {
      return await Database.Templates.edit(template);
    },

    delete: async (id: number) => {
      await Database.Templates.delete(id);
    },

    moveMultiple: async (
      moves: {
        id: number;
        posx: number;
        posy: number;
        page: number;
      }[],
    ) => {
      await Database.Templates.moveMultiple(moves);
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
      const entries = await Database.Entries.getAllWithProject();
      return entries.map(
        (e) => ({ ...e, tags: Tags.toList(e.tags) }) as EntryWithProject,
      );
    },

    getSince: async (since: string) => {
      const entries = await Database.Entries.getSinceVisible(since);
      return entries.map((e) => ({ ...e, tags: Tags.toList(e.tags) }) as Entry);
    },

    get: async (id: number) => {
      const entry = await Database.Entries.getWithProject(id);
      return {
        ...entry,
        tags: Tags.toList(entry.tags),
      } as EntryWithProject;
    },

    // Deprecated
    getWithProject: async (id: number) => {
      console.warn("Deprecated: Use Data.Entries.get instead");
      const entry = await Database.Entries.getWithProject(id);
      return {
        ...entry,
        tags: Tags.toList(entry.tags),
      } as EntryWithProject;
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

    delete: async (id: number, bin = false) => {
      const toDelete = await Database.Entries.getWithProject(id);
      if (toDelete.linked) {
        await Database.Entries.markDeleted(id).then(() => {
          if (bin)
            actions.bin = { ...toDelete, tags: Tags.toList(toDelete.tags) };
        });
        await Toggl.Entries.delete(id);
      }
      await Database.Entries.delete(id).then(() => {
        if (bin)
          actions.bin = { ...toDelete, tags: Tags.toList(toDelete.tags) };
      });
    },

    deleteCurrent: async (bin = false) => {
      const toDelete = await Database.Entries.getCurrentWithProject();
      if (toDelete === null) return;
      if (toDelete.linked) {
        await Database.Entries.markDeleted(toDelete.id).then(() => {
          if (bin)
            actions.bin = { ...toDelete, tags: Tags.toList(toDelete.tags) };
        });
        await Toggl.Entries.delete(toDelete.id);
      }
      await Database.Entries.delete(toDelete.id).then(() => {
        if (bin)
          actions.bin = { ...toDelete, tags: Tags.toList(toDelete.tags) };
      });
    },

    restore: async () => {
      if (actions.bin === null) return null;
      const entry = await Data.Entries.create(actions.bin);
      actions.bin = null;
      return entry;
    },

    getBin: async () => {
      return actions.bin;
    },

    undo: async () => {},

    redo: async () => {},

    // Convenience

    getLastStopped: async (before?: string) => {
      const last = await Database.Entries.getLastStoppedWithProject(before);
      if (last === null) return null;
      return {
        ...last,
        tags: Tags.toList(last.tags),
      } as EntryWithProject;
    },

    // Deprecated
    getLastStoppedWithProject: async (before?: string) => {
      console.warn("Deprecated: Use Data.Entries.getLastStopped instead");
      const last = await Database.Entries.getLastStoppedWithProject(before);
      if (last === null) return null;
      return {
        ...last,
        tags: Tags.toList(last.tags),
      } as EntryWithProject;
    },

    getCurrent: async () => {
      const current = await Database.Entries.getCurrentWithProject();
      if (current === null) return null;
      return {
        ...current,
        tags: Tags.toList(current.tags),
      } as EntryWithProject;
    },

    // Deprecated
    getCurrentWithProject: async () => {
      console.warn("Deprecated: Use Data.Entries.getCurrent instead");
      const current = await Database.Entries.getCurrentWithProject();
      if (current === null) return null;
      return {
        ...current,
        tags: Tags.toList(current.tags),
      } as EntryWithProject;
    },

    getPreviousTo: async (Entry: Entry) => {
      const previous = await Database.Entries.getPreviousToWithProject(Entry);
      if (previous === null) return null;
      return {
        ...previous,
        tags: Tags.toList(previous.tags),
      } as EntryWithProject;
    },

    // Deprecated
    getPreviousToWithProject: async (Entry: Entry) => {
      console.warn("Deprecated: Use Data.Entries.getPreviousTo instead");
      const previous = await Database.Entries.getPreviousToWithProject(Entry);
      if (previous === null) return null;
      return {
        ...previous,
        tags: Tags.toList(previous.tags),
      } as EntryWithProject;
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

    setCurrentStartToPrevStop: async () => {
      const current = await Data.Entries.getCurrent();
      if (current === null) {
        return false;
      }
      const last = await Data.Entries.getLastStopped();
      if (last === null) {
        return false;
      }
      if (last.stop === null) {
        throw "Last stopped entry has stop set to null";
      }

      return await Data.Entries.edit({
        id: current.id,
        start: last.stop,
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
