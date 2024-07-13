import { QueryClient, MutationCache } from "@tanstack/react-query";

export const qc = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: (_data, _error, _variables, _context, mutation) => {
      qc.invalidateQueries({ queryKey: mutation.options.mutationKey });
    },
  }),
});
