import { Data } from "@/apis/data";
import {
  Entry,
  EntryWithProject,
  Project,
  Template,
  TemplateWithProject,
} from "@/apis/types";
import { Dates } from "@/utils/dates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateMadeAtom } from "@/utils/atoms";
import { useAtom } from "jotai";

export function useEntries() {
  return useQuery({
    queryKey: ["entries"],
    queryFn: Data.Entries.getAll,
  });
}

export function useOngoing() {
  return useQuery({
    queryKey: ["entries", "current"],
    queryFn: Data.Entries.getCurrent,
  });
}

export function usePrevious() {
  return useQuery({
    queryKey: ["entries", "previous"],
    queryFn: async () => Data.Entries.getLastStopped(),
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
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: async (project: Project | null) => {
      setTemplateMade(false);
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

export function useStartTemplateMutation() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: async (template: TemplateWithProject) => {
      setTemplateMade(true);
      return await Data.Entries.start({
        project_id: template.project_id,
        description: template.description,
        tags: template.tags,
      });
    },
    onMutate: (template: TemplateWithProject) => {
      const newEntry = {
        id: 0,
        description: template.description,
        project_id: template.project_id,
        start: Dates.toISOExtended(new Date()),
        stop: null,
        duration: -1,
        tags: template.tags,
        project_name: template.project_name,
        project_icon: template.project_icon,
        project_color: template.project_color,
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
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.stopCurrent,
    onMutate: () => {
      setTemplateMade(false);
      const ongoing = qc.getQueryData<EntryWithProject>(["entries", "current"]);
      qc.setQueryData(["entries", "previous"], ongoing);
      qc.setQueryData(["entries", "current"], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useCreateEntryMutation() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.create,
    onMutate: (entry: EntryWithProject) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", entry.id], {
        ...entry,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useEditEntryMutation() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.edit,
    onMutate: (entry: EntryWithProject) => {
      setTemplateMade(false);
      qc.setQueryData(["entries", entry.id], {
        ...entry,
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useDeleteEntryMutation(withBin = false) {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: async (entry: Entry) => {
      await Data.Entries.delete(entry.id, withBin);
    },
    onMutate: (entry: EntryWithProject) => {
      setTemplateMade(false);
      if (withBin) qc.setQueryData(["entries", "bin"], entry);
      qc.setQueryData(["entries", entry.id], null);
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useRestoreEntryMutation() {
  const qc = useQueryClient();
  const [_, setTemplateMade] = useAtom(templateMadeAtom);

  return useMutation({
    mutationKey: ["entries"],
    mutationFn: Data.Entries.restore,
    onMutate: () => {
      setTemplateMade(false);
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
