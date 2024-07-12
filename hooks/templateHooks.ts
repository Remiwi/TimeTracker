import { Data } from "@/apis/data";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAddTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: Data.Templates.create,
    onError: (err) => {
      console.error(err);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
