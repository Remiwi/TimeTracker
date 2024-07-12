import { Data } from "@/apis/data";
import { Entry, EntryWithProject, Project } from "@/apis/types";
import { templateMadeAtom } from "@/utils/atoms";
import { Dates } from "@/utils/dates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

// QUERIES

export function useOngoingEntry() {
  return useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrentWithProject,
  });
}

export function usePreviousEntry() {
  return useQuery({
    queryKey: ["entries", "previous"],
    queryFn: Data.Entries.getLastStoppedWithProject,
  });
}

export function useBinnedEntry() {
  return useQuery({
    queryKey: ["entries", "bin"],
    queryFn: Data.Entries.getBin,
  });
}

// MUTATIONS

export function useStartEntry() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationFn: Data.Entries.start,
    onMutate: (entry) => {
      setTemplateMade(false);
      const projects = qc.getQueryData<Project[]>(["projects"]);
      const project = projects?.find((p) => p.id === entry.project_id);
      qc.setQueryData(["entries", "current"], {
        id: 0,
        description: entry.description || null,
        project_id: entry.project_id || null,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: entry.tags || [],
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useRestoreEntry() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationFn: Data.Entries.restore,
    onMutate: () => {
      setTemplateMade(false);
      const bin = qc.getQueryData<EntryWithProject | null>(["entries", "bin"]);
      qc.setQueryData(["entries", "current"], bin);
      qc.setQueryData(["entries", "bin"], null);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useEditEntry() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationFn: Data.Entries.edit,
    onMutate: (entry) => {
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      if (!ongoing) return;
      setTemplateMade(false);
      const projects = qc.getQueryData<Project[]>(["projects"]);
      const project = projects?.find((p) => p.id === entry.project_id);
      qc.setQueryData(["entries", "current"], {
        ...ongoing,
        ...entry,
        project_name: project?.name || null,
        project_icon: project?.icon || null,
        project_color: project?.color || null,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useStopEntry() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      setTemplateMade(false);
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      if (!ongoing) return;
      qc.setQueryData(["entries", "previous"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useFillStartToStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: Data.Entries.setCurrentStartToPrevStop,
    onMutate: () => {
      const prev = qc.getQueryData<Entry | null>(["entries", "previous"]);
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      if (!ongoing) return;
      qc.setQueryData(["entries", "current"], {
        ...ongoing,
        start: prev?.stop,
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useDeleteOngoing() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationFn: Data.Entries.deleteCurrent,
    onMutate: () => {
      setTemplateMade(false);
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      qc.setQueryData(["entries", "bin"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useSetStartToNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      if (!ongoing) return;
      await Data.Entries.edit({
        ...ongoing,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onMutate: () => {
      const ongoing = qc.getQueryData<Entry | null>(["entries", "current"]);
      if (!ongoing) return;
      qc.setQueryData(["entries", "current"], {
        ...ongoing,
        start: Dates.toISOExtended(new Date()),
      });
    },
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}
