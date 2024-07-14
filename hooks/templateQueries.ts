import { Data } from "@/apis/data";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: Data.Templates.getAll,
  });
}

export function useAddTemplateMutation() {
  return useMutation({
    mutationKey: ["templates"],
    mutationFn: Data.Templates.create,
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
