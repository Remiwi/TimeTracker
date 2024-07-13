import { Data } from "@/apis/data";
import { useMutation } from "@tanstack/react-query";

export function useAddTemplateMutation() {
  return useMutation({
    mutationKey: ["templates"],
    mutationFn: Data.Templates.create,
    onError: (err) => {
      console.error(err);
    },
  });
}
