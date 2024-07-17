import { Data } from "@/apis/data";
import { Template } from "@/apis/types";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: Data.Templates.getAll,
  });
}

export function useDeepest() {
  return useQuery({
    queryKey: ["templates", "deepest"],
    queryFn: Data.Templates.getDeepestPos,
  });
}

export function useAddTemplateMutation() {
  return useMutation({
    mutationKey: ["templates"],
    mutationFn: async (data: {
      template: Omit<Template, "id" | "posx" | "posy"> & {
        posx?: number;
        posy?: number;
      };
      num_cols: number;
    }) => {
      return await Data.Templates.create(data.template, data.num_cols);
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
