import { Data } from "@/apis/data";
import { Template } from "@/apis/types";
import { templatePageAtom } from "@/utils/atoms";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: Data.Templates.getAll,
  });
}

export function useDeepest(page: number) {
  return useQuery({
    queryKey: ["templates", "deepest", page],
    queryFn: async () => await Data.Templates.getDeepestPos(page),
  });
}

export function useAddTemplateMutation() {
  const [page] = useAtom(templatePageAtom);

  return useMutation({
    mutationKey: ["templates"],
    mutationFn: async (data: {
      template: Omit<Template, "id" | "posx" | "posy" | "page"> & {
        posx?: number;
        posy?: number;
      };
      num_cols: number;
    }) => {
      return await Data.Templates.create(
        { ...data.template, page },
        data.num_cols,
      );
    },
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useEditTemplateMutation() {
  return useMutation({
    mutationFn: Data.Templates.edit,
    onError: (err) => {
      console.error(err);
    },
  });
}

export function useDeleteTemplateMutation() {
  return useMutation({
    mutationFn: Data.Templates.delete,
    onError: (err) => {
      console.error(err);
    },
  });
}
