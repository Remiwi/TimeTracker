import { Data } from "@/apis/data";
import { Entry, EntryWithProject, Project } from "@/apis/types";
import { Dates } from "@/utils/dates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useOngoing() {
  return useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrent,
  });
}

export function usePrevious() {
  return useQuery({
    queryKey: ["entries", "previous"],
    queryFn: Data.Entries.getLastStopped,
  });
}

export function useBin() {
  return useQuery({
    queryKey: ["entries", "bin"],
    queryFn: Data.Entries.getBin,
  });
}

export function useStartProjectMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: async (project: Project | null) => {
      await Data.Entries.start({
        project_id: project?.id || null,
      });
    },
    onMutate: (project: Project | null) => {
      const newEntry = {
        id: 0,
        description: "",
        project_id: project?.id || null,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: [],
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      };
      qc.setQueryData(["entries", "current"], newEntry);
      qc.setQueryData(["entries", 0], newEntry);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useStopCurrentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      const ongoing = qc.getQueryData<EntryWithProject>(["entries", "current"]);
      qc.setQueryData(["entries", "previous"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useEditEntryMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.edit,
    onMutate: (entry: EntryWithProject) => {
      qc.setQueryData(["entries", entry.id], {
        ...entry,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useDeleteEntryMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: async (entry: Entry) => {
      await Data.Entries.delete(entry.id);
    },
    onMutate: (entry: EntryWithProject) => {
      qc.setQueryData(["entries", "bin"], entry);
      qc.setQueryData(["entries", entry.id], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useRestoreEntryMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.restore,
    onMutate: () => {
      const bin = qc.getQueryData<EntryWithProject>(["entries", "bin"]);
      qc.setQueryData(["entries", "current"], {
        ...bin,
        start: Dates.toISOExtended(new Date()),
        stop: null,
      });
      qc.setQueryData(["entries", "bin"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}
