import { Data } from "@/apis/data";
import { useQuery } from "@tanstack/react-query";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
  });
}
